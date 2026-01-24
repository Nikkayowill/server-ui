# Payment System Debugging Guide

**Last Updated:** January 24, 2026  
**Status:** Production payment system with custom Stripe Elements

---

## 🎯 Quick Diagnostics

### Is the payment endpoint working?
```bash
# Test locally
curl -X POST http://localhost:3000/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"plan":"basic"}'

# Expected: {"clientSecret":"pi_xxx_secret_xxx"}
# Error 401: Auth issue (session missing)
# Error 404: Route not registered
# Error 500: Stripe/server error
```

### Check Stripe initialization
```bash
node -e "require('dotenv').config(); const pc = require('./controllers/paymentController'); console.log('createPaymentIntent:', typeof pc.createPaymentIntent);"

# Expected: createPaymentIntent: function
# If undefined: Check module.exports at end of paymentController.js
```

### Verify environment variables
```bash
grep STRIPE .env

# Must have:
# STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
# STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "POST /create-payment-intent 404 Not Found"

**Symptoms:**
- Browser console shows 404
- Payment button does nothing
- No backend logs

**Causes:**
1. Route not registered in index.js
2. paymentController.createPaymentIntent doesn't exist

**Fix:**
```javascript
// In index.js, verify this line exists:
app.post('/create-payment-intent', requireAuth, paymentLimiter, paymentController.createPaymentIntent);

// In controllers/paymentController.js, verify final export:
module.exports = {
  showCheckout: exports.showCheckout,
  createPaymentIntent: exports.createPaymentIntent, // Must be here
  ...
};
```

**Test:**
```bash
grep -n "create-payment-intent" index.js
grep "createPaymentIntent" controllers/paymentController.js | tail -5
```

---

### Issue 2: "argument handler must be a function"

**Symptoms:**
- Server crashes on startup
- Error at line with `app.post('/create-payment-intent', ...)`
- Error: `TypeError: argument handler must be a function`

**Root Cause:**
paymentController module failed to load, so `createPaymentIntent` is undefined.

**Debug:**
```bash
# Test if module loads
node -e "require('dotenv').config(); try { const pc = require('./controllers/paymentController'); console.log('OK'); } catch(e) { console.error(e.message); }"

# Common error: "Neither apiKey nor config.authenticator provided"
# This means Stripe initialized before .env loaded
```

**Fix:**
Use lazy-loading for Stripe:
```javascript
// ❌ BAD - crashes during require()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ✅ GOOD - loads on first use
let stripe;
const getStripe = () => {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
};

// Use getStripe() everywhere
const paymentIntent = await getStripe().paymentIntents.create({...});
```

---

### Issue 3: "Session expired. Please log in again."

**Symptoms:**
- User is logged in
- Payment page loads
- Submit payment → error message
- 401 error in console

**Causes:**
1. Session cookies not sent with fetch request
2. Session expired (check session.cookie.maxAge)
3. Domain mismatch (development vs production)

**Fix:**
```javascript
// In payment form JavaScript, add credentials option:
fetch('/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin', // ← Required for cookies
  body: JSON.stringify({ plan })
})
```

**Verify session config:**
```javascript
// In index.js
app.use(session({
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax'
  }
}));
```

---

### Issue 4: Stripe test card fails / 402 error

**Symptoms:**
- Payment form submits successfully
- Stripe returns error code
- "Your card was declined" or similar message

**Test Cards:**
```
✅ Success: 4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
⚠️  Authentication: 4000 0025 0000 3155 (requires 3D Secure)
```

**Check Stripe Dashboard:**
1. Go to https://dashboard.stripe.com/test/payments
2. Find recent payment attempt
3. View error details

**Common Errors:**
- `card_declined` - Card number invalid or Stripe test mode issue
- `insufficient_funds` - Using decline test card
- `incorrect_cvc` - CVC validation failed
- `expired_card` - Expiry date in past

---

### Issue 5: Payment succeeds but server doesn't provision

**Symptoms:**
- Stripe shows payment succeeded
- User dashboard shows "provisioning" forever
- No server created

**Check webhook:**
```bash
# On production server
ssh deploy@68.183.203.226
journalctl -u cloudedbasement.service -f | grep webhook

# Look for:
# "Received webhook event: payment_intent.succeeded"
# "Creating server for user X"
```

**Verify webhook endpoint:**
```bash
# Check Stripe CLI (development)
stripe listen --forward-to localhost:3000/webhook/stripe

# Check Stripe dashboard (production)
# Settings → Webhooks → Add endpoint
# URL: https://cloudedbasement.ca/webhook/stripe
# Events: payment_intent.succeeded, charge.refunded
```

**Test webhook locally:**
```bash
stripe trigger payment_intent.succeeded
```

---

## 🔍 Debugging Checklist

### Before Testing Payment Flow
- [ ] `.env` has STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
- [ ] Server starts without errors (`node index.js`)
- [ ] `/pay` page loads (login first)
- [ ] Browser console has no errors
- [ ] Stripe.js script loads (check Network tab)

### During Payment Test
- [ ] Card input fields appear
- [ ] Real-time validation works (red border on invalid input)
- [ ] Submit button enables when form valid
- [ ] Click "Complete Payment"
- [ ] Watch browser console for errors
- [ ] Watch server logs: `journalctl -u cloudedbasement.service -f`

### After Payment Submission
- [ ] No 404 errors in console
- [ ] No 401 errors (session valid)
- [ ] Backend logs: "Payment Intent created: pi_xxx"
- [ ] Frontend receives clientSecret
- [ ] `confirmCardPayment` called
- [ ] Redirect to `/payment-success`

### Verify Backend Processing
- [ ] Check database: `SELECT * FROM payments WHERE user_id = X;`
- [ ] Check server record: `SELECT * FROM servers WHERE user_id = X;`
- [ ] Check DigitalOcean: Droplet exists
- [ ] User receives email (if configured)

---

## 📊 Monitoring Payment Health

### Key Metrics to Watch
1. **Payment Intent Creation Rate**
   - Should match "Complete Payment" button clicks
   - Low rate = form issues or session problems

2. **Payment Success Rate**
   - Track succeeded vs failed payments
   - Low rate = card issues or Stripe config problems

3. **Server Provisioning Rate**
   - Should match successful payments
   - Gap = webhook or automation issues

### Logs to Monitor
```bash
# Payment creation
grep "Payment Intent created" logs/app.log

# Payment success
grep "payment_intent.succeeded" logs/app.log

# Provisioning
grep "Creating server for user" logs/app.log

# Errors
grep -E "(error|Error|ERROR)" logs/app.log | grep -i payment
```

---

## 🧪 Testing Payment System

### Local Testing (Stripe Test Mode)
```bash
# 1. Start server
node index.js

# 2. Login at http://localhost:3000/login

# 3. Go to http://localhost:3000/pay?plan=basic

# 4. Fill form:
#    Name: Test User
#    Card: 4242 4242 4242 4242
#    Expiry: 12/34
#    CVC: 123

# 5. Submit and verify:
#    - No console errors
#    - Redirect to /payment-success
#    - Database updated
```

### Production Testing
```bash
# Use real card with small amount OR founder pricing ($0.50)
# 1. Complete payment flow
# 2. Verify email received
# 3. Check server provisioned
# 4. Refund test payment in Stripe dashboard
```

---

## 🚨 Emergency Rollback

If payment system breaks in production:

```bash
# 1. SSH to server
ssh deploy@68.183.203.226

# 2. Check current status
sudo systemctl status cloudedbasement.service

# 3. View recent logs
journalctl -u cloudedbasement.service -n 100 --no-pager

# 4. Rollback to previous commit
cd ~/server-ui
git log --oneline -5  # Find last working commit
git checkout <commit-hash>
sudo systemctl restart cloudedbasement.service

# 5. Verify server starts
sudo systemctl status cloudedbasement.service
```

---

## 📝 Historical Issues Log

### January 24, 2026 - Route Registration Bug
**Issue:** POST /create-payment-intent returned 404  
**Root Cause:** 
1. Stripe initialized before dotenv loaded → module crash
2. createPaymentIntent missing from final module.exports
3. Route not registered in index.js

**Fix:**
- Lazy-load Stripe with getStripe() function
- Added createPaymentIntent to module.exports
- Registered route in index.js line 322

**Prevention:** Always add new exports to final module.exports block

---

## 🔗 Useful Resources

- **Stripe Testing:** https://stripe.com/docs/testing
- **Stripe Elements:** https://stripe.com/docs/payments/elements
- **Payment Intents:** https://stripe.com/docs/payments/payment-intents
- **Webhooks:** https://stripe.com/docs/webhooks
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

## 💡 Pro Tips

1. **Always test in Stripe test mode first** - Use test keys, never commit real keys
2. **Use Stripe CLI for local webhook testing** - Faster than ngrok
3. **Check Stripe dashboard logs** - See exact API requests/responses
4. **Monitor browser Network tab** - Catch failed requests immediately
5. **Keep server logs verbose** - `console.log` payment steps for debugging
6. **Test with different cards** - Success, decline, 3D Secure
7. **Verify session cookies** - Use browser DevTools → Application → Cookies
8. **Test mobile too** - Payment forms behave differently on mobile

---

**Questions? Check:**
- [STRIPE-WEBHOOKS.md](STRIPE-WEBHOOKS.md) - Webhook configuration
- [SECURITY.md](SECURITY.md) - Payment security measures
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Full testing procedures
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment process

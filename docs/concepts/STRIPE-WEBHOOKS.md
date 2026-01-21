# Stripe Webhooks - The Automation Engine

## What It Is

Webhooks are HTTP POST requests that Stripe sends to your server when events happen (payment succeeded, payment refunded, subscription canceled, etc). They're how Stripe tells you "something important just happened."

## Why This Is THE Critical Feature

**Without webhooks:**
1. Customer clicks "Pay Now" → Stripe Checkout opens
2. Customer enters card → payment succeeds
3. Customer redirected to your site
4. **Nothing happens** - you don't know they paid
5. Manual intervention required to create server

**With webhooks:**
1. Customer clicks "Pay Now" → Stripe Checkout opens
2. Customer enters card → payment succeeds
3. **Stripe instantly POSTs to `/webhook/stripe`**
4. Your server creates DigitalOcean droplet automatically
5. Customer gets email when server ready (2-5 min)
6. Zero manual work

Webhooks **are** the automation. Without them, this is a manual provisioning service.

## Events We Handle

### 1. payment_intent.succeeded
**When it fires:** Card charge successful, money in your account

**What we do:**
```javascript
// controllers/paymentController.js
const paymentIntent = event.data.object;
const customerId = paymentIntent.customer;
const amount = paymentIntent.amount_received;
const chargeId = paymentIntent.charges.data[0]?.id;

// Get user from Stripe customer ID
const user = await pool.query('SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]);

// Create server record
await pool.query(
  'INSERT INTO servers (user_id, plan, status, stripe_charge_id) VALUES ($1, $2, $3, $4)',
  [user.id, plan, 'provisioning', chargeId]
);

// Trigger DigitalOcean provisioning
await createRealServer(user.id, plan, chargeId);

// Send welcome email
sendServerRequestEmail(user.email, region, serverName);
```

**Customer experience:**
- Pays $25
- Gets confirmation page
- Receives email 3 minutes later: "Your server is ready"
- SSH credentials included
- Can deploy immediately

### 2. charge.refunded
**When it fires:** You issue a refund (or chargeback)

**What we do:**
```javascript
// controllers/paymentController.js
const charge = event.data.object;
const chargeId = charge.id;

// Find server with this charge ID
const server = await pool.query('SELECT * FROM servers WHERE stripe_charge_id = $1', [chargeId]);

if (server) {
  // Destroy DigitalOcean droplet (stop billing)
  await axios.delete(`https://api.digitalocean.com/v2/droplets/${server.droplet_id}`);
  
  // Delete server record
  await pool.query('DELETE FROM servers WHERE id = $1', [server.id]);
  
  // Update payment status
  await pool.query('UPDATE payments SET status = $1 WHERE stripe_charge_id = $2', ['refunded', chargeId]);
}
```

**Why it matters:**
- Refund issued → server automatically destroyed within 30 seconds
- No orphaned droplets costing you $25/month
- No manual cleanup required

## Webhook Security

**1. Signature Verification**
```javascript
// Stripe signs webhooks with secret key
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

// If signature invalid, throws error → 400 response
// Prevents attackers from faking webhook events
```

Without signature verification: Attacker could POST fake "payment succeeded" events → free servers for everyone.

**2. Idempotency**
Stripe can send same webhook multiple times (network issues, retries). Must handle duplicates:

```javascript
// Check if already processed
const existing = await pool.query('SELECT id FROM payments WHERE stripe_payment_id = $1', [paymentIntent.id]);
if (existing.rows.length > 0) {
  return res.json({ received: true }); // Already processed, skip
}
```

Without idempotency: One payment → two servers created.

**3. Raw Body Required**
```javascript
// MUST be before express.json()
app.post('/webhook/stripe', express.raw({type: 'application/json'}), stripeWebhook);

// Then later...
app.use(express.json());
```

Stripe signature verification needs the **exact raw bytes** of the request body. If `express.json()` runs first, body is parsed → signature verification fails.

## Local Testing (Stripe CLI)

**Terminal 1 - Start Stripe listener:**
```bash
cd Downloads
.\stripe.exe listen --forward-to localhost:3000/webhook/stripe
```

Output:
```
> Ready! Your webhook signing secret is whsec_xyz123...
```

Copy that secret to `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xyz123...
```

**Terminal 2 - Start app:**
```bash
node index.js
```

**Terminal 3 - Trigger test webhook:**
```bash
.\stripe.exe trigger payment_intent.succeeded
```

Output in Terminal 1:
```
payment_intent.succeeded [evt_xxx] Received
POST http://localhost:3000/webhook/stripe [200]
```

Check your database - server should be created.

## Production Setup

**1. Add webhook endpoint in Stripe Dashboard:**
- URL: `https://cloudedbasement.ca/webhook/stripe`
- Events: `payment_intent.succeeded`, `charge.refunded`

**2. Get production webhook secret:**
- Different from local testing secret
- Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_prod_xxx...`

**3. Test with real payment:**
- Use test mode first (test card 4242 4242 4242 4242)
- Verify webhook received in Stripe Dashboard → Developers → Webhooks → View logs
- Check server created in your database
- Repeat with live mode

## Error Handling

**If webhook fails:**
```javascript
try {
  // Process webhook
  await createRealServer(userId, plan, chargeId);
} catch (error) {
  console.error('Webhook processing failed:', error);
  
  // Stripe will retry failed webhooks automatically
  // Up to 3 days of retries with exponential backoff
  return res.status(500).json({ error: 'Processing failed' });
}
```

Stripe sees 500 response → retries in 1 min, then 5 min, then 30 min, etc.

**Must respond quickly:**
- Webhook processing timeout: 30 seconds
- If you take longer, Stripe thinks it failed
- Move slow tasks (email sending) to background queue

## Business Impact

**Cost savings:**
- Refund issued → droplet destroyed immediately
- No manual monitoring required
- No surprise $500 bill from forgotten test servers

**Customer satisfaction:**
- Payment succeeds → server ready in 2-5 minutes
- No "we'll email you when it's ready" delays
- No support tickets asking "where's my server?"

**Scalability:**
- Can handle 100 payments/hour
- Zero human intervention
- Fully automated provisioning

---

**Critical:** Test webhooks locally BEFORE production. One misconfigured webhook = money lost.

Without webhooks: Manual provisioning service that doesn't scale.  
With webhooks: Fully automated platform that runs while you sleep.

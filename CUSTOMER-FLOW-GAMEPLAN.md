# Customer Flow Gameplan - Production Ready

**Date:** January 23, 2026  
**Goal:** Launch real product with paying customers

---

## 🎯 Complete Customer Journey

### Phase 1: Discovery & Signup
**Customer Actions:**
1. Visits cloudedbasement.ca
2. Reads about features (landing page)
3. Views pricing (/pricing) - sees real prices ($10, $30, $60/month)
4. Clicks "Get Started"
5. Creates account (/register) - enters email + password
6. Confirms email (clicks link or enters code)
7. Logs in (/login)

**What Must Work:**
- ✅ Landing page loads
- ✅ Pricing page shows correct plans
- ✅ Registration form works
- ⚠️ Email confirmation - **NEEDS TESTING**
- ✅ Login works
- ✅ Sessions persist

---

### Phase 2: Payment
**Customer Actions:**
1. Selects plan on /pricing
2. Clicks "Get Started"
3. Redirected to Stripe Checkout
4. Enters credit card (real card)
5. Completes payment ($10, $30, or $60)
6. Redirected to /payment-success

**What Must Work:**
- ❌ **CRITICAL: Fix Stripe keys** (currently mismatched)
- ❌ **CRITICAL: Revert prices from $0.50 to real** ($10/$30/$60)
- ✅ Stripe webhook receives payment
- ✅ Payment recorded in database
- ✅ Redirect to success page works

**Current Blockers:**
- Server has `sk_live` + `pk_test` (mismatched)
- Prices hardcoded to $0.50 for testing
- Need to decide: test mode first or go straight to live?

---

### Phase 3: Server Provisioning (AUTOMATIC)
**System Actions (No Customer Interaction):**
1. Webhook fires on payment success
2. `createRealServer()` called in paymentController.js
3. DigitalOcean API creates droplet
4. Ubuntu 22.04 + Nginx installed (cloud-init)
5. IP polling starts (10 sec intervals, max 5 min)
6. When IP assigned → database updated
7. Welcome email sent with SSH credentials

**Customer Sees:**
- Dashboard shows "⏳ Provisioning..." status
- Page auto-refreshes every 15 seconds
- After 2-5 minutes: Status changes to "✅ Running"
- IP address displayed
- SSH username + password visible

**What Must Work:**
- ✅ DigitalOcean API integration exists
- ✅ Polling system exists
- ✅ Database updates on IP assignment
- ⚠️ **NEEDS TESTING: Welcome email** (sendServerReadyEmail not called)
- ⚠️ **NEEDS TESTING: Full webhook → droplet flow**
- ✅ Dashboard shows real-time status

**Current Gaps:**
- Welcome email never sent (code commented out or missing call)
- Need to test full flow start-to-finish
- Need to verify cloud-init script installs Nginx correctly

---

### Phase 4: Using the Server
**Customer Actions:**
1. Views dashboard - sees server running
2. Copies SSH credentials
3. Connects: `ssh root@IP_ADDRESS`
4. (Optional) Deploys app via Git URL
5. (Optional) Adds custom domain
6. (Optional) Enables SSL certificate

**What Must Work:**
- ✅ Dashboard displays server details
- ✅ SSH credentials shown
- ✅ Server accessible via SSH
- ⚠️ **NEEDS TESTING: Git deployment**
- ⚠️ **NEEDS TESTING: Domain addition**
- ⚠️ **NEEDS TESTING: SSL automation**

---

### Phase 5: Support & Management
**Customer Actions:**
1. Can restart/stop/start server
2. Can submit support tickets
3. Can view deployment history
4. Can change password
5. Can manage domains

**What Must Work:**
- ✅ Server controls (start/stop/restart)
- ✅ Support ticket system
- ✅ Password change
- ✅ Deployment history
- ✅ Domain management UI

---

### Phase 6: Billing & Retention
**Customer Actions:**
1. Pays monthly (Stripe subscription)
2. Can view billing history
3. Can upgrade/downgrade plan
4. Can cancel subscription

**What Must Work:**
- ❌ **NOT IMPLEMENTED: Recurring billing**
- ❌ **NOT IMPLEMENTED: Billing history page**
- ❌ **NOT IMPLEMENTED: Plan changes**
- ❌ **NOT IMPLEMENTED: Cancellation flow**

**Current State:**
- One-time payments only
- No subscription system
- No billing portal

---

## 🔧 Technical Checklist

### Immediate Blockers (Must Fix Before Launch)

#### 1. Fix Stripe Configuration
**Current State:** Mismatched keys (live secret + test publishable)

**Fix Options:**

**Option A: Test Mode First (Recommended)**
- Use test keys: `sk_test` + `pk_test` + `whsec_5a24...`
- Test card: 4242 4242 4242 4242
- Real DigitalOcean droplet created (~$0.01 cost)
- No real charge to card
- Verify full flow works
- Then switch to live mode

**Option B: Go Live Immediately**
- Get live publishable key: `pk_live_...`
- Use live keys: `sk_live` + `pk_live` + `whsec_b1sy...`
- Use real card
- Real charge processes
- Higher risk if something breaks

**Decision Needed:** Which option?

#### 2. Revert Test Pricing
**Current:** All plans $0.50 (controllers/paymentController.js)
```javascript
const planConfig = {
  basic: { name: 'Basic Plan — TEST', price: 0.50, was: 25 },
  priority: { name: 'Priority Plan — TEST', price: 0.50, was: 60 },
  premium: { name: 'Premium Plan — TEST', price: 0.50, was: 120 }
};
```

**Need:** Real prices
```javascript
const planConfig = {
  basic: { name: 'Basic Plan', price: 10, description: '1GB RAM, 1 CPU, 25GB SSD' },
  priority: { name: 'Priority Plan', price: 30, description: '2GB RAM, 2 CPUs, 50GB SSD' },
  premium: { name: 'Premium Plan', price: 60, description: '4GB RAM, 2 CPUs, 80GB SSD' }
};
```

**When:** After testing succeeds with $0.50

#### 3. Test & Fix Email Sending
**Current State:** Multiple providers configured, none tested end-to-end

**Providers Available:**
- Hostinger SMTP (support@cloudedbasement.ca)
- SendGrid API
- Mailtrap (dev sandbox)
- Gmail OAuth2 (not configured)

**Emails That Must Send:**
- ✅ Email confirmation on registration
- ⚠️ Welcome email after server ready (currently missing)
- ✅ Support ticket confirmation
- ✅ Password change confirmation

**Test Plan:**
1. Register new account → verify confirmation email received
2. Complete payment → verify welcome email with SSH credentials
3. Submit support ticket → verify confirmation email
4. Change password → verify confirmation email

#### 4. Test Full Payment → Server Flow
**Steps:**
1. Clear test data
2. Register fresh account
3. Complete payment (test mode with $0.50)
4. Watch logs: `ssh deploy@68.183.203.226 "journalctl -u cloudedbasement.service -f"`
5. Verify:
   - Webhook received
   - Payment recorded
   - DigitalOcean droplet created
   - IP polling succeeds
   - Database updated with IP
   - Dashboard shows running server
   - SSH credentials work
   - Can connect via SSH
6. Delete test droplet immediately
7. If all works → switch to live mode + real prices

---

## 💰 Pricing Strategy

### Current Plan Structure
- **Basic:** $10/month - 1GB RAM, 1 CPU, 25GB SSD
- **Priority:** $30/month - 2GB RAM, 2 CPUs, 50GB SSD
- **Premium:** $60/month - 4GB RAM, 2 CPUs, 80GB SSD

### Cost Analysis (DigitalOcean)
- Basic droplet: ~$6/month → $4 profit
- Priority droplet: ~$12/month → $18 profit
- Premium droplet: ~$18/month → $42 profit

**Margins:** 40-70% depending on plan

### Launch Strategy Options

**Option 1: Founder Launch Promo**
- First 10 customers: $10/month lifetime (any plan)
- Lock in price forever
- Full platform access
- Marketing: "Early adopter pricing - limited slots"

**Option 2: Standard Pricing**
- Launch with full prices ($10/$30/$60)
- No discounts
- Professional positioning

**Option 3: Free Trial**
- 7-day free trial (no credit card)
- Full access
- Auto-converts to paid after trial
- (Requires Stripe subscription system)

**Recommendation:** Option 1 (validates market, builds testimonials, low risk)

---

## 🚀 Launch Sequence

### Week 1: Testing Phase
**Days 1-3:**
- [ ] Fix Stripe keys (test mode)
- [ ] Test payment flow ($0.50)
- [ ] Verify server provisioning works
- [ ] Test all email sends
- [ ] Test SSH access
- [ ] Test Git deployment
- [ ] Test domain + SSL

**Days 4-5:**
- [ ] Fix any bugs found
- [ ] Retest critical paths
- [ ] Load test (multiple simultaneous signups)

**Days 6-7:**
- [ ] Switch to live mode
- [ ] Revert pricing to real values
- [ ] Final production test with real card
- [ ] Get refund immediately

### Week 2: Soft Launch
**Audience:** Friends, family, trusted contacts
- [ ] Send personal invites (5-10 people)
- [ ] Offer founder pricing ($10/month)
- [ ] Collect feedback
- [ ] Monitor closely for issues
- [ ] Be available for immediate support

### Week 3: Public Beta
**Audience:** Reddit, Twitter, ProductHunt
- [ ] Post on /r/selfhosted, /r/webdev
- [ ] Tweet about launch
- [ ] Limited founder slots (10-20 total)
- [ ] Social proof (testimonials from soft launch)

### Week 4+: Scale
- [ ] Regular pricing for new customers
- [ ] Grandfather existing customers
- [ ] Add features based on feedback
- [ ] Build recurring revenue

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] 100% uptime for provisioning
- [ ] <5 min average provisioning time
- [ ] <1% payment failures
- [ ] 100% email delivery rate
- [ ] <24hr support response time

### Business Metrics
- [ ] 10 paying customers (Month 1)
- [ ] $100+ MRR (Monthly Recurring Revenue)
- [ ] 50% conversion (signup → payment)
- [ ] <10% churn rate
- [ ] Net Promoter Score >8/10

---

## 🚨 Critical Risks

### Technical Risks
1. **DigitalOcean API Failure**
   - Mitigation: Auto-refund + manual provisioning fallback
   
2. **Email Not Delivering**
   - Mitigation: Test all providers, have backup SMTP
   
3. **Security Breach**
   - Mitigation: Regular audits, rate limiting, HTTPS

4. **Database Corruption**
   - Mitigation: Daily backups, test restores

### Business Risks
1. **No Customers**
   - Mitigation: Founder pricing, personal outreach
   
2. **High Churn**
   - Mitigation: Excellent onboarding, fast support
   
3. **Costs Exceed Revenue**
   - Mitigation: Monitor margins, adjust pricing

---

## 📝 Decision Points

### Right Now
**Question:** Test mode first or go live immediately?
- [ ] **Test mode** - safer, validates flow, $0.50 charges
- [ ] **Live mode** - faster to market, real customer test

**Recommendation:** Test mode first

### After Testing
**Question:** What pricing strategy?
- [ ] Founder launch ($10/month lifetime)
- [ ] Standard pricing ($10/$30/$60)
- [ ] Free trial (requires subscription system)

**Recommendation:** Founder launch

### Launch Timeline
**Question:** When to go public?
- [ ] This week (aggressive)
- [ ] Next week (realistic)
- [ ] 2+ weeks (cautious)

**Recommendation:** Next week (after testing complete)

---

## 📋 Next Actions

### Immediate (Today)
1. **Decide:** Test mode or live mode?
2. **If test mode:** 
   - Comment out live keys
   - Uncomment test keys
   - Restart service
3. **If live mode:**
   - Get pk_live key from Stripe
   - Update server .env
   - Restart service
4. **Test payment flow** with current $0.50 pricing
5. **Verify** droplet creates successfully

### Tomorrow
1. **Fix email sending** (welcome email missing)
2. **Test Git deployment** end-to-end
3. **Test domain + SSL** automation
4. **Load test** (3-5 concurrent signups)

### This Week
1. **Revert pricing** to real values ($10/$30/$60)
2. **Final production test** with real card
3. **Create marketing materials** (landing page copy, social posts)
4. **Prepare launch plan** (who to contact, where to post)

### Next Week
1. **Soft launch** to friends/family
2. **Collect feedback**
3. **Fix critical issues**
4. **Public beta launch**

---

**Current Blocker:** Stripe keys mismatched on server. Need to fix before any testing can proceed.

**Next Decision:** Test mode ($0.50, test card) or live mode (real prices, real card)?

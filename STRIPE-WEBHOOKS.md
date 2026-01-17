# Stripe Webhooks Testing Guide

## Setup

### 1. Install Stripe CLI
Download from: https://stripe.com/docs/stripe-cli

Windows:
```bash
scoop install stripe
```

Or download directly: https://github.com/stripe/stripe-cli/releases/latest

### 2. Login to Stripe CLI
```bash
stripe login
```

### 3. Get Webhook Secret for Local Testing
```bash
stripe listen --forward-to localhost:3000/webhook/stripe
```

This will output a webhook signing secret like:
```
whsec_xxxxxxxxxxxxxxxxxxxxx
```

Copy this secret and update your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 4. Start Your Server
```bash
node index.js
```

## Testing Webhooks Locally

### Test Refund Event
With the Stripe CLI listening (from step 3), trigger a test refund:

```bash
stripe trigger charge.refunded
```

This will send a test webhook to your local server. Check your server logs for:
- "Received webhook event: charge.refunded"
- "Found server X for refunded charge Y"
- "Destroyed droplet Z for refunded server"
- "Deleted server from database due to refund"

### Test Real Refund
1. Make a real test payment through your app
2. Go to Stripe Dashboard → Payments
3. Find the charge and click "Refund"
4. Your webhook endpoint will automatically:
   - Receive the `charge.refunded` event
   - Find the server with matching `stripe_charge_id`
   - Destroy the DigitalOcean droplet
   - Delete the server from your database

## Production Setup

### 1. Create Webhook in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/webhook/stripe`
4. Select events to listen to:
   - `charge.refunded` ✅
   - `checkout.session.completed` (optional)
5. Copy the webhook signing secret

### 2. Update Production Environment
Add the webhook secret to your production `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
```

### 3. Test Production Webhook
Use Stripe CLI to test production endpoint:
```bash
stripe trigger charge.refunded --stripe-account=your_account_id
```

## Webhook Events We Handle

### charge.refunded
**Trigger:** Customer refund issued in Stripe dashboard
**Action:**
- Find server by `stripe_charge_id`
- Destroy DigitalOcean droplet
- Delete server from database
**Result:** Automatic cleanup when payment is refunded

### checkout.session.completed (logged only)
**Trigger:** Successful checkout
**Action:** None (handled by redirect flow)
**Note:** Could be used for async server provisioning in future

## Security Notes

1. **Signature Verification:** All webhooks are verified using `stripe.webhooks.constructEvent()` with the signing secret
2. **Raw Body Required:** Webhook endpoint uses `express.raw()` middleware (not `express.json()`)
3. **Secret Rotation:** Rotate webhook secrets periodically in Stripe dashboard

## Troubleshooting

### "Webhook signature verification failed"
- Check that `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI or dashboard
- Verify webhook endpoint receives raw body (not JSON parsed)
- Ensure no middleware modifies the request body before webhook handler

### "No server found for charge ID"
- Check that `stripe_charge_id` column exists in database (run migration)
- Verify payment success flow stores charge ID correctly
- Check logs: "Retrieved charge ID: ch_xxxxx"

### Webhook not received
- Verify Stripe CLI is running: `stripe listen --forward-to localhost:3000/webhook/stripe`
- Check firewall allows localhost connections
- Verify server is running on correct port (3000)

## Database Migration

Before testing webhooks, run this migration to add the `stripe_charge_id` column:

```bash
psql -U postgres -d webserver_db -f add_stripe_charge_id.sql
```

Or manually:
```sql
ALTER TABLE servers ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_servers_stripe_charge_id ON servers(stripe_charge_id);
```

## Monitoring

Watch server logs for webhook activity:
```bash
# Windows PowerShell
Get-Content -Path "server.log" -Wait

# Or run server with verbose logging
node index.js | Tee-Object -FilePath "server.log"
```

Look for these log messages:
- ✅ "Received webhook event: charge.refunded"
- ✅ "Retrieved charge ID: ch_xxxxx"
- ✅ "Found server X for refunded charge"
- ✅ "Destroyed droplet Y"
- ✅ "Deleted server from database due to refund"
- ❌ "Webhook signature verification failed"
- ❌ "No server found for charge ID"

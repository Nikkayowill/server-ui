const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db');
const { createRealServer } = require('../services/digitalocean');
const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../helpers');

// GET /pay
exports.showCheckout = (req, res) => {
  const plan = req.query.plan || 'basic';
  const planConfig = {
    basic: { name: 'Basic Plan', price: 25, description: '1GB RAM, 1 CPU, 25GB SSD - Perfect for small projects' },
    priority: { name: 'Priority Plan', price: 60, description: '2GB RAM, 2 CPUs, 50GB SSD - For production apps' },
    premium: { name: 'Premium Plan', price: 120, description: '4GB RAM, 2 CPUs, 80GB SSD - For serious projects' }
  };
  const selectedPlan = planConfig[plan] || planConfig.basic;
  
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - Basement</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .checkout-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 120px 5vw 60px; }
        .checkout-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; 
            padding: 48px; max-width: 500px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
        .checkout-card h1 { font-size: 32px; margin-bottom: 12px; color: var(--glow); text-align: center; }
        .checkout-card .price { font-size: 48px; font-weight: 700; color: #fff; text-align: center; margin: 24px 0; }
        .checkout-card .description { text-align: center; color: #8892a0; font-size: 14px; margin-bottom: 32px; }
        
        .btn { width: 100%; padding: 16px 32px; border: 1px solid var(--glow); background: var(--glow); color: #0a0812; 
            font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; }
        .btn:hover { box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        .btn:active { transform: translateY(0); }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="checkout-container">
        <div class="checkout-card">
            <h1>${selectedPlan.name}</h1>
            <div class="price">$${selectedPlan.price}<span style="font-size: 20px;">.00</span></div>
            <p class="description">${selectedPlan.description}</p>
            <form action="/create-checkout-session" method="POST">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                <input type="hidden" name="plan" value="${plan}">
                <button type="submit" class="btn">Pay with Stripe</button>
            </form>
        </div>
    </div>
    
    ${getFooter()}
    <script src="https://js.stripe.com/v3/"></script>
</body>
</html>
`);
};

// POST /create-checkout-session
exports.createCheckoutSession = async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    const planPrices = {
      basic: { amount: 2500, name: 'Basic Plan' },
      priority: { amount: 6000, name: 'Priority Plan' },
      premium: { amount: 12000, name: 'Premium Plan' }
    };
    const selectedPlan = planPrices[plan] || planPrices.basic;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: `${selectedPlan.name} - Monthly subscription`,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
      metadata: {
        plan: plan,
        user_id: req.session.userId
      }
    });
    res.redirect(303, session.url);
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).send('Payment processing error');
  }
};

// GET /payment-success
exports.paymentSuccess = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    
    // Check if user already has a server
    const existingServer = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    // If no server exists, create one (real provisioning)
    if (existingServer.rows.length === 0) {
      const plan = req.query.plan || 'basic';
      
      // Get the checkout session to retrieve the charge ID
      let chargeId = null;
      if (sessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
          });
          
          // Get charge ID from payment intent
          if (session.payment_intent && typeof session.payment_intent === 'object') {
            const paymentIntent = session.payment_intent;
            if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
              chargeId = paymentIntent.charges.data[0].id;
              console.log('Retrieved charge ID:', chargeId);
            }
          }
        } catch (stripeError) {
          console.error('Error retrieving session:', stripeError.message);
        }
      }
      
      await createRealServer(req.session.userId, plan, chargeId);
    }

  } catch (error) {
    console.error('Error creating server:', error);
  }

  res.send(`
${getHTMLHead('Payment Successful - Basement')}
    <link rel="stylesheet" href="/css/payment.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="success-container">
        <div class="success-card">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p class="subtitle">Thank you for your purchase. Your payment has been processed successfully.</p>
            
            <div class="info-box">
                <h3>What's Next?</h3>
                <p><strong>Confirmation Email:</strong> You'll receive a confirmation email at ${req.session.userEmail || 'your registered email'} with your receipt and order details.</p>
                <p><strong>Access:</strong> Your services are now active. You can access them immediately from your dashboard.</p>
                <p><strong>Support:</strong> If you have any questions, our support team is ready to help you get started.</p>
            </div>
            
            <div class="btn-group">
                <a href="/dashboard" class="btn primary">Go to Dashboard</a>
                <a href="/" class="btn">Back to Home</a>
            </div>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// GET /payment-cancel
exports.paymentCancel = (req, res) => {
  res.send(`
${getHTMLHead('Payment Cancelled - Basement')}
    <link rel="stylesheet" href="/css/payment.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="cancel-container">
        <div class="cancel-card">
            <div class="cancel-icon">✕</div>
            <h1>Payment Cancelled</h1>
            <p class="subtitle">Your payment was cancelled and no charges were made to your account.</p>
            
            <div class="info-box">
                <h3>What Happened?</h3>
                <p>You cancelled the payment process before it was completed. This is perfectly fine - no charges were processed.</p>
                <p><strong>Need Help?</strong> If you encountered any issues during checkout or have questions about our pricing plans, please don't hesitate to contact us.</p>
                <p><strong>Ready to Try Again?</strong> You can return to the pricing page to select a plan that works for you.</p>
            </div>
            
            <div class="btn-group">
                <a href="/pricing" class="btn primary">View Pricing</a>
                <a href="/contact" class="btn">Contact Support</a>
                <a href="/" class="btn">Back to Home</a>
            </div>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// POST /webhook/stripe
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'charge.refunded':
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);

        // Find server with this charge ID and mark as deleted
        const serverResult = await pool.query(
          'SELECT * FROM servers WHERE stripe_charge_id = $1',
          [charge.id]
        );

        if (serverResult.rows.length > 0) {
          const server = serverResult.rows[0];
          console.log(`Refund processed for server ${server.id}, marking as deleted`);
          
          await pool.query(
            'UPDATE servers SET status = $1 WHERE id = $2',
            ['deleted', server.id]
          );
        }
        break;

      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

module.exports = {
  showCheckout: exports.showCheckout,
  createCheckoutSession: exports.createCheckoutSession,
  paymentSuccess: exports.paymentSuccess,
  paymentCancel: exports.paymentCancel,
  stripeWebhook: exports.stripeWebhook
};

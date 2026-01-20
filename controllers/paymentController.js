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
${getHTMLHead('Checkout - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-brand rounded-lg p-8 text-center">
        <h1 class="text-3xl font-bold text-white mb-4">${selectedPlan.name}</h1>
        <div class="text-5xl font-bold text-brand mb-2">
          $${selectedPlan.price}<span class="text-2xl">.00</span>
        </div>
        <p class="text-gray-400 mb-8">${selectedPlan.description}</p>
        
        <form action="/create-checkout-session" method="POST">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          <input type="hidden" name="plan" value="${plan}">
          <button type="submit" class="w-full py-4 bg-brand text-gray-900 font-bold text-lg rounded-lg hover:bg-cyan-500 transition-colors">
            Pay with Stripe
          </button>
        </form>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
    <script src="https://js.stripe.com/v3/"></script>
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
    const plan = req.query.plan || 'founder';
    
    // Record payment immediately so onboarding wizard detects it
    if (!sessionId) {
      return res.redirect('/payment-cancel?error=Missing session ID');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
    // Check if payment already recorded
    const existingPayment = await pool.query(
      'SELECT * FROM payments WHERE stripe_payment_id = $1',
      [session.payment_intent.id]
    );
    
    // Record payment if not already in database
    if (existingPayment.rows.length === 0) {
      await pool.query(
        'INSERT INTO payments (user_id, stripe_payment_id, amount, plan, status) VALUES ($1, $2, $3, $4, $5)',
        [req.session.userId, session.payment_intent.id, session.amount_total / 100, plan, 'succeeded']
      );
      console.log('Payment recorded:', session.payment_intent.id);
    }
    
    // Server creation now handled by webhook only to prevent race conditions
    console.log('Payment recorded. Server provisioning will be handled by webhook.');

  } catch (error) {
    console.error('Payment processing error:', error);
    return res.redirect('/payment-cancel?error=Payment recording failed. Please contact support.');
  }

  // Redirect to onboarding wizard instead of showing static success page
  res.redirect('/getting-started?payment=success');
  return;

  res.send(`
${getHTMLHead('Payment Successful - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-2xl w-full bg-gray-800 border border-green-700 rounded-lg p-8 text-center">
        <div class="text-6xl text-green-400 mb-6">✓</div>
        <h1 class="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        <p class="text-xl text-gray-400 mb-8">Thank you for your purchase. Your payment has been processed successfully.</p>
        
        <div class="bg-gray-700 border border-gray-600 rounded-lg p-6 text-left mb-8">
          <h3 class="text-brand text-xl font-bold mb-3">What's Next?</h3>
          <p class="text-gray-400 mb-3"><strong class="text-white">Confirmation Email:</strong> You'll receive a confirmation email at ${req.session.userEmail || 'your registered email'} with your receipt and order details.</p>
          <p class="text-gray-400 mb-3"><strong class="text-white">Access:</strong> Your services are now active. You can access them immediately from your dashboard.</p>
          <p class="text-gray-400"><strong class="text-white">Support:</strong> If you have any questions, our support team is ready to help you get started.</p>
        </div>
        
        <div class="flex gap-4 justify-center">
          <a href="/dashboard" class="px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Go to Dashboard</a>
          <a href="/" class="px-8 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">Back to Home</a>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// GET /payment-cancel
exports.paymentCancel = (req, res) => {
  res.send(`
${getHTMLHead('Payment Cancelled - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-2xl w-full bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <div class="text-6xl text-red-400 mb-6">✕</div>
        <h1 class="text-3xl font-bold text-white mb-4">Payment Cancelled</h1>
        <p class="text-xl text-gray-400 mb-8">Your payment was cancelled and no charges were made to your account.</p>
        
        <div class="bg-gray-700 border border-gray-600 rounded-lg p-6 text-left mb-8">
          <h3 class="text-brand text-xl font-bold mb-3">What Happened?</h3>
          <p class="text-gray-400 mb-3">You cancelled the payment process before it was completed. This is perfectly fine - no charges were processed.</p>
          <p class="text-gray-400 mb-3"><strong class="text-white">Need Help?</strong> If you encountered any issues during checkout or have questions about our pricing plans, please don't hesitate to contact us.</p>
          <p class="text-gray-400"><strong class="text-white">Ready to Try Again?</strong> You can return to the pricing page to select a plan that works for you.</p>
        </div>
        
        <div class="flex gap-4 justify-center"
          <a href="/pricing" class="px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">View Pricing</a>
          <a href="/contact" class="px-8 py-3 border-2 border-brand text-brand font-bold rounded-lg hover:bg-brand hover:bg-opacity-10 transition-colors">Contact Support</a>
          <a href="/" class="px-8 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">Back to Home</a>
        </div>
      </div>
    </main>
    
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
      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);

        // Use database transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update payment status to refunded
          await client.query(
            'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_charge_id = $2',
            ['refunded', charge.id]
          );

          // Find server with this charge ID and mark as deleted
          const serverResult = await client.query(
            'SELECT * FROM servers WHERE stripe_charge_id = $1',
            [charge.id]
          );

          if (serverResult.rows.length > 0) {
            const server = serverResult.rows[0];
            console.log(`Refund processed for server ${server.id}, marking as deleted`);
            
            await client.query(
              'UPDATE servers SET status = $1 WHERE id = $2',
              ['deleted', server.id]
            );
          }

          await client.query('COMMIT');
          client.release();
        } catch (error) {
          await client.query('ROLLBACK');
          client.release();
          console.error('Error processing charge.refunded:', error);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('PaymentIntent succeeded:', paymentIntent.id);

        // Use database transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Extract customer email and plan from metadata
          const customerEmail = paymentIntent.billing_details?.email || paymentIntent.metadata?.email;
          const plan = paymentIntent.metadata?.plan || 'unknown';
          const amount = paymentIntent.amount / 100; // Convert cents to dollars

          if (!customerEmail) {
            console.log('No customer email found in payment intent');
            await client.query('ROLLBACK');
            client.release();
            break;
          }

          // Find user by email
          const userResult = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [customerEmail]
          );

          if (userResult.rows.length === 0) {
            console.log(`User not found for email: ${customerEmail}`);
            await client.query('ROLLBACK');
            client.release();
            break;
          }

          const userId = userResult.rows[0].id;

          // Check if payment already recorded (avoid duplicates)
          const existingPayment = await client.query(
            'SELECT id FROM payments WHERE stripe_payment_id = $1',
            [paymentIntent.id]
          );

          if (existingPayment.rows.length > 0) {
            console.log('Payment already recorded:', paymentIntent.id);
            await client.query('COMMIT');
            client.release();
            break;
          }

          // Record payment in database
          await client.query(
            'INSERT INTO payments (user_id, stripe_payment_id, amount, plan, status) VALUES ($1, $2, $3, $4, $5)',
            [userId, paymentIntent.id, amount, plan, 'succeeded']
          );

          console.log(`Payment recorded: User ${userId}, $${amount}, Plan: ${plan}`);
          
          // Create server if user doesn't have one (webhook is single source of truth)
          const serverCheck = await client.query(
            'SELECT * FROM servers WHERE user_id = $1 AND status NOT IN (\'deleted\', \'failed\')',
            [userId]
          );
          
          if (serverCheck.rows.length === 0) {
            console.log('Creating server for user from webhook:', userId);
            await createRealServer(userId, plan, paymentIntent.id);
          } else {
            console.log('User already has active server, skipping creation');
          }

          await client.query('COMMIT');
          client.release();
        } catch (error) {
          await client.query('ROLLBACK');
          client.release();
          console.error('Error processing payment_intent.succeeded:', error);
        }
        break;
      }

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

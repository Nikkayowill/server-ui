let stripe;
const getStripe = () => {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
};
const pool = require('../db');
const { createRealServer } = require('../services/digitalocean');
const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../helpers');

// GET /pay
exports.showCheckout = (req, res) => {
  // Require email confirmation before payment
  if (!req.session.emailConfirmed) {
    return res.redirect('/dashboard?error=Please confirm your email before purchasing');
  }
  
  const plan = req.query.plan || 'basic';
  const planConfig = {
    basic: { name: 'Basic Plan', price: 0.50, was: 25, description: '1GB RAM, 1 CPU, 25GB SSD' },
    priority: { name: 'Priority Plan', price: 0.50, was: 60, description: '2GB RAM, 2 CPUs, 50GB SSD' },
    premium: { name: 'Premium Plan', price: 0.50, was: 120, description: '4GB RAM, 2 CPUs, 80GB SSD' }
  };
  const selectedPlan = planConfig[plan] || planConfig.basic;
  
  res.send(`
${getHTMLHead('Checkout - Clouded  Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-24 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-brand rounded-lg p-8">
        <div class="text-center mb-6">
          <div class="inline-block px-4 py-2 bg-brand bg-opacity-20 border border-brand rounded-full mb-4">
            <span class="text-white text-xs font-bold uppercase">Monthly Billing</span>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">${selectedPlan.name}</h1>
          <p class="text-gray-400 text-sm">${selectedPlan.description}</p>
        </div>
        
        <div class="bg-black bg-opacity-30 rounded-lg p-6 mb-6">
          <div class="text-center mb-4">
            <div class="text-5xl font-bold text-brand">
              $${selectedPlan.price}<span class="text-2xl text-gray-400">/month</span>
            </div>
            <p class="text-gray-400 text-xs mt-2">Early Adopter price · was $${selectedPlan.was} · locked for life</p>
          </div>
          
          <div class="border-t border-gray-700 pt-4 space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-brand text-lg">✓</span>
              <p class="text-gray-300 text-sm">Billed monthly starting today</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-brand text-lg">✓</span>
              <p class="text-gray-300 text-sm">Cancel anytime - no contracts or commitments</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-brand text-lg">✓</span>
              <p class="text-gray-300 text-sm">Instant server activation after payment</p>
            </div>
          </div>
        </div>
        
        <form id="payment-form" class="mb-4">
          <input type="hidden" name="plan" value="${plan}">
          
          <!-- Cardholder Name -->
          <div class="mb-4">
            <label class="block text-gray-300 text-sm font-semibold mb-2">Cardholder Name</label>
            <input 
              type="text" 
              id="cardholder-name" 
              required
              placeholder="John Doe"
              class="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>
          
          <!-- Card Input (split into 3 fields) -->
          <div class="mb-4">
            <label class="block text-gray-300 text-sm font-semibold mb-2">Card Number</label>
            <div id="card-number-element" class="bg-gray-900 border border-gray-600 rounded-lg p-4"></div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-gray-300 text-sm font-semibold mb-2">Expiry Date</label>
              <div id="card-expiry-element" class="bg-gray-900 border border-gray-600 rounded-lg p-4"></div>
            </div>
            <div>
              <label class="block text-gray-300 text-sm font-semibold mb-2">CVC</label>
              <div id="card-cvc-element" class="bg-gray-900 border border-gray-600 rounded-lg p-4"></div>
            </div>
          </div>
          
          <div id="card-errors" class="text-red-400 text-sm mb-4"></div>
          
          <button type="submit" id="submit-button" class="w-full py-4 bg-blue-600 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed">
            <span id="button-text">Complete Payment</span>
            <span id="spinner" class="hidden">Processing...</span>
          </button>
        </form>
        
        <p class="text-gray-500 text-xs text-center">Powered by Stripe • Secure SSL encryption</p>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
    <script src="https://js.stripe.com/v3/"></script>
    <script>
      // Initialize Stripe with publishable key
      const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
      const elements = stripe.elements();
      
      // Create separate card elements
      const cardNumberElement = elements.create('cardNumber', {
        style: {
          base: {
            color: '#e0e6f0',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '16px',
            '::placeholder': {
              color: '#8892a0'
            }
          },
          invalid: {
            color: '#ef4444'
          }
        }
      });
      
      const cardExpiryElement = elements.create('cardExpiry', {
        style: {
          base: {
            color: '#e0e6f0',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '16px',
            '::placeholder': {
              color: '#8892a0'
            }
          },
          invalid: {
            color: '#ef4444'
          }
        }
      });
      
      const cardCvcElement = elements.create('cardCvc', {
        style: {
          base: {
            color: '#e0e6f0',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '16px',
            '::placeholder': {
              color: '#8892a0'
            }
          },
          invalid: {
            color: '#ef4444'
          }
        }
      });
      
      cardNumberElement.mount('#card-number-element');
      cardExpiryElement.mount('#card-expiry-element');
      cardCvcElement.mount('#card-cvc-element');
      
      // Handle real-time validation errors
      const displayError = document.getElementById('card-errors');
      [cardNumberElement, cardExpiryElement, cardCvcElement].forEach(element => {
        element.on('change', (event) => {
          if (event.error) {
            displayError.textContent = event.error.message;
          } else {
            displayError.textContent = '';
          }
        });
      });
      
      // Handle form submission
      const form = document.getElementById('payment-form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const submitButton = document.getElementById('submit-button');
        const buttonText = document.getElementById('button-text');
        const spinner = document.getElementById('spinner');
        
        // Disable button and show loading
        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
        
        try {
          // Create payment intent on backend
          const plan = form.querySelector('input[name="plan"]').value;
          const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ plan })
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Session expired. Please log in again.');
          }
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Confirm payment with card (handles 3D Secure automatically)
          const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
            payment_method: {
              card: cardNumberElement,
              billing_details: {
                name: document.getElementById('cardholder-name').value
              }
            }
          });
          
          if (stripeError) {
            // Handle specific decline codes like Checkout does
            let errorMessage = stripeError.message;
            if (stripeError.decline_code === 'insufficient_funds') {
              errorMessage = 'Your card has insufficient funds.';
            } else if (stripeError.decline_code === 'card_velocity_exceeded') {
              errorMessage = 'Your card was declined for making repeated attempts too frequently.';
            }
            document.getElementById('card-errors').textContent = errorMessage;
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
          } else if (paymentIntent.status === 'succeeded') {
            window.location.href = '/payment-success?plan=' + plan + '&payment_intent_id=' + paymentIntent.id;
          } else if (paymentIntent.status === 'processing') {
            // Payment is processing asynchronously (some payment methods)
            window.location.href = '/payment-success?plan=' + plan + '&payment_intent_id=' + paymentIntent.id;
          } else {
            // Handle unexpected payment states (requires_action shouldn't happen - confirmCardPayment handles it)
            document.getElementById('card-errors').textContent = 'Payment status: ' + paymentIntent.status + '. Please contact support.';
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
          }
        } catch (err) {
          document.getElementById('card-errors').textContent = err.message;
          submitButton.disabled = false;
          buttonText.classList.remove('hidden');
          spinner.classList.add('hidden');
        }
      });
      
      console.log('Stripe card element mounted');
    </script>
`);
};

// POST /create-payment-intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    
    // Verify user is authenticated (double-check after middleware)
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    
    // Early access pricing - $0.50 (production will be $25/$60/$120)
    const planPrices = {
      basic: { amount: 50, name: 'Basic Plan' },
      priority: { amount: 50, name: 'Priority Plan' },
      premium: { amount: 50, name: 'Premium Plan' }
    };
    const selectedPlan = planPrices[plan] || planPrices.basic;
    
    // Create Payment Intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: selectedPlan.amount,
      currency: 'usd',
      description: `${selectedPlan.name} - Monthly subscription`,
      metadata: {
        plan: plan,
        user_id: String(req.session.userId)
      }
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment Intent error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /create-checkout-session
exports.createCheckoutSession = async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    // Early access pricing - $0.50 (production will be $25/$60/$120)
    const planPrices = {
      basic: { amount: 50, name: 'Basic Plan' },
      priority: { amount: 50, name: 'Priority Plan' },
      premium: { amount: 50, name: 'Premium Plan' }
    };
    const selectedPlan = planPrices[plan] || planPrices.basic;

    const session = await getStripe().checkout.sessions.create({
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
    const paymentIntentId = req.query.payment_intent_id;
    const plan = req.query.plan || 'founder';
    
    // Record payment immediately so onboarding wizard detects it
    if (!paymentIntentId) {
      return res.redirect('/payment-cancel?error=Missing payment intent ID');
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
    // If session expired, skip recording (webhook will handle it)
    // User still gets redirected to dashboard if they log back in
    if (req.session.userId) {
      // Check if payment already recorded
      const existingPayment = await pool.query(
        'SELECT * FROM payments WHERE stripe_payment_id = $1',
        [paymentIntent.id]
      );
      
      // Record payment if not already in database
      if (existingPayment.rows.length === 0) {
        await pool.query(
          'INSERT INTO payments (user_id, stripe_payment_id, amount, plan, status) VALUES ($1, $2, $3, $4, $5)',
          [req.session.userId, paymentIntent.id, paymentIntent.amount / 100, plan, 'succeeded']
        );
        console.log('Payment recorded:', paymentIntent.id);
      }
    } else {
      console.log('Session expired at payment-success, webhook will handle payment recording');
    }
    
    // CRITICAL FIX: Create server here as fallback since webhook may not fire for Payment Intents
    // Check if user already has a server (race condition protection)
    if (req.session.userId) {
      const existingServer = await pool.query(
        'SELECT * FROM servers WHERE user_id = $1 AND status NOT IN (\'deleted\', \'failed\')',
        [req.session.userId]
      );
      
      if (existingServer.rows.length === 0) {
        console.log('Creating server from payment-success page for user:', req.session.userId);
        await createRealServer(req.session.userId, plan, paymentIntentId);
      } else {
        console.log('User already has server, skipping creation');
      }
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return res.redirect('/payment-cancel?error=Payment recording failed. Please contact support.');
  }

  // Redirect to dashboard - provisioning status will be visible there
  res.redirect('/dashboard?success=Payment successful! Your server is being provisioned (2-5 minutes). You\'ll receive an email when ready.');
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
        
        <div class="flex gap-4 justify-center">
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

  // Debug logging
  console.log('[WEBHOOK DEBUG] Headers:', Object.keys(req.headers));
  console.log('[WEBHOOK DEBUG] Has stripe-signature:', !!sig);
  console.log('[WEBHOOK DEBUG] Body type:', typeof req.body);
  console.log('[WEBHOOK DEBUG] Body is Buffer:', Buffer.isBuffer(req.body));

  let event;

  try {
    // Verify webhook signature
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    console.error('[WEBHOOK DEBUG] Signature:', sig ? 'present' : 'MISSING');
    console.error('[WEBHOOK DEBUG] Secret configured:', !!webhookSecret);
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

      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        // Use database transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Extract customer email and session data
          const customerEmail = session.customer_details?.email || session.customer_email;
          const paymentIntentId = session.payment_intent;
          const amount = session.amount_total / 100; // Convert cents to dollars
          
          // Extract plan from success_url
          const successUrl = session.success_url || '';
          const planMatch = successUrl.match(/[?&]plan=([^&]+)/);
          const plan = planMatch ? planMatch[1] : 'basic';

          if (!customerEmail) {
            console.log('No customer email found in checkout session');
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

          // Check if server provisioning already started (avoid duplicates)
          const serverCheck = await client.query(
            'SELECT * FROM servers WHERE user_id = $1 AND status NOT IN (\'deleted\', \'failed\')',
            [userId]
          );
          
          if (serverCheck.rows.length === 0) {
            console.log('Creating server for user from webhook:', userId, 'Plan:', plan);
            await createRealServer(userId, plan, paymentIntentId || session.id);
          } else {
            console.log('User already has active/provisioning server, skipping creation');
          }

          await client.query('COMMIT');
          client.release();
        } catch (error) {
          await client.query('ROLLBACK');
          client.release();
          console.error('Error processing checkout.session.completed:', error);
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

          // Extract user_id and plan from metadata (set during createPaymentIntent)
          const userIdStr = paymentIntent.metadata?.user_id;
          const plan = paymentIntent.metadata?.plan || 'basic';
          const amount = paymentIntent.amount / 100; // Convert cents to dollars

          if (!userIdStr) {
            console.log('No user_id found in payment intent metadata');
            await client.query('ROLLBACK');
            client.release();
            break;
          }

          // Convert user_id from string to integer (Stripe metadata is always strings)
          const userId = parseInt(userIdStr, 10);
          if (isNaN(userId)) {
            console.log(`Invalid user_id in metadata: ${userIdStr}`);
            await client.query('ROLLBACK');
            client.release();
            break;
          }

          // Verify user exists
          const userResult = await client.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
          );

          if (userResult.rows.length === 0) {
            console.log(`User not found for ID: ${userId}`);
            await client.query('ROLLBACK');
            client.release();
            break;
          }

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
  createPaymentIntent: exports.createPaymentIntent,
  createCheckoutSession: exports.createCheckoutSession,
  paymentSuccess: exports.paymentSuccess,
  paymentCancel: exports.paymentCancel,
  stripeWebhook: exports.stripeWebhook
};

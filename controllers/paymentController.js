let stripe;
const getStripe = () => {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
};
const pool = require('../db');
const { createRealServer, destroyDroplet } = require('../services/digitalocean');
const { getHTMLHead, getScripts, getFooter, getResponsiveNav, escapeHtml } = require('../helpers');
const { sendEmail } = require('../services/email');

// Pricing plans configuration (monthly and yearly prices in CENTS for Stripe)
// Yearly = 10% discount (monthly × 12 × 0.90)
const PRICING_PLANS = {
  basic: { name: 'Basic', monthly: 1500, yearly: 16200, was: 25, description: 'Perfect for side projects', features: ['1GB RAM', '1 CPU', '25GB Storage', '2 sites'] },
  pro: { name: 'Pro', monthly: 3500, yearly: 37800, was: 60, description: 'Most popular • For production apps', features: ['2GB RAM', '2 CPUs', '60GB Storage', '5 sites'] },
  priority: { name: 'Pro', monthly: 3500, yearly: 37800, was: 60, description: 'Most popular • For production apps', features: ['2GB RAM', '2 CPUs', '60GB Storage', '5 sites'] }, // legacy
  premium: { name: 'Premium', monthly: 7500, yearly: 81000, was: 120, description: 'For serious projects', features: ['4GB RAM', '2 CPUs', '80GB Storage', '10 sites'] }
};

// GET /pay
exports.showCheckout = (req, res) => {
  // Require email confirmation before payment
  if (!req.session.emailConfirmed) {
    return res.redirect('/dashboard?error=Please confirm your email before purchasing');
  }
  
  // Demo mode: admin-only fake checkout that skips Stripe
  if (req.query.demo === 'true' && req.session.userRole === 'admin') {
    const plan = req.query.plan || 'pro';
    const selectedPlan = PRICING_PLANS[plan] || PRICING_PLANS.pro;
    
    // Render a simple "processing" page that auto-redirects to provisioning
    return res.send(`
${getHTMLHead('Processing Payment - Clouded Basement')}
      ${getResponsiveNav(req)}
      
      <main class="bg-gray-900 min-h-screen flex items-center justify-center py-24 px-4">
        <div class="max-w-md w-full bg-gray-800 border border-brand rounded-lg p-8 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand bg-opacity-20 mb-6">
            <svg class="animate-spin h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">Processing Payment...</h1>
          <p class="text-gray-400 text-sm mb-4">Confirming your ${escapeHtml(selectedPlan.name)} subscription</p>
          <div class="text-5xl font-bold text-brand mb-2">$${selectedPlan.monthly / 100}<span class="text-2xl text-gray-400">/month</span></div>
          <p class="text-gray-500 text-xs">(Demo mode — no actual charge)</p>
        </div>
      </main>
      
      ${getFooter()}
      ${getScripts('nav.js')}
      
      <script>
        // Auto-redirect to provisioning after 3 seconds
        setTimeout(() => {
          window.location.href = '/dashboard?demo=true&state=provisioning&demoPlan=${plan}';
        }, 3000);
      </script>
    `);
  }
  
  const plan = req.query.plan || 'basic';
  const interval = req.query.interval || 'monthly';
  const selectedPlan = PRICING_PLANS[plan] || PRICING_PLANS.basic;
  
  // Get the right price based on interval (convert cents to dollars for display)
  const priceInCents = interval === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;
  const price = priceInCents / 100; // Convert to dollars for display
  const intervalLabel = interval === 'yearly' ? 'Yearly' : 'Monthly';
  const intervalShort = interval === 'yearly' ? '/year' : '/month';
  
  res.send(`
${getHTMLHead('Checkout - Clouded  Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-24 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-brand rounded-lg p-8">
        <div class="text-center mb-6">
          <div class="inline-block px-4 py-2 bg-brand bg-opacity-20 border border-brand rounded-full mb-4">
            <span class="text-white text-xs font-bold uppercase">${intervalLabel} Billing</span>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">${escapeHtml(selectedPlan.name)}</h1>
          <p class="text-gray-400 text-sm">${escapeHtml(selectedPlan.description)}</p>
        </div>
        
        <div class="bg-black bg-opacity-30 rounded-lg p-6 mb-6">
          <div class="text-center mb-4">
            <div class="text-5xl font-bold text-brand">
              $${price}<span class="text-2xl text-gray-400">${intervalShort}</span>
            </div>
            ${interval === 'yearly' ? `<p class="text-green-400 text-xs mt-2">Save 10% with yearly billing!</p>` : `<p class="text-gray-400 text-xs mt-2">Early Adopter price · was $${selectedPlan.was} · locked for life</p>`}
          </div>
          
          <div class="border-t border-gray-700 pt-4 space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-brand text-lg">✓</span>
              <p class="text-gray-300 text-sm">Billed ${interval === 'yearly' ? 'annually' : 'monthly'} starting today</p>
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
          <input type="hidden" name="interval" value="${interval}">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
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
          const interval = form.querySelector('input[name="interval"]').value;
          const csrfToken = form.querySelector('input[name="_csrf"]').value;
          const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ plan, interval, _csrf: csrfToken })
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
          
          // Store subscription ID for success page
          const subscriptionId = data.subscriptionId;
          
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
            window.location.href = '/payment-success?plan=' + plan + '&interval=' + interval + '&subscription_id=' + subscriptionId;
          } else if (paymentIntent.status === 'processing') {
            // Payment is processing asynchronously (some payment methods)
            window.location.href = '/payment-success?plan=' + plan + '&interval=' + interval + '&subscription_id=' + subscriptionId;
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

// POST /create-payment-intent - Creates a subscription with incomplete payment for embedded form
exports.createPaymentIntent = async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    const interval = req.body.interval || 'monthly';
    
    // Verify user is authenticated (double-check after middleware)
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    
    // Get user email for Stripe customer
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.session.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }
    const userEmail = userResult.rows[0].email;
    
    // Use real pricing from PRICING_PLANS (in cents)
    const selectedPlan = PRICING_PLANS[plan] || PRICING_PLANS.basic;
    const amount = interval === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;
    const stripeInterval = interval === 'yearly' ? 'year' : 'month';
    
    // Find or create Stripe customer
    let customer;
    const existingCustomers = await getStripe().customers.list({ email: userEmail, limit: 1 });
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { user_id: String(req.session.userId) }
      });
    }
    
    // Create a price for the subscription
    const price = await getStripe().prices.create({
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: stripeInterval },
      product_data: {
        name: `${selectedPlan.name} Plan`,
        metadata: { plan: plan }
      }
    });
    
    // Create subscription with incomplete payment (lets us use embedded form)
    const subscription = await getStripe().subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        plan: plan,
        interval: interval,
        user_id: String(req.session.userId)
      }
    });
    
    // Return the client secret from the subscription's payment intent
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    
    res.json({ 
      clientSecret: clientSecret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /create-checkout-session - One-time payment option (redirects to Stripe Checkout)
exports.createCheckoutSession = async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    const interval = req.body.interval || 'monthly'; // 'monthly' or 'yearly'
    
    // Use real pricing (in cents) - same as subscriptions
    const selectedPlan = PRICING_PLANS[plan] || PRICING_PLANS.basic;
    const amount = interval === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: `${selectedPlan.name} - ${interval === 'yearly' ? 'Yearly' : 'Monthly'} (one-time payment)`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?plan=${plan}&interval=${interval}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
      metadata: {
        plan: plan,
        interval: interval,
        user_id: req.session.userId,
        payment_type: 'one_time'
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
  console.log('[PAYMENT-SUCCESS] User returned from Stripe checkout');
  
  // Just redirect to dashboard - it will show provisioning UI
  res.redirect('/dashboard?provisioning=true');
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
    return res.status(400).send(`Webhook Error: ${escapeHtml(err.message)}`);
  }

  // Handle the event
  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'charge.refunded': {
        const charge = event.data.object;
        // IMPORTANT: We store PaymentIntent IDs (pi_xxx), not Charge IDs (ch_xxx)
        const paymentIntentId = charge.payment_intent;
        console.log('Charge refunded:', charge.id, 'PaymentIntent:', paymentIntentId);

        // Use database transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update payment status to refunded (search by payment_intent ID)
          await client.query(
            'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_id = $2',
            ['refunded', paymentIntentId]
          );

          // Find server with this payment intent ID and destroy it
          const serverResult = await client.query(
            'SELECT * FROM servers WHERE stripe_charge_id = $1',
            [paymentIntentId]
          );

          if (serverResult.rows.length > 0) {
            const server = serverResult.rows[0];
            console.log(`Refund processed for server ${server.id}, destroying droplet and marking as deleted`);
            
            // Destroy droplet if exists (same as subscription cancellation)
            if (server.droplet_id) {
              try {
                await destroyDroplet(server.droplet_id);
                console.log(`Droplet ${server.droplet_id} destroyed due to refund`);
              } catch (err) {
                console.error('Failed to destroy droplet on refund:', err.message);
              }
            }
            
            await client.query(
              'UPDATE servers SET status = $1, cancelled_at = CURRENT_TIMESTAMP WHERE id = $2',
              ['deleted', server.id]
            );
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing charge.refunded:', error);
        } finally {
          client.release();
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
          
          // Get plan and interval from metadata (set in createCheckoutSession)
          const plan = session.metadata?.plan || 'basic';
          const interval = session.metadata?.interval || 'monthly';

          if (!customerEmail) {
            console.log('No customer email found in checkout session');
            await client.query('ROLLBACK');
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
            break;
          }

          const userId = userResult.rows[0].id;

          // Check if server provisioning already started (avoid duplicates)
          const serverCheck = await client.query(
            'SELECT * FROM servers WHERE user_id = $1 AND status NOT IN (\'deleted\', \'failed\')',
            [userId]
          );
          
          if (serverCheck.rows.length === 0) {
            console.log('Creating server for user from webhook:', userId, 'Plan:', plan, 'Interval:', interval);
            await createRealServer(userId, plan, paymentIntentId || session.id, interval);
          } else {
            console.log('User already has active/provisioning server, skipping creation');
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing checkout.session.completed:', error);
        } finally {
          client.release();
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('PaymentIntent succeeded:', paymentIntent.id);

        // If this is a subscription payment, let invoice.paid handle it
        if (paymentIntent.invoice) {
          console.log('Subscription payment intent - letting invoice.paid handle server creation');
          break;
        }

        // Use database transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Extract user_id and plan from metadata (set during createPaymentIntent)
          const userIdStr = paymentIntent.metadata?.user_id;
          let plan = paymentIntent.metadata?.plan || 'basic';
          const interval = paymentIntent.metadata?.interval || 'monthly';
          const amount = paymentIntent.amount / 100; // Convert cents to dollars

          if (!userIdStr) {
            console.log('No user_id found in payment intent metadata');
            await client.query('ROLLBACK');
            break;
          }

          // Convert user_id from string to integer (Stripe metadata is always strings)
          const userId = parseInt(userIdStr, 10);
          if (isNaN(userId)) {
            console.log(`Invalid user_id in metadata: ${userIdStr}`);
            await client.query('ROLLBACK');
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
            break;
          }

          // Security: Validate plan matches amount paid (in cents)
          // Use PRICING_PLANS constant for single source of truth
          const expectedMonthly = PRICING_PLANS[plan]?.monthly || PRICING_PLANS.basic.monthly;
          const expectedYearly = PRICING_PLANS[plan]?.yearly || PRICING_PLANS.basic.yearly;
          const paidCents = paymentIntent.amount;
          
          if (paidCents !== expectedMonthly && paidCents !== expectedYearly) {
            console.log(`⚠️ Amount mismatch: Paid ${paidCents} cents, Expected ${expectedMonthly} or ${expectedYearly} for plan '${plan}'`);
            // Force basic plan if amount doesn't match
            plan = 'basic';
          }
          
          // Validate plan is one of the allowed values
          if (!['basic', 'pro', 'priority', 'premium'].includes(plan)) {
            console.log(`⚠️ Invalid plan '${plan}', defaulting to basic`);
            plan = 'basic';
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
            await createRealServer(userId, plan, paymentIntent.id, interval);
          } else {
            console.log('User already has active server, skipping creation');
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing payment_intent.succeeded:', error);
        } finally {
          client.release();
        }
        break;
      }

      case 'invoice.paid': {
        // Handle subscription invoice payments (first and recurring)
        const invoice = event.data.object;
        console.log('Invoice paid:', invoice.id, 'Subscription:', invoice.subscription);
        
        // Only process subscription invoices
        if (!invoice.subscription) {
          console.log('Not a subscription invoice, skipping');
          break;
        }
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Get subscription details from Stripe
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription);
          const userId = parseInt(subscription.metadata?.user_id, 10);
          const plan = subscription.metadata?.plan || 'basic';
          const interval = subscription.metadata?.interval || 'monthly';
          
          if (!userId || isNaN(userId)) {
            console.log('No valid user_id in subscription metadata');
            await client.query('ROLLBACK');
            break;
          }
          
          // Check if this is the first invoice (billing_reason = 'subscription_create')
          if (invoice.billing_reason === 'subscription_create') {
            console.log(`First subscription payment for user ${userId}, plan: ${plan}`);
            
            // Check if server already exists
            const serverCheck = await client.query(
              'SELECT * FROM servers WHERE user_id = $1 AND status NOT IN (\'deleted\', \'failed\')',
              [userId]
            );
            
            if (serverCheck.rows.length === 0) {
              console.log('Creating server for subscription:', invoice.subscription);
              await createRealServer(userId, plan, invoice.payment_intent, interval, invoice.subscription);
            } else {
              // Server exists, just update subscription ID if needed
              await client.query(
                'UPDATE servers SET stripe_subscription_id = $1 WHERE user_id = $2 AND status NOT IN (\'deleted\', \'failed\')',
                [invoice.subscription, userId]
              );
              console.log('Updated existing server with subscription ID');
            }
          } else {
            // Recurring payment - just log it
            console.log(`Recurring payment received for user ${userId}, subscription: ${invoice.subscription}`);
          }
          
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing invoice.paid:', error);
        } finally {
          client.release();
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Subscription payment failed (card declined, expired, etc.)
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id, 'Subscription:', invoice.subscription);
        
        if (!invoice.subscription) {
          break;
        }
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Get subscription to find user
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription);
          const userId = parseInt(subscription.metadata?.user_id, 10);
          
          if (userId && !isNaN(userId)) {
            // Get user email
            const userResult = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
              const userEmail = userResult.rows[0].email;
              console.log(`Payment failed for user ${userId} (${userEmail})`);
              
              // Send payment failed email to customer
              const customerHtml = `
                <h2>Payment Failed</h2>
                <p>Hi there,</p>
                <p>We were unable to process your latest payment for your Clouded Basement subscription.</p>
                <p>Please update your payment method to avoid service interruption. Stripe will automatically retry the charge, but if all retries fail your server will be cancelled.</p>
                <p>If you need help, reply to this email or submit a support ticket from your dashboard.</p>
                <p>— Clouded Basement</p>
              `;
              const customerText = `Payment Failed\n\nWe were unable to process your latest payment for your Clouded Basement subscription.\n\nPlease update your payment method to avoid service interruption. Stripe will automatically retry the charge, but if all retries fail your server will be cancelled.\n\nIf you need help, reply to this email or submit a support ticket from your dashboard.`;
              
              sendEmail(userEmail, 'Action Required: Payment Failed - Clouded Basement', customerHtml, customerText)
                .catch(err => console.error(`[PAYMENT] Failed to send payment-failed email to ${userEmail}:`, err.message));
              
              // Send notification to admin
              const adminHtml = `
                <h2>Payment Failed</h2>
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Invoice:</strong> ${invoice.id}</p>
                <p><strong>Subscription:</strong> ${invoice.subscription}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p>Stripe will auto-retry. Monitor for cancellation.</p>
              `;
              const adminText = `Payment Failed\nUser: ${userId} (${userEmail})\nInvoice: ${invoice.id}\nSubscription: ${invoice.subscription}`;
              
              sendEmail('support@cloudedbasement.ca', `[Payment Failed] User ${userId} - ${userEmail}`, adminHtml, adminText)
                .catch(err => console.error(`[PAYMENT] Failed to send payment-failed admin notification:`, err.message));
            }
          }
          
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing invoice.payment_failed:', error);
        } finally {
          client.release();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled (by admin, user request, or payment failure)
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Find server with this subscription
          const serverResult = await client.query(
            'SELECT * FROM servers WHERE stripe_subscription_id = $1',
            [subscription.id]
          );
          
          if (serverResult.rows.length > 0) {
            const server = serverResult.rows[0];
            
            // Skip if already deleted (avoid duplicate processing)
            if (server.status === 'deleted') {
              console.log('Server already deleted, skipping webhook processing');
              await client.query('COMMIT');
              break;
            }
            
            console.log(`Cancelling server ${server.id} due to subscription deletion`);
            
            // Destroy droplet if exists
            if (server.droplet_id) {
              try {
                await destroyDroplet(server.droplet_id);
                console.log(`Droplet ${server.droplet_id} destroyed`);
              } catch (err) {
                console.error('Failed to destroy droplet:', err.message);
              }
            }
            
            // Mark server as deleted
            await client.query(
              'UPDATE servers SET status = $1, cancelled_at = CURRENT_TIMESTAMP WHERE id = $2',
              ['deleted', server.id]
            );
          } else {
            console.log('No server found for subscription:', subscription.id);
          }
          
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          console.error('Error processing customer.subscription.deleted:', error);
        } finally {
          client.release();
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

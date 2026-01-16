const express = require('express');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 contact form submissions per hour
  message: 'Too many contact submissions, please try again later.'
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment attempts per 15 minutes
  message: 'Too many payment attempts, please try again later.'
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Stripe
}));

app.use(express.static('public'));

app.use(cookieParser());
app.use(express.urlencoded({ extended: false })); // lets us read form bodies

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/about', (req, res) => res.sendFile(__dirname + '/about.html'));
app.get('/contact', csrfProtection, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact - LocalBiz</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
    a { text-decoration: none; color: inherit; }
    
    .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
        repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
        repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
    
    nav { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 95%; max-width: 1200px; z-index: 1000;
        background: rgba(2, 8, 20, 0.85); backdrop-filter: blur(16px); padding: 16px 32px; border-radius: 8px;
        box-shadow: 0 0 30px rgba(136, 254, 0, 0.12), inset 0 0 0 1px rgba(136, 254, 0, 0.1); }
    nav ul { display: flex; gap: 40px; justify-content: space-between; align-items: center; flex-wrap: wrap; list-style: none; }
    .logo { font-size: 22px; font-weight: 700; color: #cfff90; text-shadow: 0 0 10px rgba(136, 254, 0, 0.5); }
    nav li a { text-transform: uppercase; letter-spacing: 1.5px; color: #8892a0; font-size: 11px; transition: .3s; }
    nav a:hover { color: var(--glow); text-shadow: 0 0 8px var(--glow); }
    
    .contact-container { min-height: 100vh; padding: 140px 5vw 60px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 42px; margin-bottom: 16px; color: var(--glow); }
    .subtitle { color: #8892a0; font-size: 15px; margin-bottom: 40px; }
    
    form { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 40px; }
    label { display: block; margin-bottom: 24px; }
    label span { display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); }
    input, textarea { width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.2); 
        border-radius: 4px; color: #e0e6f0; font-family: inherit; font-size: 14px; transition: .3s; }
    input:focus, textarea:focus { outline: none; border-color: var(--glow); box-shadow: 0 0 10px rgba(136, 254, 0, 0.2); }
    textarea { min-height: 150px; resize: vertical; }
    
    button { width: 100%; padding: 16px; background: var(--glow); color: #0a0812; border: none; border-radius: 4px; 
        font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
        cursor: pointer; transition: .3s; }
    button:hover { box-shadow: 0 0 30px var(--glow); transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    
    footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="matrix-bg"></div>
  
  <nav>
    <ul>
      <li class="logo">LocalBiz</li>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
      <li><a href="/terms">Terms</a></li>
    </ul>
  </nav>
  
  <div class="contact-container">
    <h1>Contact Us</h1>
    <p class="subtitle">Get in touch with our team</p>
    
    <form method="POST" action="/contact">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      
      <label>
        <span>Name</span>
        <input type="text" name="name" required>
      </label>
      
      <label>
        <span>Email</span>
        <input type="email" name="email" required>
      </label>
      
      <label>
        <span>Message</span>
        <textarea name="message" required></textarea>
      </label>
      
      <button type="submit">Send Message</button>
    </form>
  </div>
  
  <footer>
    <p>LocalBiz © 2026</p>
  </footer>
</body>
</html>
  `);
});

app.post('/contact', 
  contactLimiter,
  csrfProtection,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`
        <h1>Validation Error</h1>
        <ul>${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
        <a href="/contact">Go back</a>
      `);
    }
    console.log('Form received:', req.body);
    res.redirect('/');
  }
);

// route for privacy policy (next)

app.get('/terms', (req, res) => res.sendFile(__dirname + '/terms.html'));

app.get('/pay', csrfProtection, (req, res) => res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        nav { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 95%; max-width: 1200px; z-index: 1000;
            background: rgba(2, 8, 20, 0.85); backdrop-filter: blur(16px); padding: 16px 32px; border-radius: 8px;
            box-shadow: 0 0 30px rgba(136, 254, 0, 0.12), inset 0 0 0 1px rgba(136, 254, 0, 0.1); }
        nav ul { display: flex; gap: 40px; justify-content: space-between; align-items: center; flex-wrap: wrap; list-style: none; }
        .logo { font-size: 22px; font-weight: 700; color: #cfff90; text-shadow: 0 0 10px rgba(136, 254, 0, 0.5); }
        nav li a { text-transform: uppercase; letter-spacing: 1.5px; color: #8892a0; font-size: 11px; transition: .3s; }
        nav a:hover { color: var(--glow); text-shadow: 0 0 8px var(--glow); }
        
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
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    <nav>
        <ul>
            <li class="logo">LocalBiz</li>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/terms">Terms</a></li>
        </ul>
    </nav>
    
    <div class="checkout-container">
        <div class="checkout-card">
            <h1>Checkout</h1>
            <div class="price">$20<span style="font-size: 20px;">.00</span></div>
            <p class="description">LocalBiz Service - Secure payment powered by Stripe</p>
            <form action="/create-checkout-session" method="POST">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                <button type="submit" class="btn">Pay with Stripe</button>
            </form>
        </div>
    </div>
    
    <footer>
        <p>LocalBiz © 2026</p>
    </footer>
    <script src="https://js.stripe.com/v3/"></script>
</body>
</html>
`))

app.post('/create-checkout-session', paymentLimiter, csrfProtection, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'LocalBiz Service',
              description: 'Service payment',
            },
            unit_amount: 2000, // $20.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/?success=true`,
      cancel_url: `${req.protocol}://${req.get('host')}/?canceled=true`,
    });
    res.redirect(303, session.url);
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).send('Payment processing error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
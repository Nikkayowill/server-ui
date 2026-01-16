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
<html>
<head>
  <title>Contact - LocalBiz MVP</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
<nav>
  <a href="/">Home</a> |
  <a href="/about">About</a> |
  <a href="/contact">Contact</a> |
  <a href="/terms">Terms</a>
</nav>
  <h1>Contact Us</h1>
  <form method="POST" action="/contact">
    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
    <label>Name: <input type="text" name="name" required></label><br>
    <label>Email: <input type="email" name="email" required></label><br>
    <label>Message: <textarea name="message" required></textarea></label><br>
    <button type="submit">Send</button>
  </form>
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
<!doctype html>
<html>
<body>
  <h1>Checkout</h1>
  <form action="/create-checkout-session" method="POST">
    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
    <button type="submit">Pay with Stripe</button>
  </form>
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
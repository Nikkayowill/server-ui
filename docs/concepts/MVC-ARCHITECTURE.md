# MVC Architecture - Separation of Concerns

## What It Is

MVC splits code into three layers:
- **Model** - Data (database queries, business logic)
- **View** - Presentation (HTML, UI)
- **Controller** - Coordination (handles requests, calls models, renders views)

## Why We Use It

**Before MVC (monolithic):**
```javascript
// index.js - 2,264 lines, everything mixed together
app.post('/register', async (req, res) => {
  // 1. Extract data
  const { email, password } = req.body;
  
  // 2. Validate
  if (!email || !password) {
    return res.send('<html><body>Error!</body></html>');
  }
  
  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 4. Save to database
  await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hashedPassword]);
  
  // 5. Generate HTML
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Success</title></head>
    <body><h1>Registered!</h1></body>
    </html>
  `);
});

// 50+ routes like this = unmaintainable
```

**After MVC (organized):**
```javascript
// controllers/authController.js - 130 lines, just coordination
exports.handleRegister = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/register?error=invalid_input');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Save user
  await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hashedPassword]);
  
  // Set session
  req.session.userId = result.rows[0].id;
  
  // Redirect
  res.redirect('/dashboard');
};

// helpers.js - Reusable HTML
function getHTMLHead(title) {
  return `<!DOCTYPE html><html><head><title>${title}</title>...`;
}

// routes/auth.js - Just routing
router.post('/register', csrfProtection, validationRules, authController.handleRegister);
```

## Our MVC Structure

```
controllers/          # Business logic
├── authController.js        # Login, register, logout
├── dashboardController.js   # Dashboard rendering + data
├── paymentController.js     # Stripe integration
├── serverController.js      # Server management
└── pagesController.js       # Static pages

routes/              # URL mapping
├── auth.js                  # Maps /login to authController
├── dashboard.js             # Maps /dashboard to dashboardController
└── ...

helpers.js           # View layer (HTML generation)
├── getHTMLHead()
├── getResponsiveNav()
├── getFooter()
└── getScripts()

services/            # External APIs (like a Model layer)
├── digitalocean.js          # VPS provisioning
├── email.js                 # Email sending
└── auditLog.js              # Logging

middleware/          # Cross-cutting concerns
├── auth.js                  # Authentication
├── rateLimiter.js           # Rate limiting
└── errorHandler.js          # Error handling
```

## Benefits

**1. Easy to Find Code**
- Login broken? → `controllers/authController.js`
- Payment failing? → `controllers/paymentController.js`
- Need to change footer? → `helpers.js`

**2. Easy to Change Code**
- Want to change HTML? Only touch `helpers.js`
- Want to change payment logic? Only touch `paymentController.js`
- No risk of breaking unrelated features

**3. Easy to Test**
```javascript
// Test just the controller
const { handleRegister } = require('./controllers/authController');

test('registration creates user', async () => {
  const req = { body: { email: 'test@test.com', password: 'pass123' } };
  const res = { redirect: jest.fn() };
  
  await handleRegister(req, res);
  
  expect(res.redirect).toHaveBeenCalledWith('/dashboard');
});
```

**4. Easy to Scale**
- Can move `services/digitalocean.js` to separate microservice
- Can replace `helpers.js` with React components
- Can add API endpoints that return JSON instead of HTML

## Real Example - Dashboard

**Controller (business logic):**
```javascript
// controllers/dashboardController.js
exports.showDashboard = async (req, res) => {
  const userId = req.session.userId;
  
  // Get user's server
  const serverResult = await pool.query('SELECT * FROM servers WHERE user_id = $1', [userId]);
  const server = serverResult.rows[0] || null;
  
  // Get deployments
  const deployments = await pool.query('SELECT * FROM deployments WHERE user_id = $1', [userId]);
  
  // Get domains
  const domains = await pool.query('SELECT * FROM domains WHERE user_id = $1', [userId]);
  
  // Render view
  res.send(buildDashboardTemplate({ server, deployments: deployments.rows, domains: domains.rows }));
};
```

**View (presentation):**
```javascript
// helpers.js
function buildDashboardTemplate({ server, deployments, domains }) {
  return `
    ${getHTMLHead('Dashboard')}
    ${getResponsiveNav()}
    <main>
      ${server ? serverCard(server) : noServerCard()}
      ${deploymentsTable(deployments)}
      ${domainsTable(domains)}
    </main>
    ${getFooter()}
  `;
}
```

**Route (URL mapping):**
```javascript
// routes/dashboard.js
router.get('/dashboard', requireAuth, csrfProtection, dashboardController.showDashboard);
```

## Migration to React (Future)

MVC makes frontend migration easy:

**Current (Server-rendered):**
```javascript
// Controller returns HTML
res.send(buildDashboardTemplate({ server, deployments }));
```

**Future (React SPA):**
```javascript
// Controller returns JSON
res.json({ server, deployments });

// React app fetches and renders
fetch('/api/dashboard')
  .then(res => res.json())
  .then(data => <Dashboard {...data} />);
```

Same controller logic, just change response format.

---

MVC = organized code that's easy to understand, change, and scale.  
Without it: 2,264-line index.js nightmare.  
With it: 12 clear files under 200 lines each.

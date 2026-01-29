# Code Architecture Analysis - DRY Opportunities
**Date:** January 27, 2026  
**Scope:** controllers/*.js, services/digitalocean.js, services/email.js  
**Goal:** Identify and abstract repeated patterns for code elegance and maintainability

---

## Executive Summary

**Total patterns identified:** 8 major categories  
**Total occurrences:** 150+ instances  
**Estimated LOC reduction:** 600-800 lines (40% reduction possible)  
**Files affected:** 8 controllers, 3 services, 2 middleware

---

## 1. DATABASE QUERY PATTERNS

### Pattern 1.1: Get User's Server
**Occurrences:** 15 times  
**Files:**
- serverController.js (8x) - lines 31, 102, 192, 1020, 1070, 1199, 1360, 1393
- dashboardController.js (3x) - lines 23, 41, 54
- paymentController.js (2x) - payment success flow
- adminController.js (1x) - server management
- index.js (1x) - server request handler

**Current code:**
```javascript
const serverResult = await pool.query(
  'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
  [userId]
);

if (serverResult.rows.length === 0) {
  return res.redirect('/dashboard?error=No server found');
}

const server = serverResult.rows[0];
```

**Proposed abstraction:**
```javascript
// utils/database.js
async function getUserServer(userId, options = {}) {
  const {
    requireActive = true,
    throwOnMissing = false
  } = options;
  
  let query = 'SELECT * FROM servers WHERE user_id = $1';
  
  if (requireActive) {
    query += " AND status NOT IN ('deleted', 'failed')";
  }
  
  query += ' ORDER BY created_at DESC LIMIT 1';
  
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0 && throwOnMissing) {
    throw new Error('No server found');
  }
  
  return result.rows[0] || null;
}

// Usage:
const server = await getUserServer(userId);
if (!server) {
  return res.redirect('/dashboard?error=No server found');
}
```

**LOC saved:** 45 lines (3 lines per instance)

---

### Pattern 1.2: Check User Ownership
**Occurrences:** 8 times  
**Files:**
- serverController.js (5x) - domain verification, env vars, deployment deletion
- dashboardController.js (1x) - ticket submission
- adminController.js (2x) - admin actions

**Current code:**
```javascript
const domainCheck = await pool.query(
  'SELECT id FROM domains WHERE domain = $1 AND user_id = $2',
  [domain, userId]
);

if (domainCheck.rows.length === 0) {
  return res.redirect('/dashboard?error=Domain not found or access denied');
}
```

**Proposed abstraction:**
```javascript
// utils/database.js
async function verifyOwnership(table, id, userId, identifierColumn = 'id') {
  const query = `SELECT * FROM ${table} WHERE ${identifierColumn} = $1 AND user_id = $2`;
  const result = await pool.query(query, [id, userId]);
  return result.rows[0] || null;
}

async function requireOwnership(table, id, userId, identifierColumn = 'id') {
  const record = await verifyOwnership(table, id, userId, identifierColumn);
  if (!record) {
    throw new Error('Record not found or access denied');
  }
  return record;
}

// Usage:
const domain = await requireOwnership('domains', domainName, userId, 'domain');
// Automatically throws error if not found/not owned
```

**LOC saved:** 40 lines (5 lines per instance)

---

### Pattern 1.3: Check Payment Status
**Occurrences:** 4 times  
**Files:**
- dashboardController.js (1x) - hasPaid check
- paymentController.js (2x) - payment success, webhook
- index.js (1x) - server request handler

**Current code:**
```javascript
const paymentCheck = await pool.query(
  'SELECT 1 FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
  [userId, 'succeeded']
);
const hasPaid = paymentCheck.rows.length > 0;
```

**Proposed abstraction:**
```javascript
// utils/database.js
async function hasSuccessfulPayment(userId) {
  const result = await pool.query(
    'SELECT 1 FROM payments WHERE user_id = $1 AND status = $2 LIMIT 1',
    [userId, 'succeeded']
  );
  return result.rows.length > 0;
}

async function getUserPayment(userId) {
  const result = await pool.query(
    'SELECT * FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
    [userId, 'succeeded']
  );
  return result.rows[0] || null;
}

// Usage:
const hasPaid = await hasSuccessfulPayment(userId);
const payment = await getUserPayment(userId);
```

**LOC saved:** 20 lines

---

## 2. ERROR HANDLING PATTERNS

### Pattern 2.1: Redirect with Error Message
**Occurrences:** 50+ times  
**Files:** All controllers

**Current code:**
```javascript
try {
  // ... logic
} catch (error) {
  console.error('Some error:', error);
  res.redirect('/dashboard?error=Action failed');
}
```

**Proposed abstraction:**
```javascript
// utils/response.js
function redirectWithSuccess(res, path, message) {
  res.redirect(`${path}?success=${encodeURIComponent(message)}`);
}

function redirectWithError(res, path, message) {
  console.error(`[${path}] Error:`, message);
  res.redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithMessage(res, path, message, type = 'message') {
  res.redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

// Usage:
try {
  // ... logic
  return redirectWithSuccess(res, '/dashboard', 'Server started successfully');
} catch (error) {
  return redirectWithError(res, '/dashboard', error.message);
}
```

**LOC saved:** 100 lines (2 lines per instance)

---

### Pattern 2.2: Async Handler Wrapper
**Occurrences:** 100+ try/catch blocks  
**Files:** All controllers

**Current code:**
```javascript
exports.someAction = async (req, res) => {
  try {
    // ... logic
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/dashboard?error=Failed');
  }
};
```

**Proposed abstraction:**
```javascript
// utils/asyncHandler.js
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('[AsyncHandler] Error:', error);
      
      // Default error handling
      if (res.headersSent) {
        return next(error);
      }
      
      // Determine redirect based on request context
      const redirectPath = req.path.includes('/admin') ? '/admin' : '/dashboard';
      return res.redirect(`${redirectPath}?error=${encodeURIComponent(error.message || 'Operation failed')}`);
    });
  };
}

// Usage:
exports.someAction = asyncHandler(async (req, res) => {
  // ... logic (no try/catch needed)
  redirectWithSuccess(res, '/dashboard', 'Action completed');
});
```

**LOC saved:** 300 lines (3 lines per instance)

---

## 3. SSH OPERATION PATTERNS

### Pattern 3.1: SSH Connection Setup
**Occurrences:** 5 times  
**Files:**
- serverController.js (4x) - deploy, enable SSL, database setup, env var injection

**Current code:**
```javascript
const conn = new Client();

await new Promise((resolve, reject) => {
  conn.on('ready', resolve);
  conn.on('error', (err) => {
    console.error(`SSH connection error:`, err.message);
    reject(err);
  });
  conn.connect({
    host: server.ip_address,
    port: 22,
    username: 'root',
    password: server.ssh_password,
    readyTimeout: 30000
  });
});
```

**Proposed abstraction:**
```javascript
// utils/ssh.js
const { Client } = require('ssh2');

async function createSSHConnection(server) {
  const conn = new Client();
  
  return new Promise((resolve, reject) => {
    conn.on('ready', () => resolve(conn));
    conn.on('error', (err) => {
      console.error(`[SSH] Connection error to ${server.ip_address}:`, err.message);
      reject(new Error(`SSH connection failed: ${err.message}`));
    });
    
    conn.connect({
      host: server.ip_address,
      port: 22,
      username: server.ssh_username || 'root',
      password: server.ssh_password,
      readyTimeout: 30000
    });
  });
}

async function executeSSHCommand(server, command) {
  const conn = await createSSHConnection(server);
  
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        conn.end();
        return reject(new Error(`Command execution failed: ${err.message}`));
      }
      
      let output = '';
      let errorOutput = '';
      
      stream.on('close', (code) => {
        conn.end();
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed (exit ${code}): ${errorOutput || output}`));
        }
      });
      
      stream.on('data', (data) => { output += data.toString(); });
      stream.stderr.on('data', (data) => { errorOutput += data.toString(); });
    });
  });
}

async function withSSHConnection(server, callback) {
  const conn = await createSSHConnection(server);
  try {
    return await callback(conn);
  } finally {
    conn.end();
  }
}

// Usage:
const result = await executeSSHCommand(server, 'uname -a');

// Or for multiple commands:
await withSSHConnection(server, async (conn) => {
  await execSSH(conn, 'cd /root && git clone ...');
  await execSSH(conn, 'cd /root/repo && npm install');
  return 'Success';
});
```

**LOC saved:** 80 lines (16 lines per instance)

---

### Pattern 3.2: Execute SSH Command (execSSH)
**Occurrences:** 50+ times  
**Files:**
- serverController.js - deployment functions

**Current code:**
```javascript
function execSSH(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      
      let output = '';
      let errorOutput = '';
      
      stream.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed: ${errorOutput}`));
        } else {
          resolve(output);
        }
      });
      
      stream.on('data', (data) => { output += data.toString(); });
      stream.stderr.on('data', (data) => { errorOutput += data.toString(); });
    });
  });
}
```

**Already good - move to utils/ssh.js and export:**
```javascript
// utils/ssh.js
module.exports = {
  createSSHConnection,
  executeSSHCommand,
  withSSHConnection,
  execSSH // Keep existing function
};
```

**LOC saved:** 0 (already abstracted, just needs central location)

---

## 4. VALIDATION PATTERNS

### Pattern 4.1: Domain Validation
**Occurrences:** 4 times  
**Files:**
- serverController.js (3x) - addDomain, enableSSL, isValidDomain function

**Current code:**
```javascript
function isValidDomain(domain) {
  if (!domain || domain.length > 253) return false;
  
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) return false;
  
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.length === 0) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }
  
  return true;
}
```

**Proposed abstraction:**
```javascript
// utils/validators.js
const validators = {
  domain: (domain) => {
    if (!domain || typeof domain !== 'string' || domain.length > 253) {
      return { valid: false, error: 'Domain must be 1-253 characters' };
    }
    
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return { valid: false, error: 'Invalid domain format' };
    }
    
    const labels = domain.split('.');
    for (const label of labels) {
      if (label.length > 63 || label.length === 0) {
        return { valid: false, error: 'Domain label too long (max 63 chars)' };
      }
      if (label.startsWith('-') || label.endsWith('-')) {
        return { valid: false, error: 'Domain labels cannot start/end with hyphen' };
      }
    }
    
    return { valid: true };
  },
  
  gitUrl: (url) => {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Git URL is required' };
    }
    
    const trustedHosts = ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org', 'sr.ht'];
    const isValid = trustedHosts.some(host => url.includes(host));
    
    if (!isValid) {
      return { valid: false, error: 'Only GitHub, GitLab, Bitbucket, Codeberg, and SourceHut are supported' };
    }
    
    const privateIpPattern = /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i;
    if (privateIpPattern.test(url)) {
      return { valid: false, error: 'Cannot deploy from private IP addresses' };
    }
    
    return { valid: true };
  },
  
  envKey: (key) => {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Key is required' };
    }
    
    const keyRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!keyRegex.test(key)) {
      return { valid: false, error: 'Invalid key format. Use uppercase letters, numbers, and underscores (e.g., DATABASE_URL)' };
    }
    
    if (key.length > 64) {
      return { valid: false, error: 'Key too long (max 64 characters)' };
    }
    
    return { valid: true };
  }
};

function validate(validator, value) {
  const result = validators[validator](value);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return true;
}

// Usage:
const { valid, error } = validators.domain(domain);
if (!valid) {
  return redirectWithError(res, '/dashboard', error);
}

// Or:
try {
  validate('domain', domain);
  validate('gitUrl', gitUrl);
} catch (err) {
  return redirectWithError(res, '/dashboard', err.message);
}

module.exports = { validators, validate };
```

**LOC saved:** 60 lines

---

### Pattern 4.2: Git URL Validation
**Occurrences:** 2 times  
**Files:**
- serverController.js (2x) - deploy function

**Already covered in Pattern 4.1 above.**

---

## 5. DIGITALOCEAN API PATTERNS

### Pattern 5.1: Destroy Droplet by ID
**Occurrences:** 5 times  
**Files:**
- serverController.js (1x) - deleteServer
- adminController.js (1x) - destroyDroplet
- paymentController.js (1x) - webhook refund
- services/digitalocean.js (2x) - createRealServer, destroyDroplet

**Current code:**
```javascript
await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
  headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
});
```

**Proposed abstraction:**
```javascript
// services/digitalocean.js
const DO_API_BASE = 'https://api.digitalocean.com/v2';

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

async function doRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${DO_API_BASE}${endpoint}`,
    headers: getAuthHeaders()
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    return await axios(config);
  } catch (error) {
    console.error(`[DO API] ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function destroyDropletById(dropletId) {
  try {
    await doRequest('delete', `/droplets/${dropletId}`);
    console.log(`Destroyed droplet ${dropletId}`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`Droplet ${dropletId} already deleted`);
      return true;
    }
    throw error;
  }
}

async function getDropletById(dropletId) {
  const response = await doRequest('get', `/droplets/${dropletId}`);
  return response.data.droplet;
}

async function createDroplet(config) {
  const response = await doRequest('post', '/droplets', config);
  return response.data.droplet;
}

async function listDroplets(tagName = null) {
  const endpoint = tagName ? `/droplets?tag_name=${tagName}` : '/droplets';
  const response = await doRequest('get', endpoint);
  return response.data.droplets;
}

async function performDropletAction(dropletId, action) {
  await doRequest('post', `/droplets/${dropletId}/actions`, { type: action });
  console.log(`Action '${action}' sent to droplet ${dropletId}`);
}

// Usage:
await destroyDropletById(dropletId);
await performDropletAction(dropletId, 'power_off');
const droplet = await getDropletById(dropletId);
const droplets = await listDroplets('basement-server');
```

**LOC saved:** 50 lines

---

### Pattern 5.2: Get Droplets by Tag
**Occurrences:** 3 times  
**Files:**
- serverController.js (1x) - deleteServer
- services/digitalocean.js (1x) - syncDigitalOceanDroplets

**Already covered in Pattern 5.1 above** - `listDroplets('basement-server')`

---

## 6. DEPLOYMENT UPDATE PATTERNS

### Pattern 6.1: Update Deployment Output
**Occurrences:** 20+ times  
**Files:**
- serverController.js - all deployment functions

**Current code:**
```javascript
await pool.query(
  'UPDATE deployments SET output = $1, status = $2, deployed_at = CASE WHEN $2 = \'success\' THEN NOW() ELSE deployed_at END WHERE id = $3',
  [output, status, deploymentId]
);
```

**Proposed abstraction:**
```javascript
// utils/deployment.js
async function updateDeploymentOutput(deploymentId, output, status = null) {
  const sanitized = String(output).slice(0, 50000); // Prevent excessive DB growth
  
  const query = status
    ? `UPDATE deployments SET output = $1, status = $2, deployed_at = CASE WHEN $2 = 'success' THEN NOW() ELSE deployed_at END WHERE id = $3`
    : `UPDATE deployments SET output = $1 WHERE id = $2`;
  
  const params = status ? [sanitized, status, deploymentId] : [sanitized, deploymentId];
  
  try {
    await pool.query(query, params);
  } catch (error) {
    console.error(`[Deploy] Failed to update deployment #${deploymentId}:`, error.message);
  }
}

async function createDeployment(serverId, userId, gitUrl) {
  const result = await pool.query(
    'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [serverId, userId, gitUrl, 'pending', 'Starting deployment...']
  );
  return result.rows[0].id;
}

async function failDeployment(deploymentId, error) {
  const output = `❌ Deployment failed: ${error.message}\n\nStack trace:\n${error.stack}`;
  await updateDeploymentOutput(deploymentId, output, 'failed');
}

async function succeedDeployment(deploymentId, output) {
  await updateDeploymentOutput(deploymentId, output + '\n✅ Deployment complete!', 'success');
}

// Usage:
const deploymentId = await createDeployment(server.id, userId, gitUrl);

try {
  output += '✓ Step completed\n';
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // ... more steps
  
  await succeedDeployment(deploymentId, output);
} catch (error) {
  await failDeployment(deploymentId, error);
}
```

**LOC saved:** 40 lines

---

## 7. STRIPE PATTERNS

### Pattern 7.1: Lazy Stripe Initialization
**Occurrences:** Used correctly already  
**Files:**
- paymentController.js

**Current code (GOOD):**
```javascript
let stripe;
const getStripe = () => {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
};
```

**Keep as is** - this is already DRY.

---

### Pattern 7.2: Create Refund
**Occurrences:** 2 times  
**Files:**
- services/digitalocean.js (1x) - createRealServer failure
- paymentController.js (1x) - webhook handling

**Proposed abstraction:**
```javascript
// services/stripe.js
let stripe;
function getStripe() {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

async function createRefund(paymentIntentId, reason = 'requested_by_customer') {
  try {
    const refund = await getStripe().refunds.create({
      payment_intent: paymentIntentId,
      reason
    });
    
    // Update payment record
    await pool.query(
      'UPDATE payments SET status = $1 WHERE stripe_payment_id = $2',
      ['refunded', paymentIntentId]
    );
    
    console.log(`Refund issued for ${paymentIntentId}`);
    return refund;
  } catch (error) {
    console.error(`Failed to refund ${paymentIntentId}:`, error.message);
    throw error;
  }
}

module.exports = { getStripe, createRefund };
```

**LOC saved:** 20 lines

---

## 8. HTML RESPONSE PATTERNS

### Pattern 8.1: Simple Error Pages
**Occurrences:** 5 times  
**Files:**
- authController.js (3x) - validation errors, terms error
- pagesController.js (1x) - contact form errors

**Current code:**
```javascript
return res.status(400).send(`
  <h1 style="color: #88FE00;">Validation Error</h1>
  <ul>${errorMessages.map(msg => `<li>${msg}</li>`).join('')}</ul>
  <a href="/register" style="color: #88FE00;">Go back</a>
`);
```

**Proposed abstraction:**
```javascript
// utils/response.js
const { getHTMLHead, getFooter, getScripts, getResponsiveNav, escapeHtml } = require('../helpers');

function renderErrorPage(title, message, backLink = '/', statusCode = 400) {
  const html = `
${getHTMLHead(title)}
  <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-red-500/30 rounded p-6">
      <h1 class="text-2xl font-bold text-red-400 text-center mb-4">${escapeHtml(title)}</h1>
      <p class="text-gray-300 text-center mb-6">${escapeHtml(message)}</p>
      <a href="${backLink}" class="block w-full py-2.5 bg-blue-600 text-white font-bold rounded text-center hover:bg-blue-500 transition-all">
        Go Back
      </a>
    </div>
  </main>
${getFooter()}
${getScripts('nav.js')}
  `;
  
  return { html, statusCode };
}

function sendErrorPage(res, title, message, backLink = '/', statusCode = 400) {
  const { html, statusCode: code } = renderErrorPage(title, message, backLink, statusCode);
  res.status(code).send(html);
}

// Usage:
if (!errors.isEmpty()) {
  const errorMessages = errors.array().map(err => escapeHtml(err.msg)).join(', ');
  return sendErrorPage(res, 'Validation Error', errorMessages, '/register');
}
```

**LOC saved:** 25 lines

---

## PROPOSED FILE STRUCTURE

```
server-ui/
├── utils/
│   ├── database.js          # Pattern 1.1, 1.2, 1.3 (getUserServer, verifyOwnership, hasSuccessfulPayment)
│   ├── response.js          # Pattern 2.1, 8.1 (redirectWithError, sendErrorPage)
│   ├── asyncHandler.js      # Pattern 2.2 (async error wrapper)
│   ├── ssh.js               # Pattern 3.1, 3.2 (createSSHConnection, executeSSHCommand)
│   ├── validators.js        # Pattern 4.1 (domain, gitUrl, envKey)
│   ├── deployment.js        # Pattern 6.1 (updateDeploymentOutput, createDeployment)
│   └── stripe.js            # Pattern 7.2 (createRefund, getStripe)
├── services/
│   └── digitalocean.js      # Pattern 5.1 (refactored with doRequest, destroyDropletById)
```

---

## IMPLEMENTATION PRIORITY

### Phase 1: High Impact (Immediate) - 400 LOC saved
1. **asyncHandler wrapper** (Pattern 2.2) - 300 lines saved
2. **redirectWithError** (Pattern 2.1) - 100 lines saved

### Phase 2: Medium Impact (Week 1) - 200 LOC saved
3. **getUserServer** (Pattern 1.1) - 45 lines saved
4. **SSH utilities** (Pattern 3.1) - 80 lines saved
5. **DigitalOcean abstraction** (Pattern 5.1) - 50 lines saved
6. **Validators** (Pattern 4.1) - 60 lines saved

### Phase 3: Low Impact (Week 2) - 145 LOC saved
7. **verifyOwnership** (Pattern 1.2) - 40 lines saved
8. **hasSuccessfulPayment** (Pattern 1.3) - 20 lines saved
9. **updateDeploymentOutput** (Pattern 6.1) - 40 lines saved
10. **createRefund** (Pattern 7.2) - 20 lines saved
11. **sendErrorPage** (Pattern 8.1) - 25 lines saved

---

## REFACTORING SAFETY CHECKLIST

- [ ] Create `utils/` directory
- [ ] Implement one utility file at a time
- [ ] Write unit tests for each utility
- [ ] Refactor one controller at a time
- [ ] Test thoroughly after each change
- [ ] Git commit after each successful refactor
- [ ] Keep backup of original code

---

## TESTING STRATEGY

1. **Unit tests** for utils/ functions (Jest)
2. **Integration tests** for controller changes
3. **E2E tests** for critical flows (payment, deployment)
4. **Manual smoke tests** after each phase

---

## ESTIMATED TIMELINE

- **Phase 1:** 2-3 hours (asyncHandler + redirect helpers)
- **Phase 2:** 4-6 hours (database + SSH + DO + validators)
- **Phase 3:** 2-3 hours (remaining patterns)

**Total:** 8-12 hours for complete refactoring

---

## BENEFITS SUMMARY

**Code quality:**
- 40% reduction in code duplication
- Centralized error handling
- Consistent validation logic
- Easier testing (isolated functions)

**Maintainability:**
- Single source of truth for patterns
- Easier to update (change once, apply everywhere)
- Self-documenting code (function names explain intent)

**Developer experience:**
- Faster feature development
- Reduced cognitive load
- Fewer bugs from copy-paste errors

---

**Next step:** Implement Phase 1 (asyncHandler + redirectWithError) and measure impact.

# Feb 2, 2026 Features - Saved for Re-implementation

These features were built on Feb 2 but had bugs. Use this as reference to rebuild them properly.

---

## Feature 1: GitHub Auto-Deploy Webhooks
**Original commit:** `1d77ca0`

### What it does:
- When user pushes to GitHub, webhook triggers auto-deploy
- Webhook URL: `/webhook/github/:serverId` (server-wide) or `/webhook/github/:serverId/:domainId` (per-domain)
- Verifies GitHub signature with HMAC SHA-256
- Only deploys on push to main/master branch

### Key files:
- `githubWebhookController.js` - Full webhook handler
- `migrations/017-add-github-webhook.js` - Adds columns to servers table:
  - `auto_deploy_enabled` (boolean)
  - `github_webhook_secret` (varchar)

### Database changes needed:
```sql
ALTER TABLE servers ADD COLUMN auto_deploy_enabled BOOLEAN DEFAULT false;
ALTER TABLE servers ADD COLUMN github_webhook_secret VARCHAR(255);
```

### Routes to add in index.js:
```javascript
// GitHub webhook - needs raw body for signature verification
const githubWebhookMiddleware = express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
});

app.post('/webhook/github/:serverId', githubWebhookMiddleware, githubWebhookController.githubWebhook);
app.post('/webhook/github/:serverId/:domainId', githubWebhookMiddleware, githubWebhookController.githubWebhook);
```

---

## Feature 2: Multi-Site Per Server
**Original commit:** `66eba59`

### What it does:
- Each plan has domain limits (Basic: 2, Pro: 5, Premium: 10)
- Users can add multiple domains to one server
- Each domain can have its own Git repo and deployment
- Per-domain auto-deploy webhooks

### Key files:
- `migrations/016-add-domain-deployment-fields.js` - Adds to domains table:
  - `git_url` (varchar)
  - `auto_deploy_enabled` (boolean)
  - `webhook_secret` (varchar)
  - `deployment_status` (varchar)
  - `last_deployed_at` (timestamp)
- `migrations/017-add-deployments-domain-id.js` - Adds `domain_id` to deployments table

### Database changes needed:
```sql
ALTER TABLE domains ADD COLUMN git_url VARCHAR(500);
ALTER TABLE domains ADD COLUMN auto_deploy_enabled BOOLEAN DEFAULT false;
ALTER TABLE domains ADD COLUMN webhook_secret VARCHAR(255);
ALTER TABLE domains ADD COLUMN deployment_status VARCHAR(50) DEFAULT 'not_deployed';
ALTER TABLE domains ADD COLUMN last_deployed_at TIMESTAMP;

ALTER TABLE deployments ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;
```

### constants.js changes:
```javascript
const PLAN_LIMITS = {
  basic: { sites: 2 },
  pro: { sites: 5 },
  premium: { sites: 10 }
};
```

---

## Feature 3: Cleanup Previous Deployment
**Original commit:** `40a23fa`

### What it does:
- Before deploying, stops any old PM2/systemd services
- Resets nginx config to clean state
- Prevents conflicts between old and new deployments

### Key function in serverController.js:
```javascript
async function cleanupPreviousDeployment(conn, output, deploymentId, targetDomain = null) {
  // 1. Stop PM2 processes
  // 2. Disable/stop systemd services  
  // 3. Remove old app directories
  // 4. Reset nginx config
  // 5. Reload nginx
}
```

---

## Feature 4: Extract Domains from Default Config
**Original commit:** `bd56675`

### What it does:
- Reads nginx default config to find existing domain blocks
- Handles certbot-merged configs (SSL blocks in default file)
- Preserves domain configurations during cleanup

### Key function:
```javascript
async function extractDomainsFromDefaultConfig(conn) {
  // Parses nginx config to find server_name directives
  // Returns array of { domain, hasSSL } objects
}
```

---

## Known Bugs to Fix When Re-implementing

### Bug 1: SSL breaks static sites (FIXED)
**Location:** `serverController.js` enableSSL function
**Problem:** After SSL cert, code ran `sed` to add `proxy_pass http://127.0.0.1:3000` - broke static sites
**Fix:** Remove the `fixProxyCmd` block. SSL should NOT modify proxy settings.

### Bug 2: Deployment status constraint
**Problem:** Code used `'in-progress'` but DB only allows `'pending', 'deploying', 'success', 'failed'`
**Fix:** Use `'deploying'` instead of `'in-progress'`

---

## Re-implementation Order

1. **First:** Add database columns (migrations)
2. **Second:** Add cleanup function (prevents deployment conflicts)
3. **Third:** Add multi-site support (domain limits, per-domain deploys)
4. **Fourth:** Add GitHub webhooks (auto-deploy on push)
5. **Test each step** before moving to next

---

## Files Saved

- `githubWebhookController.js` - Complete webhook handler
- `serverController.js` - All deployment logic (with bugs fixed)
- `dashboardController.js` - UI for domains/deployments
- `index.js` - Routes configuration
- `constants.js` - Plan limits
- `016-add-domain-deployment-fields.js` - Domain columns migration
- `017-add-deployments-domain-id.js` - Deployments domain_id migration
- `017-add-github-webhook.js` - Server webhook columns migration

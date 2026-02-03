/**
 * GitHub Webhook Controller
 * Handles auto-deploy on git push (server-wide or per-domain)
 */

const crypto = require('crypto');
const pool = require('../db');

// Import deployment functions from serverController
const { triggerAutoDeploy, triggerDomainAutoDeploy } = require('./serverController');

/**
 * Verify GitHub webhook signature
 * Uses HMAC SHA-256 with the webhook secret
 */
function verifyGitHubSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    return false;
  }
}

/**
 * POST /webhook/github/:serverId
 * POST /webhook/github/:serverId/:domainId (for per-domain webhooks)
 * Receives push events from GitHub and triggers auto-deploy
 */
exports.githubWebhook = async (req, res) => {
  const serverId = req.params.serverId;
  const domainId = req.params.domainId; // Optional - for per-domain webhooks
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  
  console.log(`[GITHUB WEBHOOK] Received ${event} event for server ${serverId}${domainId ? `, domain ${domainId}` : ''}`);
  
  // Only process push events
  if (event !== 'push') {
    console.log(`[GITHUB WEBHOOK] Ignoring ${event} event (only push supported)`);
    return res.status(200).json({ message: 'Event ignored', event });
  }
  
  try {
    // Get server info
    const serverResult = await pool.query(
      `SELECT s.*, u.email as user_email 
       FROM servers s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [serverId]
    );
    
    if (serverResult.rows.length === 0) {
      console.log(`[GITHUB WEBHOOK] Server ${serverId} not found`);
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const server = serverResult.rows[0];
    
    // Extract payload info
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.log(`[GITHUB WEBHOOK] No raw body available for signature verification`);
      return res.status(400).json({ error: 'Missing request body' });
    }
    
    const payload = req.body;
    const repoUrl = payload.repository?.html_url || payload.repository?.clone_url;
    const branch = payload.ref?.replace('refs/heads/', '');
    const pusher = payload.pusher?.name || 'unknown';
    const commits = payload.commits?.length || 0;
    
    console.log(`[GITHUB WEBHOOK] Push to ${repoUrl} (${branch}) by ${pusher} - ${commits} commits`);
    
    // Only deploy main/master branch
    if (branch !== 'main' && branch !== 'master') {
      console.log(`[GITHUB WEBHOOK] Ignoring push to ${branch} branch`);
      return res.status(200).json({ message: `Ignored push to ${branch} branch` });
    }
    
    // DOMAIN-SPECIFIC WEBHOOK
    if (domainId) {
      // Get domain info
      const domainResult = await pool.query(
        `SELECT * FROM domains WHERE id = $1 AND server_id = $2`,
        [domainId, serverId]
      );
      
      if (domainResult.rows.length === 0) {
        console.log(`[GITHUB WEBHOOK] Domain ${domainId} not found for server ${serverId}`);
        return res.status(404).json({ error: 'Domain not found' });
      }
      
      const domain = domainResult.rows[0];
      
      // Check if auto-deploy is enabled for this domain
      if (!domain.auto_deploy_enabled) {
        console.log(`[GITHUB WEBHOOK] Auto-deploy disabled for domain ${domain.domain}`);
        return res.status(200).json({ message: 'Auto-deploy is disabled for this domain' });
      }
      
      // Verify signature with domain's webhook secret
      if (!verifyGitHubSignature(rawBody, signature, domain.webhook_secret)) {
        console.log(`[GITHUB WEBHOOK] Invalid signature for domain ${domain.domain}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Use domain's git URL
      const gitUrl = domain.git_url;
      if (!gitUrl) {
        console.log(`[GITHUB WEBHOOK] No git URL linked to domain ${domain.domain}`);
        return res.status(400).json({ error: 'No git URL linked to this domain' });
      }
      
      // Trigger domain-specific deployment
      console.log(`[GITHUB WEBHOOK] Triggering auto-deploy for domain ${domain.domain}: ${gitUrl}`);
      
      const result = await triggerDomainAutoDeploy(server, domain, gitUrl, `Auto-deploy: ${commits} commit(s) by ${pusher}`);
      
      return res.status(200).json({ 
        message: 'Domain deployment triggered',
        deploymentId: result.deploymentId,
        domain: domain.domain,
        gitUrl,
        branch,
        commits
      });
    }
    
    // SERVER-WIDE WEBHOOK (legacy)
    // Check if auto-deploy is enabled for the server
    if (!server.auto_deploy_enabled) {
      console.log(`[GITHUB WEBHOOK] Auto-deploy disabled for server ${serverId}`);
      return res.status(200).json({ message: 'Auto-deploy is disabled' });
    }
    
    // Verify signature using server's webhook secret
    if (!verifyGitHubSignature(rawBody, signature, server.github_webhook_secret)) {
      console.log(`[GITHUB WEBHOOK] Invalid signature for server ${serverId}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Check if this repo URL matches a previous deployment
    const deploymentCheck = await pool.query(
      `SELECT git_url FROM deployments 
       WHERE server_id = $1 
       ORDER BY deployed_at DESC 
       LIMIT 1`,
      [serverId]
    );
    
    let gitUrl = repoUrl;
    if (deploymentCheck.rows.length > 0) {
      // Use the stored git URL (may have .git suffix)
      gitUrl = deploymentCheck.rows[0].git_url;
    }
    
    if (!gitUrl) {
      console.log(`[GITHUB WEBHOOK] No git URL found for server ${serverId}`);
      return res.status(400).json({ error: 'No previous deployment found' });
    }
    
    // Trigger the server-wide deployment (legacy)
    console.log(`[GITHUB WEBHOOK] Triggering server-wide auto-deploy for ${gitUrl}`);
    
    const result = await triggerAutoDeploy(server, gitUrl, `Auto-deploy: ${commits} commit(s) by ${pusher}`);
    
    res.status(200).json({ 
      message: 'Deployment triggered',
      deploymentId: result.deploymentId,
      gitUrl,
      branch,
      commits
    });
    
  } catch (error) {
    console.error(`[GITHUB WEBHOOK] Error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /enable-auto-deploy
 * Generates webhook secret and enables auto-deploy for a server
 */
exports.enableAutoDeploy = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }
    
    const server = serverResult.rows[0];
    
    // Generate webhook secret if not exists
    let webhookSecret = server.github_webhook_secret;
    if (!webhookSecret) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
    }
    
    // Enable auto-deploy and store secret
    await pool.query(
      `UPDATE servers 
       SET github_webhook_secret = $1, auto_deploy_enabled = true 
       WHERE id = $2`,
      [webhookSecret, server.id]
    );
    
    console.log(`[AUTO-DEPLOY] Enabled for server ${server.id} (user ${userId})`);
    
    res.redirect('/dashboard?success=Auto-deploy enabled! Add the webhook URL to your GitHub repository.');
    
  } catch (error) {
    console.error('[AUTO-DEPLOY] Enable error:', error);
    res.redirect('/dashboard?error=Failed to enable auto-deploy');
  }
};

/**
 * POST /disable-auto-deploy
 * Disables auto-deploy for a server
 */
exports.disableAutoDeploy = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    await pool.query(
      `UPDATE servers 
       SET auto_deploy_enabled = false 
       WHERE user_id = $1`,
      [userId]
    );
    
    console.log(`[AUTO-DEPLOY] Disabled for user ${userId}`);
    
    res.redirect('/dashboard?success=Auto-deploy disabled');
    
  } catch (error) {
    console.error('[AUTO-DEPLOY] Disable error:', error);
    res.redirect('/dashboard?error=Failed to disable auto-deploy');
  }
};

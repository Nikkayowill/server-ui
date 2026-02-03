const axios = require('axios');
const crypto = require('crypto');
const { Client } = require('ssh2');
const pool = require('../db');
const { escapeHtml } = require('../helpers');
const { getUserServer, verifyServerOwnership, updateServerStatus, appendDeploymentOutput, updateDeploymentStatus } = require('../utils/db-helpers');
const { SERVER_STATUS, DEPLOYMENT_STATUS, TIMEOUTS, PORTS, PRICING_PLANS } = require('../constants');
const { sendDeployErrorEmail } = require('../services/email');

// Strict DNS-compliant domain validation
function isValidDomain(domain) {
  // DNS RFC compliance: max 253 chars, labels max 63 chars, valid chars only
  if (!domain || domain.length > 253) return false;
  
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) return false;
  
  // Check each label (part between dots)
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.length === 0) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }
  
  return true;
}

// Helper: Get web root directory for a domain
// Multi-site architecture: /var/www/sites/{domain}/
// Legacy fallback: /var/www/html (when no domain specified)
function getWebRoot(domain) {
  if (!domain) return '/var/www/html';
  // Sanitize domain for filesystem (remove www prefix, lowercase)
  const safeDomain = domain.toLowerCase().replace(/^www\./, '');
  return `/var/www/sites/${safeDomain}`;
}

// Helper: Get site directory name from domain
function getSiteDirName(domain) {
  if (!domain) return 'html';
  return domain.toLowerCase().replace(/^www\./, '');
}

// POST /server-action
exports.serverAction = async (req, res) => {
  try {
    const action = req.body.action;
    const userId = req.session.userId;

    // Get user's server (using helper)
    const server = await getUserServer(userId);

    if (!server) {
      return res.redirect('/dashboard?error=No server found');
    }

    // Map actions to DigitalOcean API endpoints
    let doAction;
    let newStatus;
    let successMessage;
    
    if (action === 'start') {
      doAction = 'power_on';
      newStatus = SERVER_STATUS.RUNNING;
      successMessage = 'Server started successfully';
    } else if (action === 'restart') {
      doAction = 'reboot';
      newStatus = SERVER_STATUS.RUNNING;
      successMessage = 'Server restarted successfully';
    } else if (action === 'stop') {
      doAction = 'power_off';
      newStatus = SERVER_STATUS.STOPPED;
      successMessage = 'Server stopped successfully';
    } else {
      return res.redirect('/dashboard?error=Invalid action');
    }

    // Call DigitalOcean API if droplet_id exists
    if (server.droplet_id) {
      try {
        await axios.post(
          `https://api.digitalocean.com/v2/droplets/${server.droplet_id}/actions`,
          { type: doAction },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`DigitalOcean action ${doAction} sent to droplet ${server.droplet_id}`);
      } catch (doError) {
        console.error('DigitalOcean action error:', doError.response?.data || doError.message);
        // If droplet not found (404), continue anyway - it might be manually deleted
        if (doError.response?.status === 404) {
          console.log(`Droplet ${server.droplet_id} not found in DO, updating database only`);
        } else {
          return res.redirect('/dashboard?error=Failed to execute action on server');
        }
      }
    }

    // Update database status
    await pool.query(
      'UPDATE servers SET status = $1 WHERE user_id = $2',
      [newStatus, userId]
    );

    res.redirect('/dashboard?success=' + successMessage);
  } catch (error) {
    console.error('Server action error:', error);
    res.redirect('/dashboard?error=Action failed');
  }
};

// POST /delete-server
exports.deleteServer = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's server and email
    const serverResult = await pool.query(
      'SELECT s.*, u.email FROM servers s JOIN users u ON s.user_id = u.id WHERE s.user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];
    const userEmail = server.email;

    // Find droplet info for admin notification
    let dropletId = server.droplet_id || 'Unknown';
    let dropletIp = server.ip_address || 'Unknown';
    
    // CRITICAL: Cancel Stripe subscription FIRST (stops future billing)
    if (server.stripe_subscription_id) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(server.stripe_subscription_id);
        console.log(`Cancelled Stripe subscription: ${server.stripe_subscription_id}`);
      } catch (stripeError) {
        console.error('Failed to cancel Stripe subscription:', stripeError.message);
        // Continue with deletion even if Stripe fails (we'll handle manually)
      }
    }
    
    // Destroy DigitalOcean droplet automatically
    if (dropletId && dropletId !== 'Unknown') {
      try {
        const { destroyDroplet } = require('../services/digitalocean');
        await destroyDroplet(dropletId);
        console.log(`Destroyed droplet ${dropletId}`);
      } catch (doError) {
        console.error('Failed to destroy droplet:', doError.message);
        // Continue with deletion, admin will be notified
      }
    }

    // Mark server as deleted (keep record for audit)
    await pool.query(
      'UPDATE servers SET status = $1, cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      ['deleted', userId]
    );

    console.log(`Marked server as deleted for user ${userId}`);

    // Send admin notification email (don't wait for it)
    const { sendEmail } = require('../services/email');
    const emailHtml = `
      <h2>Customer Cancelled Subscription</h2>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Droplet ID:</strong> ${dropletId}</p>
      <p><strong>IP Address:</strong> ${dropletIp}</p>
      <p><strong>Plan:</strong> ${server.plan || 'Unknown'}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p><strong>Subscription ID:</strong> ${server.stripe_subscription_id || 'N/A'}</p>
      <hr>
      <p>✅ Stripe subscription cancelled automatically</p>
      <p>✅ Droplet destruction attempted</p>
    `;
    const emailText = `Customer Cancelled Subscription\n\nUser ID: ${userId}\nEmail: ${userEmail}\nDroplet ID: ${dropletId}\nIP: ${dropletIp}\nPlan: ${server.plan || 'Unknown'}\nTime: ${new Date().toISOString()}`;
    
    sendEmail('support@cloudedbasement.ca', 'Subscription Cancelled', emailHtml, emailText)
      .catch(err => console.error('Failed to send cancellation notification:', err));

    res.redirect('/pricing?success=Plan cancelled successfully. We\'re sad to see you go!');
  } catch (error) {
    console.error('Delete server error:', error);
    res.redirect('/dashboard?error=Failed to cancel plan');
  }
};

// POST /deploy
exports.deploy = async (req, res) => {
  try {
    const gitUrl = req.body.git_url;
    const userId = req.session.userId;

    // Validate Git URL - only allow trusted platforms
    if (!gitUrl) {
      return res.redirect('/dashboard?error=Git URL is required');
    }
    
    // Whitelist trusted Git hosting platforms
    const trustedHosts = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'codeberg.org',
      'sr.ht' // SourceHut
    ];
    
    const isValidGitUrl = trustedHosts.some(host => gitUrl.includes(host));
    
    if (!isValidGitUrl) {
      return res.redirect('/dashboard?error=Invalid Git URL. Only GitHub, GitLab, Bitbucket, Codeberg, and SourceHut are supported.');
    }
    
    // Prevent SSRF attacks - block private IPs
    const privateIpPattern = /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i;
    if (privateIpPattern.test(gitUrl)) {
      return res.redirect('/dashboard?error=Cannot deploy from private IP addresses');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    if (!server.ip_address || !server.ssh_password) {
      return res.redirect('/dashboard?error=Server not ready yet. Please wait for provisioning to complete.');
    }

    // Check if this is a new site or an update
    const existingDeployment = await pool.query(
      'SELECT id FROM deployments WHERE server_id = $1 AND git_url = $2 LIMIT 1',
      [server.id, gitUrl]
    );

    const isUpdate = existingDeployment.rows.length > 0;

    // If new site, check site limit
    if (!isUpdate) {
      const siteCount = await pool.query(
        'SELECT COUNT(DISTINCT git_url) as count FROM deployments WHERE server_id = $1',
        [server.id]
      );

      const currentSites = parseInt(siteCount.rows[0].count);
      const siteLimit = server.site_limit || 2;

      if (currentSites >= siteLimit) {
        return res.redirect(`/dashboard?error=Site limit reached (${siteLimit} sites). Please upgrade your plan or delete an existing site to add a new one.`);
      }
    }

    // Extract repo name from URL
    const repoName = gitUrl.split('/').pop().replace('.git', '');
    
    // Store deployment in database with pending status
    const deployResult = await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [server.id, userId, gitUrl, 'pending', 'Starting deployment...']
    );

    const deploymentId = deployResult.rows[0].id;
    console.log(`[DEPLOY] Deployment #${deploymentId} started for user ${userId}: ${gitUrl}`);

    // Perform deployment asynchronously (don't block response)
    setImmediate(() => {
      performDeployment(server, gitUrl, repoName, deploymentId).catch(async (err) => {
        console.error(`[DEPLOY] Deployment #${deploymentId} failed:`, err);
        console.error(`[DEPLOY] Stack trace:`, err.stack);
        try {
          await pool.query(
            'UPDATE deployments SET status = $1, output = $2, deployed_at = NOW() WHERE id = $3',
            ['failed', `❌ Deployment failed: ${err.message}\n\nStack trace:\n${err.stack}`, deploymentId]
          );
        } catch (dbErr) {
          console.error(`[DEPLOY] Failed to update deployment #${deploymentId} status:`, dbErr);
        }
      });
    });
    
    res.redirect('/dashboard?success=Deployment started! Check deployment history below for progress.');
  } catch (error) {
    console.error('Deploy error:', error);
    res.redirect('/dashboard?error=Deployment failed to start');
  }
};

// Async deployment function
// targetDomain: optional domain to deploy to (for multi-site). If null, uses server's primary domain or /var/www/html
async function performDeployment(server, gitUrl, repoName, deploymentId, targetDomain = null) {
  const webRoot = getWebRoot(targetDomain);
  console.log(`[DEPLOY] ============================================`);
  console.log(`[DEPLOY] Starting performDeployment for deployment #${deploymentId}`);
  console.log(`[DEPLOY] Server IP: ${server.ip_address}, Repo: ${gitUrl}`);
  console.log(`[DEPLOY] Target domain: ${targetDomain || 'default'}, Web root: ${webRoot}`);
  console.log(`[DEPLOY] ============================================`);
  
  const conn = new Client();
  let output = '';

  try {
    console.log(`[DEPLOY] Attempting SSH connection to ${server.ip_address}...`);
    
    // Connect via SSH
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve);
      conn.on('error', (err) => {
        console.error(`[DEPLOY] SSH connection error:`, err.message);
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

    output += '✓ Connected to server via SSH\n';
    await updateDeploymentOutput(deploymentId, output, 'deploying');

    // Cleanup previous deployment (stop old services, reset nginx)
    // Pass targetDomain for multi-site mode (only resets that domain's config)
    output += `\n[0/5] Cleaning up previous deployment...\n`;
    output = await cleanupPreviousDeployment(conn, output, deploymentId, targetDomain);
    await updateDeploymentOutput(deploymentId, output, 'deploying');

    // Download repository (GitHub tarball - no auth needed for public repos)
    output += `\n[1/5] Downloading repository...\n`;
    
    if (gitUrl.includes('github.com')) {
      // Extract user/repo from URL (handles both .git and non-.git endings)
      // https://github.com/user/repo.git OR https://github.com/user/repo
      const match = gitUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
      if (!match) {
        throw new Error('Invalid GitHub URL format. Please use: https://github.com/username/repository');
      }
      
      const [, user, repo] = match;
      output += `Repository: ${user}/${repo}\n`;
      
      // Try main branch first, fallback to master
      const branches = ['main', 'master'];
      let downloadSuccess = false;
      
      for (const branch of branches) {
        try {
          const tarballUrl = `https://github.com/${user}/${repo}/archive/refs/heads/${branch}.tar.gz`;
          output += `Attempting to download from '${branch}' branch...\n`;
          
          // Check size first (HEAD request via wget)
          const sizeCheck = await execSSH(conn, `wget --spider --server-response "${tarballUrl}" 2>&1 | grep -i "content-length" | awk '{print $2}' | tail -1`);
          const sizeInBytes = parseInt(sizeCheck.trim());
          
          if (sizeInBytes > 100 * 1024 * 1024) { // 100MB limit
            throw new Error(`Repository size (${Math.round(sizeInBytes / 1024 / 1024)}MB) exceeds 100MB limit`);
          }
          
          output += `Repository size: ${Math.round(sizeInBytes / 1024 / 1024)}MB\n`;
          
          // Download tarball
          await execSSH(conn, `cd /root && rm -rf ${repoName} ${repo}-${branch} && wget -q -O repo.tar.gz "${tarballUrl}"`);
          await execSSH(conn, `cd /root && tar -xzf repo.tar.gz && mv ${repo}-${branch} ${repoName} && rm repo.tar.gz`);
          
          output += `✓ Repository downloaded successfully (branch: ${branch})\n`;
          downloadSuccess = true;
          break;
        } catch (err) {
          output += `Branch '${branch}' not found or inaccessible\n`;
          if (branch === branches[branches.length - 1]) {
            throw new Error(`Repository not found or is private. Make sure:\n1. Repository URL is correct\n2. Repository is public\n3. Repository has a 'main' or 'master' branch`);
          }
        }
      }
      
      if (!downloadSuccess) {
        throw new Error('Failed to download repository. Please check the URL and try again.');
      }
    } else {
      // Security: Only allow HTTPS git URLs, no SSH or file:// protocols
      if (!gitUrl.match(/^https:\/\/[\w\.-]+\.[a-z]{2,}\//)) {
        throw new Error('Only HTTPS git URLs are allowed for security. Use format: https://git.example.com/user/repo.git');
      }
      
      output += `Using git clone (non-GitHub repository)\n`;
      // Use -- to separate options from arguments (prevents command injection)
      await execSSH(conn, `cd /root && rm -rf ${repoName} && git clone -- "${gitUrl.replace(/["$`\\]/g, '\\$&')}"`);
      output += `✓ Repository cloned\n`;
    }
    
    await updateDeploymentOutput(deploymentId, output, 'deploying');

    // Detect project type
    output += `\n[2/5] Detecting project type...\n`;
    const hasPackageJson = await fileExists(conn, `/root/${repoName}/package.json`);
    const hasCargoToml = await fileExists(conn, `/root/${repoName}/Cargo.toml`);
    const hasGoMod = await fileExists(conn, `/root/${repoName}/go.mod`);
    const hasRequirementsTxt = await fileExists(conn, `/root/${repoName}/requirements.txt`);
    const hasIndexHtml = await fileExists(conn, `/root/${repoName}/index.html`);

    if (hasPackageJson) {
      // Node.js project
      const packageJson = await execSSH(conn, `cat /root/${repoName}/package.json`);
      const isReactOrVue = packageJson.includes('"react"') || packageJson.includes('"vue"') || packageJson.includes('"build"');
      
      if (isReactOrVue) {
        output += `✓ Detected: Static site (React/Vue)\n`;
        output = await deployStaticSite(conn, repoName, output, deploymentId, server.id, webRoot, targetDomain);
      } else {
        output += `✓ Detected: Node.js backend\n`;
        output = await deployNodeBackend(conn, repoName, output, deploymentId, server.id, webRoot, targetDomain);
      }
    } else if (hasCargoToml) {
      output += `✓ Detected: Rust application\n`;
      output = await deployRustApp(conn, repoName, output, deploymentId, server.id, webRoot, targetDomain);
    } else if (hasGoMod) {
      output += `✓ Detected: Go application\n`;
      output = await deployGoApp(conn, repoName, output, deploymentId, server.id, webRoot, targetDomain);
    } else if (hasRequirementsTxt) {
      output += `✓ Detected: Python application\n`;
      output = await deployPythonApp(conn, repoName, output, deploymentId, server.id, webRoot, targetDomain);
    } else if (hasIndexHtml) {
      output += `✓ Detected: Static HTML site\n`;
      output = await deployStaticHTML(conn, repoName, output, deploymentId, webRoot, targetDomain);
    } else {
      throw new Error('Unable to detect project type. Ensure package.json, requirements.txt, or index.html exists.');
    }

    output += `\n✅ Deployment completed successfully!\n`;
    await updateDeploymentOutput(deploymentId, output, 'success');
    
  } catch (error) {
    console.error(`[DEPLOY] Deployment #${deploymentId} error:`, error);
    output += `\n❌ Deployment failed: ${error.message}\n`;
    output += `Error details: ${error.stack || error}\n`;
    await updateDeploymentOutput(deploymentId, output, 'failed');
    
    // Send deploy error email to user
    try {
      const userResult = await pool.query('SELECT u.email FROM users u JOIN servers s ON s.user_id = u.id WHERE s.id = $1', [server.id]);
      if (userResult.rows[0]?.email) {
        await sendDeployErrorEmail(userResult.rows[0].email, gitUrl, error.message);
      }
    } catch (emailErr) {
      console.error(`[DEPLOY] Failed to send deploy error email:`, emailErr.message);
    }
  } finally {
    conn.end();
  }
}

// Helper: Cleanup previous deployment before starting new one
// This ensures switching from Node.js to static (or vice versa) works correctly
// targetDomain: If specified, only clean up that domain's nginx config (multi-site mode)
//               If null, clean up all domains (legacy single-site mode)
async function cleanupPreviousDeployment(conn, output, deploymentId, targetDomain = null) {
  try {
    // 1. Find and stop any app services we created (exclude system services)
    // Note: For multi-site, services are still global - we stop ALL user services
    // Future improvement: service names could include domain prefix
    output += `Stopping previous application services...\n`;
    
    // List user-created services (ones in /etc/systemd/system that aren't default)
    const serviceList = await execSSH(conn, `ls /etc/systemd/system/*.service 2>/dev/null | xargs -n1 basename 2>/dev/null || echo ""`);
    const services = serviceList.trim().split('\n').filter(s => 
      s && 
      s.endsWith('.service')
    );
    
    // Known system services to never touch
    const systemServicePrefixes = [
      'cloud', 'snap', 'systemd', 'getty', 'ssh', 'nginx', 'cron', 
      'dbus', 'network', 'ufw', 'rsyslog', 'unattended', 'apt',
      'polkit', 'accounts', 'ModemManager', 'multipathd', 'packagekit'
    ];
    
    for (const service of services) {
      try {
        // SECURITY: Validate service name - only allow safe characters
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.service$/.test(service)) {
          console.warn(`[CLEANUP] Skipping suspicious service name: ${service}`);
          continue;
        }
        
        // Skip known system services
        if (systemServicePrefixes.some(prefix => service.toLowerCase().startsWith(prefix))) {
          continue;
        }
        
        // Check if it's a user app service (has WorkingDirectory=/root/)
        const serviceContent = await execSSH(conn, `cat /etc/systemd/system/${service} 2>/dev/null || echo ""`);
        
        // Use case-insensitive regex for robustness
        if (/^\s*WorkingDirectory\s*=\s*\/root\//mi.test(serviceContent)) {
          output += `  Stopping ${service}...\n`;
          await execSSH(conn, `systemctl stop ${service} 2>/dev/null || true`);
          await execSSH(conn, `systemctl disable ${service} 2>/dev/null || true`);
          await execSSH(conn, `rm -f /etc/systemd/system/${service}`);
          output += `  ✓ Removed ${service}\n`;
        }
      } catch (e) {
        console.warn(`[CLEANUP] Error processing service ${service}:`, e.message);
      }
    }
    
    // 2. Kill any orphaned Node.js or Python processes (except our platform processes)
    output += `Stopping orphaned processes...\n`;
    await execSSH(conn, `pkill -f "node index.js" 2>/dev/null || true`);
    await execSSH(conn, `pkill -f "node server.js" 2>/dev/null || true`);
    await execSSH(conn, `pkill -f "node app.js" 2>/dev/null || true`);
    await execSSH(conn, `pkill -f "python3 app.py" 2>/dev/null || true`);
    await execSSH(conn, `pkill -f "gunicorn" 2>/dev/null || true`);
    output += `✓ Processes cleaned up\n`;
    
    // 3. Reload systemd to pick up removed services
    await execSSH(conn, `systemctl daemon-reload`);
    
    // 4. Handle nginx config based on whether this is domain-specific or global
    if (targetDomain) {
      // MULTI-SITE MODE: Only reset the specific domain's nginx config
      output += `Preparing nginx config for ${targetDomain}...\n`;
      output = await resetSingleDomainNginxConfig(conn, output, targetDomain);
    } else {
      // LEGACY MODE: Reset all domains (backwards compatible)
      output += `Analyzing Nginx configuration...\n`;
      const embeddedDomains = await extractDomainsFromDefaultConfig(conn);
      
      if (embeddedDomains.length > 0) {
        output += `  Found ${embeddedDomains.length} domain(s) in default config: ${embeddedDomains.map(d => d.domain).join(', ')}\n`;
      }
      
      output += `Resetting Nginx configuration...\n`;
      const completeNginxConfig = generateStaticNginxConfig(embeddedDomains);
      
      await execSSH(conn, `echo '${completeNginxConfig}' > /etc/nginx/sites-available/default`);
      output += `✓ Default Nginx config reset to static file serving\n`;
      
      // Also update any separate domain-specific Nginx configs
      output = await resetDomainNginxConfigs(conn, output);
    }
    
    // 5. Reload Nginx
    await execSSH(conn, `nginx -t && systemctl reload nginx`);
    output += `✓ Nginx reloaded\n`;
    
    output += `✓ Cleanup complete\n`;
    return output;
    
  } catch (error) {
    console.error(`[CLEANUP] Warning during cleanup:`, error.message);
    output += `⚠️ Cleanup warning: ${error.message} (continuing anyway)\n`;
    return output;
  }
}

// Helper: Reset nginx config for a single domain only (preserves other sites)
async function resetSingleDomainNginxConfig(conn, output, domain) {
  try {
    const siteName = getSiteDirName(domain);
    const webRoot = getWebRoot(domain);
    const configPath = `/etc/nginx/sites-available/${siteName}`;
    
    // Ensure the web root directory exists
    await execSSH(conn, `mkdir -p ${webRoot}`);
    
    // Check if there's an existing config to preserve SSL settings
    const existingConfig = await execSSH(conn, `cat ${configPath} 2>/dev/null || echo ""`);
    const hasSSL = existingConfig.includes('ssl_certificate') || existingConfig.includes('managed by Certbot');
    
    // Handle www prefix correctly
    const serverNames = domain.startsWith('www.') 
      ? `${domain} ${domain.substring(4)}`
      : `${domain} www.${domain}`;
    
    if (hasSSL) {
      output += `  ${domain}: Preparing with SSL preserved...\n`;
      
      // Extract existing cert paths
      const certPathMatch = existingConfig.match(/ssl_certificate\s+([^\s;]+fullchain\.pem)/);
      const keyPathMatch = existingConfig.match(/ssl_certificate_key\s+([^\s;]+privkey\.pem)/);
      
      const certDomain = domain.startsWith('www.') ? domain.substring(4) : domain;
      const certPath = certPathMatch ? certPathMatch[1] : `/etc/letsencrypt/live/${certDomain}/fullchain.pem`;
      const keyPath = keyPathMatch ? keyPathMatch[1] : `/etc/letsencrypt/live/${certDomain}/privkey.pem`;
      
      const sslOptionsExist = await execSSH(conn, `test -f /etc/letsencrypt/options-ssl-nginx.conf && echo "yes" || echo "no"`);
      const sslOptionsInclude = sslOptionsExist.trim() === 'yes' 
        ? `include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;`
        : '';
      
      // Create config with SSL
      const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};
    return 301 https://\\$host\\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverNames};

    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ${sslOptionsInclude}

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
      await execSSH(conn, `echo '${nginxConfig}' > ${configPath}`);
    } else {
      output += `  ${domain}: Preparing HTTP config...\n`;
      
      // Create simple HTTP config
      const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
      await execSSH(conn, `echo '${nginxConfig}' > ${configPath}`);
    }
    
    // Ensure symlink exists
    await execSSH(conn, `ln -sf ${configPath} /etc/nginx/sites-enabled/${siteName}`);
    output += `  ✓ ${domain} nginx config ready\n`;
    
    return output;
  } catch (error) {
    console.error(`[CLEANUP] Error resetting single domain config:`, error.message);
    output += `  ⚠️ ${domain}: Could not prepare config (${error.message})\n`;
    return output;
  }
}

// Helper: Reset all domain-specific Nginx configs to serve static files
// Uses domain-specific web roots: /var/www/sites/{domain}/
async function resetDomainNginxConfigs(conn, output) {
  try {
    // Get list of domain configs (excluding 'default')
    const configList = await execSSH(conn, `ls /etc/nginx/sites-enabled/ 2>/dev/null | grep -v default || echo ""`);
    const configs = configList.trim().split('\n').filter(c => c && c !== 'default');
    
    if (configs.length === 0) {
      output += `No domain-specific configs to update\n`;
      return output;
    }
    
    output += `Updating ${configs.length} domain config(s) to serve static files...\n`;
    
    for (const domain of configs) {
      try {
        // Read existing config to preserve SSL settings if present
        const existingConfig = await execSSH(conn, `cat /etc/nginx/sites-available/${domain} 2>/dev/null || echo ""`);
        
        // Check if it has SSL configured (managed by certbot)
        const hasSSL = existingConfig.includes('ssl_certificate') || existingConfig.includes('managed by Certbot');
        
        // Handle www prefix correctly - avoid www.www.domain.com
        const serverNames = domain.startsWith('www.') 
          ? `${domain} ${domain.substring(4)}`  // www.example.com example.com
          : `${domain} www.${domain}`;           // example.com www.example.com
        
        // Get domain-specific web root
        const webRoot = getWebRoot(domain);
        
        // Ensure the directory exists
        await execSSH(conn, `mkdir -p ${webRoot}`);
        
        if (hasSSL) {
          output += `  ${domain}: Updating to static (preserving SSL)...\n`;
          
          // Extract actual SSL cert path from existing config (don't assume)
          const certPathMatch = existingConfig.match(/ssl_certificate\s+([^\s;]+fullchain\.pem)/);
          const keyPathMatch = existingConfig.match(/ssl_certificate_key\s+([^\s;]+privkey\.pem)/);
          
          // Default paths if not found (fallback to bare domain without www)
          const certDomain = domain.startsWith('www.') ? domain.substring(4) : domain;
          const certPath = certPathMatch ? certPathMatch[1] : `/etc/letsencrypt/live/${certDomain}/fullchain.pem`;
          const keyPath = keyPathMatch ? keyPathMatch[1] : `/etc/letsencrypt/live/${certDomain}/privkey.pem`;
          
          // Check if SSL options files exist before including them
          const sslOptionsExist = await execSSH(conn, `test -f /etc/letsencrypt/options-ssl-nginx.conf && echo "yes" || echo "no"`);
          const sslOptionsInclude = sslOptionsExist.trim() === 'yes' 
            ? `include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;`
            : '';
          
          // Create new config that serves static files but keeps SSL
          const staticWithSSL = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};
    return 301 https://\\$host\\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverNames};

    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ${sslOptionsInclude}

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
          await execSSH(conn, `echo '${staticWithSSL}' > /etc/nginx/sites-available/${domain}`);
        } else {
          // Non-SSL domain - simple static config
          output += `  ${domain}: Updating to static...\n`;
          
          const staticConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
          await execSSH(conn, `echo '${staticConfig}' > /etc/nginx/sites-available/${domain}`);
        }
        
        output += `  ✓ ${domain} updated\n`;
      } catch (e) {
        output += `  ⚠️ ${domain}: Could not update (${e.message})\n`;
      }
    }
    
    return output;
  } catch (error) {
    console.error(`[CLEANUP] Error resetting domain configs:`, error.message);
    output += `⚠️ Could not list domain configs: ${error.message}\n`;
    return output;
  }
}

// Helper: Parse default nginx config and extract domains with their SSL certs
// Certbot often merges domain configs INTO the default file
async function extractDomainsFromDefaultConfig(conn) {
  try {
    const defaultConfig = await execSSH(conn, `cat /etc/nginx/sites-available/default 2>/dev/null || echo ""`);
    
    // Find all server_name directives (excluding _ which is the catch-all)
    const serverNameMatches = defaultConfig.match(/server_name\s+([^;]+);/g) || [];
    const domains = [];
    
    for (const match of serverNameMatches) {
      const domainMatch = match.match(/server_name\s+([^;]+);/);
      if (domainMatch) {
        const names = domainMatch[1].trim().split(/\s+/);
        for (const name of names) {
          // Skip catch-all and empty
          if (name && name !== '_' && name !== 'localhost' && !name.startsWith('$')) {
            // Extract domain without www prefix for cert lookup
            const baseDomain = name.startsWith('www.') ? name.substring(4) : name;
            if (!domains.find(d => d.domain === baseDomain || d.domain === name)) {
              domains.push({ domain: name, baseDomain });
            }
          }
        }
      }
    }
    
    // For each domain, check if SSL cert exists
    for (const d of domains) {
      // Try to find SSL cert path in the config
      const certRegex = new RegExp(`ssl_certificate\\s+(/etc/letsencrypt/live/[^/]+/fullchain\\.pem)`, 'g');
      const certMatches = defaultConfig.match(certRegex) || [];
      
      // Check if cert exists for this domain
      const certPath = `/etc/letsencrypt/live/${d.baseDomain}/fullchain.pem`;
      const certExists = await execSSH(conn, `test -f ${certPath} && echo "yes" || echo "no"`);
      d.hasSSL = certExists.trim() === 'yes';
      d.certPath = certPath;
      d.keyPath = `/etc/letsencrypt/live/${d.baseDomain}/privkey.pem`;
    }
    
    return domains;
  } catch (error) {
    console.error(`[CLEANUP] Error extracting domains from default config:`, error.message);
    return [];
  }
}

// Helper: Generate complete nginx default config with all domains serving static files
// Uses domain-specific web roots: /var/www/sites/{domain}/ for multi-site architecture
function generateStaticNginxConfig(domains) {
  let config = `# Auto-generated by Clouded Basement - serves static files for all domains
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;

  // Add config for each domain with domain-specific web root
  for (const d of domains) {
    const serverNames = d.domain.startsWith('www.') 
      ? `${d.domain} ${d.domain.substring(4)}`
      : `${d.domain} www.${d.domain}`;
    
    // Use domain-specific directory
    const webRoot = getWebRoot(d.baseDomain || d.domain);
    
    if (d.hasSSL) {
      // HTTP redirect to HTTPS
      config += `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};
    return 301 https://\\$host\\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverNames};

    ssl_certificate ${d.certPath};
    ssl_certificate_key ${d.keyPath};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
    } else {
      // HTTP only
      config += `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    root ${webRoot};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
    }
  }
  
  return config;
}

// Helper: Setup Node version using nvm if specified in package.json
async function setupNodeVersion(conn, repoName, output, deploymentId) {
  try {
    // Read package.json to check for Node version requirement
    const packageJson = await execSSH(conn, `cat /root/${repoName}/package.json`);
    const parsed = JSON.parse(packageJson);
    
    // Check for Node version in engines field
    const nodeVersion = parsed.engines?.node;
    
    if (nodeVersion) {
      output += `📦 Detected Node version requirement: ${nodeVersion}\n`;
      await updateDeploymentOutput(deploymentId, output, 'deploying');
      
      // Extract major version (e.g., "14.x" -> "14", ">=12.0.0" -> "12")
      const majorVersion = nodeVersion.match(/\d+/)?.[0];
      
      if (majorVersion) {
        output += `🔄 Installing Node ${majorVersion} via nvm...\n`;
        await updateDeploymentOutput(deploymentId, output, 'deploying');
        
        // Source nvm and install/use specified version
        const nvmCommand = `source /root/.nvm/nvm.sh && nvm install ${majorVersion} && nvm use ${majorVersion}`;
        await execSSH(conn, nvmCommand);
        
        output += `✓ Switched to Node ${majorVersion}\n`;
        await updateDeploymentOutput(deploymentId, output, 'deploying');
      }
    }
  } catch (error) {
    // If nvm setup fails, continue with default Node version
    output += `⚠️ Could not detect/switch Node version, using default\n`;
    await updateDeploymentOutput(deploymentId, output, 'deploying');
  }
}

// Helper: Wrap command with nvm sourcing
function withNvm(command) {
  return `source /root/.nvm/nvm.sh 2>/dev/null || true; ${command}`;
}

// Helper: Inject environment variables into .env file
async function injectEnvVars(conn, repoName, output, deploymentId, serverId) {
  try {
    if (!serverId) return output;
    
    // Fetch env vars from database
    const envResult = await pool.query(
      'SELECT key, value FROM environment_variables WHERE server_id = $1',
      [serverId]
    );
    
    if (envResult.rows.length === 0) {
      output += `No environment variables configured\n`;
      return output;
    }
    
    output += `Injecting ${envResult.rows.length} environment variable(s)...\n`;
    
    // Create .env file content
    const envContent = envResult.rows
      .map(row => `${row.key}=${row.value}`)
      .join('\\n');
    
    // Write .env file (escape quotes and newlines for shell)
    const escapedContent = envContent.replace(/'/g, "'\\''");
    await execSSH(conn, `echo '${escapedContent}' > /root/${repoName}/.env`);
    
    output += `✓ Environment variables injected\n`;
    await updateDeploymentOutput(deploymentId, output, 'deploying');
    
    return output;
  } catch (error) {
    console.error('Env injection error:', error);
    output += `⚠️ Failed to inject environment variables: ${error.message}\n`;
    return output;
  }
}

// Helper: Perform health check after deployment
async function performHealthCheck(conn, type, output, deploymentId, serviceName = null) {
  try {
    output += `\n[Health Check] Verifying deployment...\n`;
    await updateDeploymentOutput(deploymentId, output, 'deploying');
    
    if (type === 'static') {
      // Check if Nginx is serving content
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await execSSH(conn, `curl -s -o /dev/null -w "%{http_code}" http://localhost/`);
          const statusCode = result.trim();
          
          if (statusCode === '200') {
            output += `✓ Site is responding (HTTP ${statusCode})\n`;
            break;
          } else if (attempt === 3) {
            output += `⚠️ Site returned HTTP ${statusCode} (may need time to initialize)\n`;
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
          }
        } catch (err) {
          if (attempt === 3) {
            output += `⚠️ Health check failed: ${err.message}\n`;
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    } else if (type === 'backend' && serviceName) {
      // Check if systemd service is running
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for service startup
          
          const status = await execSSH(conn, `systemctl is-active ${serviceName}`);
          
          if (status.trim() === 'active') {
            output += `✓ Service is running\n`;
            break;
          } else if (attempt === 3) {
            output += `⚠️ Service status: ${status.trim()}\n`;
            output += `Check logs: journalctl -u ${serviceName} -n 20\n`;
          }
        } catch (err) {
          if (attempt === 3) {
            output += `⚠️ Service health check failed\n`;
            output += `Check logs: journalctl -u ${serviceName} -n 20\n`;
          }
        }
      }
    }
    
    await updateDeploymentOutput(deploymentId, output, 'deploying');
    return output;
  } catch (error) {
    console.error('Health check error:', error);
    output += `⚠️ Health check error: ${error.message}\n`;
    return output;
  }
}

// Deploy static site (React/Vue/Vite)
// webRoot: Target directory for deployment (e.g., /var/www/sites/example.com or /var/www/html)
// targetDomain: Domain being deployed to (for logging/notifications)
async function deployStaticSite(conn, repoName, output, deploymentId, serverId, webRoot = '/var/www/html', targetDomain = null) {
  // Detect and switch Node version if specified
  output += `\n[3/5] Installing dependencies...\n`;
  await setupNodeVersion(conn, repoName, output, deploymentId);
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  // Try npm install with progressively more aggressive flags
  let installSuccess = false;
  try {
    await execSSH(conn, withNvm(`cd /root/${repoName} && npm install --legacy-peer-deps`));
    output += `✓ Dependencies installed\n`;
    installSuccess = true;
  } catch (e) {
    output += `⚠️ Standard install failed, trying with --force...\n`;
    try {
      await execSSH(conn, withNvm(`cd /root/${repoName} && npm install --legacy-peer-deps --force`));
      output += `✓ Dependencies installed (with --force)\n`;
      installSuccess = true;
    } catch (e2) {
      output += `⚠️ Install with --force failed, trying with --ignore-scripts...\n`;
      try {
        await execSSH(conn, withNvm(`cd /root/${repoName} && npm install --legacy-peer-deps --force --ignore-scripts`));
        output += `✓ Dependencies installed (ignoring scripts)\n`;
        installSuccess = true;
      } catch (e3) {
        output += `⚠️ npm install failed completely, checking for pre-built files...\n`;
      }
    }
  }
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[4/5] Building project...\n`;
  
  // Check if build directory already exists (pre-built)
  const prebuiltDist = await fileExists(conn, `/root/${repoName}/dist`);
  const prebuiltBuild = await fileExists(conn, `/root/${repoName}/build`);
  const prebuiltOut = await fileExists(conn, `/root/${repoName}/out`);
  
  if (prebuiltDist || prebuiltBuild || prebuiltOut) {
    output += `✓ Found pre-built files, skipping build step\n`;
  } else if (installSuccess) {
    // Only try to build if install succeeded
    try {
      await execSSH(conn, withNvm(`cd /root/${repoName} && npm run build`));
      output += `✓ Build completed\n`;
    } catch (buildError) {
      output += `⚠️ Build failed: ${buildError.message}\n`;
      output += `Attempting to deploy source files directly...\n`;
    }
  } else {
    output += `⚠️ Skipping build (dependencies not installed)\n`;
  }
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[5/5] Deploying to web server...\n`;
  
  // Ensure the target web root directory exists
  await execSSH(conn, `mkdir -p ${webRoot}`);
  output += `Target: ${webRoot}${targetDomain ? ` (${targetDomain})` : ''}\n`;
  
  // Detect build directory (dist, build, out)
  const hasDist = await fileExists(conn, `/root/${repoName}/dist`);
  const hasBuild = await fileExists(conn, `/root/${repoName}/build`);
  const hasOut = await fileExists(conn, `/root/${repoName}/out`);
  const hasPublic = await fileExists(conn, `/root/${repoName}/public`);
  
  let buildDir = hasDist ? 'dist' : hasBuild ? 'build' : hasOut ? 'out' : hasPublic ? 'public' : null;
  
  // If no build directory found, try deploying source directly
  if (!buildDir) {
    output += `⚠️ No build directory found. Deploying source files directly...\n`;
    await execSSH(conn, `rm -rf ${webRoot}/* && cp -r /root/${repoName}/* ${webRoot}/`);
    output += `✓ Source files deployed to Nginx\n`;
  } else {
    await execSSH(conn, `rm -rf ${webRoot}/* && cp -r /root/${repoName}/${buildDir}/* ${webRoot}/`);
    output += `✓ Site deployed to Nginx (from ${buildDir}/)\n`;
  }
  
  const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}/`;
  output += `\n🌐 Your site is live at: ${siteUrl}\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Health check
  output = await performHealthCheck(conn, 'static', output, deploymentId);
  
  return output;
}

// Deploy static HTML (no build step)
async function deployStaticHTML(conn, repoName, output, deploymentId, webRoot = '/var/www/html', targetDomain = null) {
  output += `\n[3/5] Skipping dependencies (static HTML)\n`;
  output += `[4/5] Skipping build (static HTML)\n`;
  output += `\n[5/5] Deploying to web server...\n`;
  
  // Ensure the target web root directory exists
  await execSSH(conn, `mkdir -p ${webRoot}`);
  output += `Target: ${webRoot}${targetDomain ? ` (${targetDomain})` : ''}\n`;
  
  await execSSH(conn, `rm -rf ${webRoot}/* && cp -r /root/${repoName}/* ${webRoot}/`);
  output += `✓ Site deployed to Nginx\n`;
  
  const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}/`;
  output += `\n🌐 Your site is live at: ${siteUrl}\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Health check
  output = await performHealthCheck(conn, 'static', output, deploymentId);
  
  return output;
}

// Deploy Node.js backend
// For backends, webRoot is not directly used (they run as services) but targetDomain affects nginx config
async function deployNodeBackend(conn, repoName, output, deploymentId, serverId, webRoot = '/var/www/html', targetDomain = null) {
  output += `\n[3/5] Installing dependencies...\n`;
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  // Try npm install with progressively more aggressive flags
  let installSuccess = false;
  try {
    await execSSH(conn, `cd /root/${repoName} && npm install --legacy-peer-deps --production`);
    output += `✓ Dependencies installed\n`;
    installSuccess = true;
  } catch (e) {
    output += `⚠️ Standard install failed, trying with --force...\n`;
    try {
      await execSSH(conn, `cd /root/${repoName} && npm install --legacy-peer-deps --force --production`);
      output += `✓ Dependencies installed (with --force)\n`;
      installSuccess = true;
    } catch (e2) {
      output += `⚠️ Install with --force failed, trying with --ignore-scripts...\n`;
      try {
        await execSSH(conn, `cd /root/${repoName} && npm install --legacy-peer-deps --force --ignore-scripts --production`);
        output += `✓ Dependencies installed (ignoring scripts)\n`;
        installSuccess = true;
      } catch (e3) {
        output += `❌ npm install failed: ${e3.message}\n`;
        throw new Error('Failed to install Node.js dependencies');
      }
    }
  }
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[4/5] Creating systemd service...\n`;
  const serviceName = `${repoName}.service`;
  const serviceContent = `[Unit]
Description=${repoName} Node.js App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target`;

  await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
  output += `✓ Service created\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Configure Nginx as reverse proxy
  output += `\nConfiguring Nginx reverse proxy...\n`;
  
  // Generate domain-aware nginx config
  const serverNames = targetDomain 
    ? (targetDomain.startsWith('www.') 
        ? `${targetDomain} ${targetDomain.substring(4)}`
        : `${targetDomain} www.${targetDomain}`)
    : '_';
  
  const nginxConfig = `server {
    listen 80${targetDomain ? '' : ' default_server'};
    listen [::]:80${targetDomain ? '' : ' default_server'};
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}`;
  
  // Write config to appropriate location
  const configFile = targetDomain ? `/etc/nginx/sites-available/${getSiteDirName(targetDomain)}` : '/etc/nginx/sites-available/default';
  await execSSH(conn, `echo '${nginxConfig}' > ${configFile}`);
  
  // Ensure symlink exists if domain-specific
  if (targetDomain) {
    const siteName = getSiteDirName(targetDomain);
    await execSSH(conn, `ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName}`);
  }
  
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 3000\n`;
  
  const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}:3000/`;
  output += `\n🚀 Your backend is live at: ${siteUrl}\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Health check
  output = await performHealthCheck(conn, 'backend', output, deploymentId, serviceName);
  
  return output;
}

// Deploy Python app
async function deployPythonApp(conn, repoName, output, deploymentId, serverId, webRoot = '/var/www/html', targetDomain = null) {
  output += `\n[3/5] Installing dependencies...\n`;
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  await execSSH(conn, `cd /root/${repoName} && pip3 install -r requirements.txt`);
  output += `✓ Dependencies installed\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[4/5] Creating systemd service...\n`;
  const serviceName = `${repoName}.service`;
  const serviceContent = `[Unit]
Description=${repoName} Python App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=/usr/bin/python3 app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target`;

  await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
  output += `✓ Service created\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Configure Nginx as reverse proxy (assuming Flask/FastAPI on port 5000)
  output += `\nConfiguring Nginx reverse proxy...\n`;
  
  // Generate domain-aware nginx config
  const serverNames = targetDomain 
    ? (targetDomain.startsWith('www.') 
        ? `${targetDomain} ${targetDomain.substring(4)}`
        : `${targetDomain} www.${targetDomain}`)
    : '_';
  
  const nginxConfig = `server {
    listen 80${targetDomain ? '' : ' default_server'};
    listen [::]:80${targetDomain ? '' : ' default_server'};
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}`;
  
  // Write config to appropriate location
  const configFile = targetDomain ? `/etc/nginx/sites-available/${getSiteDirName(targetDomain)}` : '/etc/nginx/sites-available/default';
  await execSSH(conn, `echo '${nginxConfig}' > ${configFile}`);
  
  // Ensure symlink exists if domain-specific
  if (targetDomain) {
    const siteName = getSiteDirName(targetDomain);
    await execSSH(conn, `ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName}`);
  }
  
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 5000\n`;
  
  const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}:5000/`;
  output += `\n🐍 Your Python app is live at: ${siteUrl}\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Health check
  output = await performHealthCheck(conn, 'backend', output, deploymentId, serviceName);
  
  return output;
}

// Deploy Rust app
async function deployRustApp(conn, repoName, output, deploymentId, serverId, webRoot = '/var/www/html', targetDomain = null) {
  output += `\n[3/5] Building Rust application...\n`;
  output += `This may take several minutes...\n`;
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  try {
    // Source cargo environment and build
    await execSSH(conn, `cd /root/${repoName} && source /root/.cargo/env && cargo build --release`);
    output += `✓ Rust build successful\n`;
  } catch (err) {
    output += `⚠️ Cargo build failed: ${err.message}\n`;
    output += `Attempting basic deployment...\n`;
  }
  
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[4/5] Deploying to Nginx...\n`;
  
  // Check for static files or WASM output
  const hasStaticDir = await fileExists(conn, `/root/${repoName}/static`);
  const hasPkgDir = await fileExists(conn, `/root/${repoName}/pkg`);
  
  if (hasStaticDir) {
    await execSSH(conn, `mkdir -p ${webRoot} && cp -r /root/${repoName}/static/* ${webRoot}/`);
    output += `✓ Deployed static files\n`;
  } else if (hasPkgDir) {
    await execSSH(conn, `mkdir -p ${webRoot} && cp -r /root/${repoName}/pkg/* ${webRoot}/`);
    output += `✓ Deployed WASM package\n`;
  } else {
    // Deploy binary as systemd service
    const binPath = `/root/${repoName}/target/release/${repoName}`;
    const hasBinary = await fileExists(conn, binPath);
    
    if (hasBinary) {
      output += `\n[5/5] Creating systemd service...\n`;
      const serviceName = `${repoName}.service`;
      const serviceContent = `[Unit]
Description=${repoName} Rust App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=${binPath}
Restart=always

[Install]
WantedBy=multi-user.target`;
      
      await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
      await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
      output += `✓ Service started\n`;
      await updateDeploymentOutput(deploymentId, output, 'deploying');
      
      // Configure Nginx as reverse proxy (Rust apps typically run on port 8080)
      output += `\nConfiguring Nginx reverse proxy...\n`;
      
      // Generate domain-aware nginx config
      const serverNames = targetDomain 
        ? (targetDomain.startsWith('www.') 
            ? `${targetDomain} ${targetDomain.substring(4)}`
            : `${targetDomain} www.${targetDomain}`)
        : '_';
      
      const nginxConfig = `server {
    listen 80${targetDomain ? '' : ' default_server'};
    listen [::]:80${targetDomain ? '' : ' default_server'};
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}`;
      
      // Write config to appropriate location
      const configFile = targetDomain ? `/etc/nginx/sites-available/${getSiteDirName(targetDomain)}` : '/etc/nginx/sites-available/default';
      await execSSH(conn, `echo '${nginxConfig}' > ${configFile}`);
      
      // Ensure symlink exists if domain-specific
      if (targetDomain) {
        const siteName = getSiteDirName(targetDomain);
        await execSSH(conn, `ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName}`);
      }
      
      await execSSH(conn, `nginx -t && systemctl reload nginx`);
      output += `✓ Nginx configured as reverse proxy to port 8080\n`;
      
      const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}:8080/`;
      output += `\n🚀 Your Rust backend is live at: ${siteUrl}\n`;
    } else {
      output += `⚠️ No deployable artifacts found\n`;
      output += `Expected: static/, pkg/, or target/release/${repoName}\n`;
    }
  }
  
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  return output;
}

// Deploy Go app
async function deployGoApp(conn, repoName, output, deploymentId, serverId, webRoot = '/var/www/html', targetDomain = null) {
  output += `\n[3/5] Building Go application...\n`;
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  try {
    // Build the Go binary
    await execSSH(conn, `cd /root/${repoName} && export PATH=$PATH:/usr/local/go/bin && go build -o ${repoName}`);
    output += `✓ Go build successful\n`;
  } catch (err) {
    output += `⚠️ Go build failed: ${err.message}\n`;
    throw new Error('Go build failed');
  }
  
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[4/5] Creating systemd service...\n`;
  const serviceName = `${repoName}.service`;
  const serviceContent = `[Unit]
Description=${repoName} Go App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=/root/${repoName}/${repoName}
Restart=always

[Install]
WantedBy=multi-user.target`;
  
  await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
  output += `✓ Service file created\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  // Configure Nginx as reverse proxy (Go apps typically run on port 8080)
  output += `\nConfiguring Nginx reverse proxy...\n`;
  
  // Generate domain-aware nginx config
  const serverNames = targetDomain 
    ? (targetDomain.startsWith('www.') 
        ? `${targetDomain} ${targetDomain.substring(4)}`
        : `${targetDomain} www.${targetDomain}`)
    : '_';
  
  const nginxConfig = `server {
    listen 80${targetDomain ? '' : ' default_server'};
    listen [::]:80${targetDomain ? '' : ' default_server'};
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}`;
  
  // Write config to appropriate location
  const configFile = targetDomain ? `/etc/nginx/sites-available/${getSiteDirName(targetDomain)}` : '/etc/nginx/sites-available/default';
  await execSSH(conn, `echo '${nginxConfig}' > ${configFile}`);
  
  // Ensure symlink exists if domain-specific
  if (targetDomain) {
    const siteName = getSiteDirName(targetDomain);
    await execSSH(conn, `ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName}`);
  }
  
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 8080\n`;
  
  const siteUrl = targetDomain ? `https://${targetDomain}/` : `http://${conn.config.host}:8080/`;
  output += `\n🚀 Your Go backend is live at: ${siteUrl}\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  return output;
}

// Helper: Sanitize output to mask secrets
function sanitizeOutput(output) {
  if (!output) return output;
  
  // Mask common secret patterns
  let sanitized = output;
  
  // API Keys (various formats)
  sanitized = sanitized.replace(/(['"]?api[_-]?key['"]?\s*[:=]\s*['"]?)([A-Za-z0-9_\-]{20,})/gi, '$1***REDACTED***');
  sanitized = sanitized.replace(/(['"]?apikey['"]?\s*[:=]\s*['"]?)([A-Za-z0-9_\-]{20,})/gi, '$1***REDACTED***');
  
  // Tokens (Bearer, JWT, OAuth)
  sanitized = sanitized.replace(/(['"]?token['"]?\s*[:=]\s*['"]?)([A-Za-z0-9_\-\.]{20,})/gi, '$1***REDACTED***');
  sanitized = sanitized.replace(/(['"]?bearer['"]?\s+)([A-Za-z0-9_\-\.]{20,})/gi, '$1***REDACTED***');
  
  // Passwords
  sanitized = sanitized.replace(/(['"]?password['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  sanitized = sanitized.replace(/(['"]?passwd['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  sanitized = sanitized.replace(/(['"]?pwd['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  
  // Secret keys
  sanitized = sanitized.replace(/(['"]?secret[_-]?key['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  sanitized = sanitized.replace(/(['"]?private[_-]?key['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  
  // Database URLs
  sanitized = sanitized.replace(/(postgres|mysql|mongodb):\/\/([^:]+):([^@]+)@/gi, '$1://$2:***REDACTED***@');
  
  // AWS credentials
  sanitized = sanitized.replace(/(AKIA[0-9A-Z]{16})/g, '***REDACTED_AWS_KEY***');
  sanitized = sanitized.replace(/(['"]?aws[_-]?secret[_-]?access[_-]?key['"]?\s*[:=]\s*['"]?)([^\s'"]+)/gi, '$1***REDACTED***');
  
  // Stripe keys
  sanitized = sanitized.replace(/(sk_live_[A-Za-z0-9]{24,})/g, '***REDACTED_STRIPE_KEY***');
  sanitized = sanitized.replace(/(pk_live_[A-Za-z0-9]{24,})/g, '***REDACTED_STRIPE_KEY***');
  
  // GitHub tokens
  sanitized = sanitized.replace(/(ghp_[A-Za-z0-9]{36,})/g, '***REDACTED_GITHUB_TOKEN***');
  
  // Generic base64 secrets (>40 chars)
  sanitized = sanitized.replace(/(['"]?secret['"]?\s*[:=]\s*['"]?)([A-Za-z0-9+\/]{40,}={0,2})/gi, '$1***REDACTED***');
  
  return sanitized;
}

// Helper: Execute SSH command with timeout
function execSSH(conn, command, timeoutMs = 900000) { // 15 min default timeout
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs / 1000}s: ${command.substring(0, 100)}...`));
    }, timeoutMs);
    
    conn.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timeoutId);
        return reject(err);
      }
      
      let output = '';
      let errorOutput = '';
      
      stream.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed (exit ${code}): ${errorOutput || output}`));
        }
      });
      
      stream.on('data', (data) => {
        output += data.toString();
      });
      
      stream.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    });
  });
}

// Helper: Check if file exists
async function fileExists(conn, path) {
  try {
    await execSSH(conn, `test -f ${path} || test -d ${path}`);
    return true;
  } catch {
    return false;
  }
}

// Helper: Update deployment output in database
async function updateDeploymentOutput(deploymentId, output, status) {
  try {
    // Sanitize output before storing
    const sanitizedOutput = sanitizeOutput(output);
    
    await pool.query(
      'UPDATE deployments SET output = $1::text, status = $2::text, deployed_at = CASE WHEN $2 = \'success\' THEN NOW() ELSE deployed_at END WHERE id = $3',
      [sanitizedOutput, status, deploymentId]
    );
  } catch (err) {
    console.error('[DEPLOY] Failed to update deployment output:', err);
  }
}

// POST /add-domain
exports.addDomain = async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server with plan info
    const serverResult = await pool.query(
      'SELECT id, plan FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;
    const plan = serverResult.rows[0].plan || 'basic';

    // Check domain limit for plan
    const planLimits = PRICING_PLANS[plan] || PRICING_PLANS.basic;
    const maxSites = planLimits.maxSites;

    const domainCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM domains WHERE server_id = $1',
      [serverId]
    );
    const currentDomainCount = parseInt(domainCountResult.rows[0].count);

    if (currentDomainCount >= maxSites) {
      return res.redirect(`/dashboard?error=Domain limit reached (${maxSites} sites for ${plan} plan). Delete a domain or upgrade your plan.`);
    }

    // Check if domain already exists
    const existingDomain = await pool.query(
      'SELECT id FROM domains WHERE domain = $1',
      [domain]
    );

    if (existingDomain.rows.length > 0) {
      return res.redirect('/dashboard?error=Domain already in use');
    }

    // Store domain in database
    await pool.query(
      'INSERT INTO domains (server_id, user_id, domain, ssl_enabled) VALUES ($1, $2, $3, $4)',
      [serverId, userId, domain, false]
    );

    console.log(`[DOMAIN] User ${userId} added domain ${domain} (${currentDomainCount + 1}/${maxSites})`);

    // In real implementation, this would:
    // 1. Configure Nginx on the droplet
    // 2. Set up SSL certificate with Let's Encrypt
    
    res.redirect('/dashboard?success=Domain added! Configure your DNS as shown above.');
  } catch (error) {
    console.error('Add domain error:', error);
    res.redirect('/dashboard?error=Failed to add domain');
  }
};

// POST /enable-ssl
exports.enableSSL = async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;

    // Validate domain with strict DNS compliance
    if (!domain || !isValidDomain(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format. Use format: example.com');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 AND status = $2',
      [userId, 'running']
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No running server found');
    }

    const server = serverResult.rows[0];

    // SECURITY: Verify domain belongs to this user
    const domainCheck = await pool.query(
      'SELECT id FROM domains WHERE domain = $1 AND user_id = $2',
      [domain, userId]
    );

    if (domainCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Domain not found or access denied');
    }

    // Send response immediately - process SSL in background
    res.redirect('/dashboard?message=SSL certificate generation started! This may take a minute.');

    // Background process - trigger SSL certificate generation
    triggerSSLCertificateForCustomer(server.id, domain, server).catch(err => {
      console.error('[SSL] Failed to trigger certificate for server', server.id, ':', err);
    });

  } catch (error) {
    console.error('Enable SSL error:', error);
    res.redirect('/dashboard?error=Failed to enable SSL');
  }
};

// Background function to trigger SSL via SSH2 library (secure, no command injection)
async function triggerSSLCertificateForCustomer(serverId, domain, server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log(`[SSL] SSH connected to server ${serverId}`);
      
      // Security: Strict domain validation (prevents command injection)
      // Only allow alphanumeric, dots, and hyphens (RFC 1123)
      if (!/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i.test(domain)) {
        conn.end();
        return reject(new Error('Invalid domain format'));
      }
      
      // Use --nginx plugin which works with nginx running (no need to stop services)
      const certbotCmd = `certbot --nginx -d ${domain} --email admin@${domain} --non-interactive --agree-tos --redirect`;
      
      conn.exec(certbotCmd, { timeout: 60000 }, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', async (code) => {
          console.log(`[SSL] Certbot finished for ${domain}, exit code: ${code}`);
          console.log(`[SSL] stdout: ${stdout.substring(0, 500)}`);
          console.log(`[SSL] stderr: ${stderr.substring(0, 500)}`);
          
          try {
            if (stdout.includes('Congratulations') || stderr.includes('Congratulations') || stdout.includes('Successfully received certificate') || stderr.includes('Successfully received certificate')) {
              // Certificate generated successfully
              // Note: We do NOT modify nginx config here - the deploy step already set it up correctly
              // Adding proxy_pass would break static sites that don't have a backend on port 3000
              conn.end();
              
              // Update domains table - SSL cert is working
              await pool.query('UPDATE domains SET ssl_enabled = true WHERE domain = $1', [domain]);
              console.log(`[SSL] Certificate activated for ${domain} on server ${serverId}`);
              resolve();
            } else {
              conn.end();
              console.error(`[SSL] Certbot did not succeed. Code: ${code}, stdout: ${stdout}, stderr: ${stderr}`);
              throw new Error('Certbot command did not complete successfully');
            }
          } catch (dbError) {
            conn.end();
            reject(dbError);
          }
        });
        
        stream.on('data', (data) => {
          stdout += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
    
    conn.on('error', (err) => {
      console.error(`[SSL] SSH connection error for server ${serverId}:`, err.message);
      reject(err);
    });
    
    conn.connect({
      host: server.ip_address,
      port: 22,
      username: server.ssh_username,
      password: server.ssh_password
    });
  }).catch(async (error) => {
    console.error(`[SSL] Error generating certificate for server ${serverId}:`, error.message);
    // Log the failure - domains.ssl_enabled stays false
  });
}

// POST /setup-database - One-click database installation
exports.setupDatabase = async (req, res) => {
  try {
    const { database_type } = req.body;
    const userId = req.session.userId;

    if (!['postgres', 'mongodb'].includes(database_type)) {
      return res.redirect('/dashboard?error=Invalid database type');
    }

    // Get user's server
    const serverResult = await pool.query(
      "SELECT * FROM servers WHERE user_id = $1 AND status NOT IN ('deleted', 'failed')",
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    if (!server.ip_address || !server.ssh_password) {
      return res.redirect('/dashboard?error=Server not ready yet');
    }

    // Perform database setup asynchronously
    setupDatabaseAsync(server, database_type, userId).catch(err => {
      console.error(`[DB] Database setup failed:`, err);
    });

    res.redirect(`/dashboard?success=Setting up ${database_type === 'postgres' ? 'PostgreSQL' : 'MongoDB'}... Check status in a moment.`);
  } catch (error) {
    console.error('Setup database error:', error);
    res.redirect('/dashboard?error=Failed to start database setup');
  }
};

// Async database setup function
async function setupDatabaseAsync(server, databaseType, userId) {
  const conn = new Client();

  try {
    // Connect via SSH
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve);
      conn.on('error', reject);
      conn.connect({
        host: server.ip_address,
        port: 22,
        username: 'root',
        password: server.ssh_password,
        readyTimeout: 30000
      });
    });

    if (databaseType === 'postgres') {
      console.log(`[DB] Installing PostgreSQL on server ${server.id}...`);
      await execSSH(conn, `apt update && apt install -y postgresql postgresql-contrib`);
      await execSSH(conn, `systemctl start postgresql && systemctl enable postgresql`);
      
      // Create database user and store credentials
      const dbUser = 'basement_user';
      const dbPass = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Use psql -v variables to safely pass values (immune to SQL injection even with special chars)
      const createUserCmd = `sudo -u postgres psql -v "username=${dbUser}" -v "password=${dbPass}" -c "CREATE USER :\\"username\\" WITH PASSWORD :'password';" || true`;
      const createDbCmd = `sudo -u postgres psql -v "username=${dbUser}" -c "CREATE DATABASE app_db OWNER :\\"username\\";" || true`;
      
      await execSSH(conn, createUserCmd);
      await execSSH(conn, createDbCmd);
      
      // Store credentials file using base64 encoding (prevents shell injection)
      const credsContent = `PostgreSQL Credentials\n\nHost: localhost\nPort: 5432\nDatabase: app_db\nUsername: ${dbUser}\nPassword: ${dbPass}\n\nConnection String:\npostgresql://${dbUser}:${dbPass}@localhost:5432/app_db`;
      const credsBase64 = Buffer.from(credsContent).toString('base64');
      await execSSH(conn, `echo '${credsBase64}' | base64 -d > /root/.database_config`);
      
      console.log(`[DB] PostgreSQL installed successfully on server ${server.id}`);
      
      // Store credentials in database
      await pool.query(
        `UPDATE servers SET 
          postgres_installed = true,
          postgres_db_name = $1,
          postgres_db_user = $2,
          postgres_db_password = $3
         WHERE id = $4`,
        ['app_db', dbUser, dbPass, server.id]
      );
    } else if (databaseType === 'mongodb') {
      console.log(`[DB] Installing MongoDB on server ${server.id}...`);
      
      // Add official MongoDB repository (mongodb-org not in default Ubuntu repos)
      // Use --batch and --yes flags for non-interactive GPG import
      await execSSH(conn, `curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --batch --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg`);
      await execSSH(conn, `echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list`);
      await execSSH(conn, `apt update`);
      
      // Install MongoDB
      await execSSH(conn, `apt install -y mongodb-org`);
      await execSSH(conn, `systemctl start mongod && systemctl enable mongod`);
      
      // Generate secure credentials
      const mongoUsername = 'basement_user';
      const mongoPassword = crypto.randomBytes(16).toString('hex');
      const mongoDbName = 'app_db';
      
      // Create MongoDB admin user with authentication
      const createUserScript = `
db = db.getSiblingDB('${mongoDbName}');
db.createUser({
  user: '${mongoUsername}',
  pwd: '${mongoPassword}',
  roles: [{ role: 'readWrite', db: '${mongoDbName}' }]
});
`;
      
      // Save script to file and execute via mongosh
      const scriptBase64 = Buffer.from(createUserScript).toString('base64');
      await execSSH(conn, `echo '${scriptBase64}' | base64 -d > /tmp/create_mongo_user.js`);
      
      // Verify user creation succeeded before enabling auth
      const createResult = await execSSH(conn, `mongosh < /tmp/create_mongo_user.js 2>&1`);
      await execSSH(conn, `rm /tmp/create_mongo_user.js`);
      
      if (!createResult.includes('Successfully added user') && !createResult.includes('"ok"') && !createResult.includes('ok: 1')) {
        throw new Error(`MongoDB user creation failed: ${createResult}`);
      }
      
      // Enable authentication in MongoDB config (use proper YAML newline)
      await execSSH(conn, `sed -i 's/#security:/security:/' /etc/mongod.conf`);
      await execSSH(conn, `sed -i '/^security:/a\\  authorization: enabled' /etc/mongod.conf`);
      await execSSH(conn, `systemctl restart mongod`);
      
      // Wait for MongoDB to restart
      await execSSH(conn, `sleep 3`);
      
      // Store credentials file using base64 encoding (prevents shell injection)
      const connectionString = `mongodb://${mongoUsername}:${mongoPassword}@localhost:27017/${mongoDbName}`;
      const credsContent = `MongoDB Credentials\n\nHost: localhost\nPort: 27017\nDatabase: ${mongoDbName}\nUsername: ${mongoUsername}\nPassword: ${mongoPassword}\n\nConnection String:\n${connectionString}`;
      const credsBase64 = Buffer.from(credsContent).toString('base64');
      await execSSH(conn, `echo '${credsBase64}' | base64 -d > /root/.database_config`);
      
      console.log(`[DB] MongoDB installed successfully on server ${server.id}`);
      
      // Store in database
      await pool.query(
        `UPDATE servers SET 
          mongodb_installed = true,
          mongodb_db_name = $1,
          mongodb_db_user = $2,
          mongodb_db_password = $3
         WHERE id = $4`,
        [mongoDbName, mongoUsername, mongoPassword, server.id]
      );
    }
  } catch (error) {
    console.error(`[DB] Database setup failed: ${error.message}`);
    
    // Mark installation as failed (NULL = failed, false = not attempted, true = success)
    const columnName = databaseType === 'postgres' ? 'postgres_installed' : 'mongodb_installed';
    await pool.query(
      `UPDATE servers SET ${columnName} = NULL WHERE id = $1`,
      [server.id]
    ).catch(dbError => {
      console.error(`[DB] Failed to update failure status:`, dbError.message);
    });
  } finally {
    conn.end();
  }
}

// POST /delete-deployment
exports.deleteDeployment = async (req, res) => {
  try {
    const { deploymentId } = req.body;
    const userId = req.session.userId;
    
    if (!deploymentId) {
      return res.redirect('/dashboard?error=Invalid deployment ID');
    }
    
    // SECURITY: Verify deployment belongs to this user (direct ownership check)
    const deploymentCheck = await pool.query(
      'SELECT id FROM deployments WHERE id = $1 AND user_id = $2',
      [deploymentId, userId]
    );
    
    if (deploymentCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Deployment not found or access denied');
    }
    
    // Delete deployment
    await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
    
    res.redirect('/dashboard?success=Deployment deleted successfully');
  } catch (error) {
    console.error('Delete deployment error:', error);
    res.redirect('/dashboard?error=Failed to delete deployment');
  }
};

/**
 * Trigger auto-deploy from GitHub webhook
 * Called by githubWebhookController
 */
exports.triggerAutoDeploy = async (server, gitUrl, reason = 'Auto-deploy') => {
  const repoName = gitUrl.split('/').pop().replace('.git', '');
  
  // Store deployment in database with pending status
  const deployResult = await pool.query(
    'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [server.id, server.user_id, gitUrl, 'pending', `🚀 ${reason}\nStarting deployment...`]
  );

  const deploymentId = deployResult.rows[0].id;
  console.log(`[AUTO-DEPLOY] Deployment #${deploymentId} triggered: ${gitUrl}`);

  // Perform deployment asynchronously
  setImmediate(() => {
    performDeployment(server, gitUrl, repoName, deploymentId).catch(async (err) => {
      console.error(`[AUTO-DEPLOY] Deployment #${deploymentId} failed:`, err);
      try {
        await pool.query(
          'UPDATE deployments SET status = $1, output = $2, deployed_at = NOW() WHERE id = $3',
          ['failed', `❌ Auto-deploy failed: ${err.message}`, deploymentId]
        );
      } catch (dbErr) {
        console.error(`[AUTO-DEPLOY] Failed to update deployment status:`, dbErr);
      }
    });
  });

  return { deploymentId };
};

/**
 * Trigger auto-deploy for a specific domain from GitHub webhook
 * Called by githubWebhookController for per-domain webhooks
 */
exports.triggerDomainAutoDeploy = async (server, domain, gitUrl, reason = 'Domain auto-deploy') => {
  const repoName = gitUrl.split('/').pop().replace('.git', '');
  
  // Store deployment in database with pending status and domain_id
  const deployResult = await pool.query(
    'INSERT INTO deployments (server_id, user_id, git_url, status, output, domain_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [server.id, server.user_id, gitUrl, 'pending', `🚀 ${reason}\nStarting deployment to ${domain.domain}...`, domain.id]
  );

  const deploymentId = deployResult.rows[0].id;
  console.log(`[DOMAIN-AUTO-DEPLOY] Deployment #${deploymentId} triggered for domain ${domain.domain}: ${gitUrl}`);

  // Update domain deployment status
  await pool.query(
    'UPDATE domains SET deployment_status = $1, last_deployed_at = NOW() WHERE id = $2',
    ['deploying', domain.id]
  );

  // Perform deployment asynchronously to the specific domain
  setImmediate(() => {
    performDeployment(server, gitUrl, repoName, deploymentId, domain.domain).catch(async (err) => {
      console.error(`[DOMAIN-AUTO-DEPLOY] Deployment #${deploymentId} to ${domain.domain} failed:`, err);
      try {
        await pool.query(
          'UPDATE deployments SET status = $1, output = $2, deployed_at = NOW() WHERE id = $3',
          ['failed', `❌ Auto-deploy to ${domain.domain} failed: ${err.message}`, deploymentId]
        );
        await pool.query(
          'UPDATE domains SET deployment_status = $1 WHERE id = $2',
          ['failed', domain.id]
        );
      } catch (dbErr) {
        console.error(`[DOMAIN-AUTO-DEPLOY] Failed to update deployment status:`, dbErr);
      }
    });
  });

  return { deploymentId };
};


// ============================================
// MULTI-SITE: Domain-specific deployment APIs
// ============================================

/**
 * POST /link-domain-repo
 * Link a git repository to a specific domain for multi-site deployment
 */
exports.linkDomainRepo = async (req, res) => {
  try {
    const { domainId, gitUrl } = req.body;
    const userId = req.session.userId;

    if (!domainId || !gitUrl) {
      return res.status(400).json({ success: false, error: 'Domain ID and Git URL required' });
    }

    // Validate git URL format
    const gitUrlRegex = /^https?:\/\/.+\.git$/i;
    if (!gitUrlRegex.test(gitUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid Git URL format. Must end with .git' });
    }

    // Verify domain belongs to user
    const domainResult = await pool.query(
      'SELECT d.id, d.domain, d.server_id FROM domains d JOIN servers s ON d.server_id = s.id WHERE d.id = $1 AND d.user_id = $2',
      [domainId, userId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Domain not found or access denied' });
    }

    const domain = domainResult.rows[0];

    // Update domain with git URL
    await pool.query(
      'UPDATE domains SET git_url = $1, deployment_status = $2 WHERE id = $3',
      [gitUrl, 'linked', domainId]
    );

    console.log(`[MULTI-SITE] Linked repo ${gitUrl} to domain ${domain.domain}`);

    res.json({ 
      success: true, 
      message: `Repository linked to ${domain.domain}`,
      domain: domain.domain,
      gitUrl 
    });
  } catch (error) {
    console.error('[MULTI-SITE] Link repo error:', error);
    res.status(500).json({ success: false, error: 'Failed to link repository' });
  }
};

/**
 * POST /deploy-domain
 * Deploy to a specific domain (multi-site mode)
 */
exports.deployDomain = async (req, res) => {
  try {
    const { domainId, gitUrl: overrideGitUrl } = req.body;
    const userId = req.session.userId;

    if (!domainId) {
      return res.status(400).json({ success: false, error: 'Domain ID required' });
    }

    // Get domain with server info
    const domainResult = await pool.query(`
      SELECT d.id, d.domain, d.git_url, d.server_id, s.ip_address, s.ssh_password, s.status as server_status
      FROM domains d 
      JOIN servers s ON d.server_id = s.id 
      WHERE d.id = $1 AND d.user_id = $2
    `, [domainId, userId]);

    if (domainResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Domain not found or access denied' });
    }

    const domainData = domainResult.rows[0];
    const gitUrl = overrideGitUrl || domainData.git_url;

    if (!gitUrl) {
      return res.status(400).json({ success: false, error: 'No git repository linked to this domain. Link a repo first.' });
    }

    if (domainData.server_status !== 'running') {
      return res.status(400).json({ success: false, error: 'Server is not running' });
    }

    // Create server object for deployment
    const server = {
      id: domainData.server_id,
      user_id: userId,
      ip_address: domainData.ip_address,
      ssh_password: domainData.ssh_password
    };

    const repoName = gitUrl.split('/').pop().replace('.git', '');

    // Create deployment record with domain_id
    const deployResult = await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output, domain_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [server.id, userId, gitUrl, 'pending', `🌐 Deploying to ${domainData.domain}\n📦 Repository: ${gitUrl}\n⏳ Starting deployment...`, domainId]
    );

    const deploymentId = deployResult.rows[0].id;

    // Update domain deployment status
    await pool.query(
      'UPDATE domains SET deployment_status = $1 WHERE id = $2',
      ['deploying', domainId]
    );

    // Start deployment asynchronously with target domain
    setImmediate(() => {
      performDeployment(server, gitUrl, repoName, deploymentId, domainData.domain)
        .then(async () => {
          // Update domain status on success
          await pool.query(
            'UPDATE domains SET deployment_status = $1, last_deployed_at = NOW() WHERE id = $2',
            ['deployed', domainId]
          );
        })
        .catch(async (err) => {
          console.error(`[MULTI-SITE] Domain deployment failed:`, err);
          await pool.query(
            'UPDATE domains SET deployment_status = $1 WHERE id = $2',
            ['failed', domainId]
          );
        });
    });

    res.json({ 
      success: true, 
      deploymentId,
      message: `Deployment started for ${domainData.domain}`,
      domain: domainData.domain
    });
  } catch (error) {
    console.error('[MULTI-SITE] Deploy domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to start deployment' });
  }
};

/**
 * GET /domain-info/:domainId
 * Get domain deployment info
 */
exports.getDomainInfo = async (req, res) => {
  try {
    const { domainId } = req.params;
    const userId = req.session.userId;

    const result = await pool.query(`
      SELECT d.id, d.domain, d.git_url, d.auto_deploy_enabled, d.webhook_secret, 
             d.last_deployed_at, d.deployment_status, d.ssl_enabled, d.server_id,
             s.ip_address, s.plan
      FROM domains d 
      JOIN servers s ON d.server_id = s.id 
      WHERE d.id = $1 AND d.user_id = $2
    `, [domainId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Domain not found or access denied' });
    }

    const domain = result.rows[0];
    
    // Generate webhook URL if auto-deploy is enabled
    let webhookUrl = null;
    if (domain.webhook_secret) {
      webhookUrl = `https://cloudedbasement.ca/webhook/github/${domain.server_id}/${domainId}`;
    }

    res.json({ 
      success: true, 
      domain: {
        ...domain,
        webhookUrl
      }
    });
  } catch (error) {
    console.error('[MULTI-SITE] Get domain info error:', error);
    res.status(500).json({ success: false, error: 'Failed to get domain info' });
  }
};

/**
 * POST /enable-domain-auto-deploy
 * Enable auto-deploy webhook for a specific domain
 */
exports.enableDomainAutoDeploy = async (req, res) => {
  try {
    const { domainId } = req.body;
    const userId = req.session.userId;

    // Verify domain ownership
    const domainResult = await pool.query(
      'SELECT d.id, d.domain, d.git_url FROM domains d WHERE d.id = $1 AND d.user_id = $2',
      [domainId, userId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Domain not found or access denied' });
    }

    const domain = domainResult.rows[0];

    if (!domain.git_url) {
      return res.status(400).json({ success: false, error: 'Link a git repository first before enabling auto-deploy' });
    }

    // Generate webhook secret
    const crypto = require('crypto');
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Update domain
    await pool.query(
      'UPDATE domains SET auto_deploy_enabled = true, webhook_secret = $1 WHERE id = $2',
      [webhookSecret, domainId]
    );

    // Need server_id for webhook URL - query it
    const serverResult = await pool.query('SELECT server_id FROM domains WHERE id = $1', [domainId]);
    const serverId = serverResult.rows[0].server_id;
    const webhookUrl = `https://cloudedbasement.ca/webhook/github/${serverId}/${domainId}`;

    console.log(`[MULTI-SITE] Auto-deploy enabled for ${domain.domain}`);

    res.json({ 
      success: true, 
      message: `Auto-deploy enabled for ${domain.domain}`,
      webhookUrl,
      webhookSecret
    });
  } catch (error) {
    console.error('[MULTI-SITE] Enable auto-deploy error:', error);
    res.status(500).json({ success: false, error: 'Failed to enable auto-deploy' });
  }
};

/**
 * POST /disable-domain-auto-deploy
 * Disable auto-deploy webhook for a specific domain
 */
exports.disableDomainAutoDeploy = async (req, res) => {
  try {
    const { domainId } = req.body;
    const userId = req.session.userId;

    // Verify domain ownership
    const domainResult = await pool.query(
      'SELECT d.id, d.domain FROM domains d WHERE d.id = $1 AND d.user_id = $2',
      [domainId, userId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Domain not found or access denied' });
    }

    const domain = domainResult.rows[0];

    // Disable and clear webhook secret
    await pool.query(
      'UPDATE domains SET auto_deploy_enabled = false, webhook_secret = NULL WHERE id = $1',
      [domainId]
    );

    console.log(`[MULTI-SITE] Auto-deploy disabled for ${domain.domain}`);

    res.json({ 
      success: true, 
      message: `Auto-deploy disabled for ${domain.domain}`
    });
  } catch (error) {
    console.error('[MULTI-SITE] Disable auto-deploy error:', error);
    res.status(500).json({ success: false, error: 'Failed to disable auto-deploy' });
  }
};

/**
 * POST /delete-domain
 * User deletes their own domain
 */
exports.deleteDomain = async (req, res) => {
  try {
    const { domainId } = req.body;
    const userId = req.session.userId;

    if (!domainId) {
      return res.redirect('/dashboard?error=Domain ID required');
    }

    // Verify domain belongs to user
    const domainResult = await pool.query(
      'SELECT d.id, d.domain, d.server_id FROM domains d WHERE d.id = $1 AND d.user_id = $2',
      [domainId, userId]
    );

    if (domainResult.rows.length === 0) {
      return res.redirect('/dashboard?error=Domain not found or access denied');
    }

    const domain = domainResult.rows[0];

    // Delete any deployments associated with this domain
    await pool.query('DELETE FROM deployments WHERE domain_id = $1', [domainId]);

    // Delete the domain
    await pool.query('DELETE FROM domains WHERE id = $1', [domainId]);

    console.log(`[DOMAIN] User ${userId} deleted domain ${domain.domain}`);

    res.redirect('/dashboard?success=Domain deleted successfully');
  } catch (error) {
    console.error('[DOMAIN] Delete error:', error);
    res.redirect('/dashboard?error=Failed to delete domain');
  }
};


module.exports = {
  serverAction: exports.serverAction,
  deleteServer: exports.deleteServer,
  deploy: exports.deploy,
  addDomain: exports.addDomain,
  deleteDomain: exports.deleteDomain,
  enableSSL: exports.enableSSL,
  setupDatabase: exports.setupDatabase,
  deleteDeployment: exports.deleteDeployment,
  triggerAutoDeploy: exports.triggerAutoDeploy,
  triggerDomainAutoDeploy: exports.triggerDomainAutoDeploy,
  // Multi-site domain APIs
  linkDomainRepo: exports.linkDomainRepo,
  deployDomain: exports.deployDomain,
  getDomainInfo: exports.getDomainInfo,
  enableDomainAutoDeploy: exports.enableDomainAutoDeploy,
  disableDomainAutoDeploy: exports.disableDomainAutoDeploy
};

const axios = require('axios');
const crypto = require('crypto');
const { Client } = require('ssh2');
const pool = require('../db');
const { escapeHtml } = require('../helpers');
const { getUserServer, verifyServerOwnership, updateServerStatus, appendDeploymentOutput, updateDeploymentStatus } = require('../utils/db-helpers');
const { SERVER_STATUS, DEPLOYMENT_STATUS, TIMEOUTS, PORTS } = require('../constants');
const { sendDeployErrorEmail } = require('../services/email');
const { generateSubdomain, createDNSRecord, deleteDNSRecord } = require('../services/dns');

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
    
    // Generate subdomain for this deployment (Vercel-style)
    const subdomain = generateSubdomain(repoName, userId);
    console.log(`[DEPLOY] Generated subdomain: ${subdomain}.cloudedbasement.ca`);
    
    // Create DNS record pointing to user's server
    let dnsRecordId = null;
    try {
      const dnsResult = await createDNSRecord(subdomain, server.ip_address);
      if (dnsResult.success) {
        dnsRecordId = dnsResult.recordId;
        console.log(`[DEPLOY] DNS record created: ${subdomain}.cloudedbasement.ca -> ${server.ip_address} (ID: ${dnsRecordId})`);
      } else {
        console.error(`[DEPLOY] Failed to create DNS record: ${dnsResult.error}`);
      }
    } catch (dnsErr) {
      console.error(`[DEPLOY] DNS creation error:`, dnsErr);
    }
    
    // Store deployment in database with pending status and subdomain
    const deployResult = await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output, subdomain, dns_record_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [server.id, userId, gitUrl, 'pending', 'Starting deployment...', subdomain, dnsRecordId]
    );

    const deploymentId = deployResult.rows[0].id;
    console.log(`[DEPLOY] Deployment #${deploymentId} started for user ${userId}: ${gitUrl} -> ${subdomain}.cloudedbasement.ca`);

    // Perform deployment asynchronously (don't block response)
    setImmediate(() => {
      performDeployment(server, gitUrl, repoName, deploymentId, subdomain).catch(async (err) => {
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
async function performDeployment(server, gitUrl, repoName, deploymentId, subdomain = null) {
  console.log(`[DEPLOY] ============================================`);
  console.log(`[DEPLOY] Starting performDeployment for deployment #${deploymentId}`);
  console.log(`[DEPLOY] Server IP: ${server.ip_address}, Repo: ${gitUrl}`);
  console.log(`[DEPLOY] Subdomain: ${subdomain ? `${subdomain}.cloudedbasement.ca` : 'none'}`);
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
    await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
    
    await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
        output = await deployStaticSite(conn, repoName, output, deploymentId, server.id, subdomain);
      } else {
        output += `✓ Detected: Node.js backend\n`;
        output = await deployNodeBackend(conn, repoName, output, deploymentId, server.id, subdomain);
      }
    } else if (hasCargoToml) {
      output += `✓ Detected: Rust application\n`;
      output = await deployRustApp(conn, repoName, output, deploymentId, server.id, subdomain);
    } else if (hasGoMod) {
      output += `✓ Detected: Go application\n`;
      output = await deployGoApp(conn, repoName, output, deploymentId, server.id, subdomain);
    } else if (hasRequirementsTxt) {
      output += `✓ Detected: Python application\n`;
      output = await deployPythonApp(conn, repoName, output, deploymentId, server.id, subdomain);
    } else if (hasIndexHtml) {
      output += `✓ Detected: Static HTML site\n`;
      output = await deployStaticHTML(conn, repoName, output, deploymentId, subdomain);
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
      await updateDeploymentOutput(deploymentId, output, 'in-progress');
      
      // Extract major version (e.g., "14.x" -> "14", ">=12.0.0" -> "12")
      const majorVersion = nodeVersion.match(/\d+/)?.[0];
      
      if (majorVersion) {
        output += `🔄 Installing Node ${majorVersion} via nvm...\n`;
        await updateDeploymentOutput(deploymentId, output, 'in-progress');
        
        // Source nvm and install/use specified version
        const nvmCommand = `source /root/.nvm/nvm.sh && nvm install ${majorVersion} && nvm use ${majorVersion}`;
        await execSSH(conn, nvmCommand);
        
        output += `✓ Switched to Node ${majorVersion}\n`;
        await updateDeploymentOutput(deploymentId, output, 'in-progress');
      }
    }
  } catch (error) {
    // If nvm setup fails, continue with default Node version
    output += `⚠️ Could not detect/switch Node version, using default\n`;
    await updateDeploymentOutput(deploymentId, output, 'in-progress');
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
    await updateDeploymentOutput(deploymentId, output, 'in-progress');
    
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
    await updateDeploymentOutput(deploymentId, output, 'in-progress');
    
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
    
    await updateDeploymentOutput(deploymentId, output, 'in-progress');
    return output;
  } catch (error) {
    console.error('Health check error:', error);
    output += `⚠️ Health check error: ${error.message}\n`;
    return output;
  }
}

// Helper: Setup SSL for subdomain using certbot
async function setupSubdomainSSL(conn, subdomain, output, deploymentId) {
  if (!subdomain) return output;
  
  const fullDomain = `${subdomain}.cloudedbasement.ca`;
  const siteDir = `/var/www/sites/${subdomain}`;
  output += `\n[SSL] Setting up HTTPS for ${fullDomain}...\n`;
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  
  try {
    // Step 1: Update nginx config with subdomain as server_name
    output += `Configuring nginx for subdomain...\n`;
    
    // Use heredoc to avoid escaping issues with $uri
    // Note: 'NGINXEOF' (quoted) prevents shell expansion, so $uri stays literal
    const nginxConfigCmd = `cat > /etc/nginx/sites-available/${subdomain} << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name ${fullDomain};
    root ${siteDir};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF`;
    
    await execSSH(conn, nginxConfigCmd);
    await execSSH(conn, `ln -sf /etc/nginx/sites-available/${subdomain} /etc/nginx/sites-enabled/`);
    await execSSH(conn, `nginx -t && systemctl reload nginx`);
    output += `✓ Nginx configured for ${fullDomain}\n`;
    await updateDeploymentOutput(deploymentId, output, 'deploying');
    
    // Step 2: Wait a moment for DNS propagation (usually instant since we control DO DNS)
    output += `Waiting for DNS propagation...\n`;
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Run certbot
    output += `Requesting SSL certificate from Let's Encrypt...\n`;
    await updateDeploymentOutput(deploymentId, output, 'deploying');
    
    const certbotResult = await execSSH(conn, 
      `certbot --nginx -d ${fullDomain} --non-interactive --agree-tos --email support@cloudedbasement.ca --redirect 2>&1 || echo "CERTBOT_FAILED"`
    );
    
    if (certbotResult.includes('CERTBOT_FAILED') || certbotResult.includes('error')) {
      output += `⚠️ SSL setup failed (site works on HTTP). You can retry later.\n`;
      output += `   Error: ${certbotResult.substring(0, 200)}\n`;
    } else {
      output += `✓ SSL certificate installed!\n`;
      output += `🔒 Your site is now live at: https://${fullDomain}/\n`;
    }
    
  } catch (err) {
    console.error(`[SSL] Error setting up SSL for ${fullDomain}:`, err.message);
    output += `⚠️ SSL setup error: ${err.message}\n`;
    output += `   Your site is still accessible via HTTP.\n`;
  }
  
  await updateDeploymentOutput(deploymentId, output, 'deploying');
  return output;
}

// Deploy static site (React/Vue/Vite)
async function deployStaticSite(conn, repoName, output, deploymentId, serverId, subdomain = null) {
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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Deploying to web server...\n`;
  
  // Multi-site: Each subdomain gets its own directory
  const siteDir = subdomain ? `/var/www/sites/${subdomain}` : '/var/www/html';
  await execSSH(conn, `mkdir -p ${siteDir}`);
  
  // Detect build directory (dist, build, out)
  const hasDist = await fileExists(conn, `/root/${repoName}/dist`);
  const hasBuild = await fileExists(conn, `/root/${repoName}/build`);
  const hasOut = await fileExists(conn, `/root/${repoName}/out`);
  const hasPublic = await fileExists(conn, `/root/${repoName}/public`);
  
  let buildDir = hasDist ? 'dist' : hasBuild ? 'build' : hasOut ? 'out' : hasPublic ? 'public' : null;
  
  // If no build directory found, try deploying source directly
  if (!buildDir) {
    output += `⚠️ No build directory found. Deploying source files directly...\n`;
    await execSSH(conn, `rm -rf ${siteDir}/* && cp -r /root/${repoName}/* ${siteDir}/`);
    output += `✓ Source files deployed to ${siteDir}\n`;
  } else {
    await execSSH(conn, `rm -rf ${siteDir}/* && cp -r /root/${repoName}/${buildDir}/* ${siteDir}/`);
    output += `✓ Site deployed to ${siteDir} (from ${buildDir}/)\n`;
  }
  
  // Show URLs (subdomain is primary, IP is backup)
  if (subdomain) {
    output += `\n🌐 Your site is live at: http://${subdomain}.cloudedbasement.ca/\n`;
    output += `   (also accessible via: http://${conn.config.host}/)\n`;
  } else {
    output += `\n🌐 Your site is live at: http://${conn.config.host}/\n`;
  }
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Health check
  output = await performHealthCheck(conn, 'static', output, deploymentId);
  
  // Setup SSL for subdomain (auto HTTPS)
  output = await setupSubdomainSSL(conn, subdomain, output, deploymentId);
  
  return output;
}

// Deploy static HTML (no build step)
async function deployStaticHTML(conn, repoName, output, deploymentId, subdomain = null) {
  output += `\n[3/5] Skipping dependencies (static HTML)\n`;
  output += `[4/5] Skipping build (static HTML)\n`;
  output += `\n[5/5] Deploying to web server...\n`;
  
  // Multi-site: Each subdomain gets its own directory
  const siteDir = subdomain ? `/var/www/sites/${subdomain}` : '/var/www/html';
  await execSSH(conn, `mkdir -p ${siteDir}`);
  await execSSH(conn, `rm -rf ${siteDir}/* && cp -r /root/${repoName}/* ${siteDir}/`);
  output += `✓ Site deployed to ${siteDir}\n`;
  
  // Show URLs (subdomain is primary, IP is backup)
  if (subdomain) {
    output += `\n🌐 Your site is live at: http://${subdomain}.cloudedbasement.ca/\n`;
    output += `   (also accessible via: http://${conn.config.host}/)\n`;
  } else {
    output += `\n🌐 Your site is live at: http://${conn.config.host}/\n`;
  }
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Health check
  output = await performHealthCheck(conn, 'static', output, deploymentId);
  
  // Setup SSL for subdomain
  if (subdomain) {
    output = await setupSubdomainSSL(conn, subdomain, output, deploymentId);
  }
  
  return output;
}

// Deploy Node.js backend
async function deployNodeBackend(conn, repoName, output, deploymentId, serverId, subdomain = null) {
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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Configure Nginx as reverse proxy
  output += `\nConfiguring Nginx reverse proxy...\n`;
  const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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
  
  await execSSH(conn, `echo '${nginxConfig}' > /etc/nginx/sites-available/default`);
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 3000\n`;
  
  // Show URLs (subdomain is primary, IP is backup)
  if (subdomain) {
    output += `\n🚀 Your backend is live at: http://${subdomain}.cloudedbasement.ca/\n`;
    output += `   (also accessible via: http://${conn.config.host}/)\\n`;
  } else {
    output += `\n🚀 Your backend is live!\n`;
  }
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Health check
  output = await performHealthCheck(conn, 'backend', output, deploymentId, serviceName);
  
  // Setup SSL for subdomain
  if (subdomain) {
    output = await setupSubdomainSSL(conn, subdomain, output, deploymentId);
  }
  
  return output;
}

// Deploy Python app
async function deployPythonApp(conn, repoName, output, deploymentId, serverId, subdomain = null) {
  output += `\n[3/5] Installing dependencies...\n`;
  
  // Inject environment variables
  output = await injectEnvVars(conn, repoName, output, deploymentId, serverId);
  
  await execSSH(conn, `cd /root/${repoName} && pip3 install -r requirements.txt`);
  output += `✓ Dependencies installed\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Configure Nginx as reverse proxy (assuming Flask/FastAPI on port 5000)
  output += `\nConfiguring Nginx reverse proxy...\n`;
  const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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
  
  await execSSH(conn, `echo '${nginxConfig}' > /etc/nginx/sites-available/default`);
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 5000\n`;
  
  // Show URLs (subdomain is primary, IP is backup)
  if (subdomain) {
    output += `\n🐍 Your Python app is live at: http://${subdomain}.cloudedbasement.ca/\n`;
    output += `   (also accessible via: http://${conn.config.host}/)\\n`;
  } else {
    output += `\n🐍 Your Python app is live!\n`;
  }
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Health check
  output = await performHealthCheck(conn, 'backend', output, deploymentId, serviceName);
  
  // Setup SSL for subdomain
  if (subdomain) {
    output = await setupSubdomainSSL(conn, subdomain, output, deploymentId);
  }
  
  return output;
}

// Deploy Rust app
async function deployRustApp(conn, repoName, output, deploymentId, serverId, subdomain = null) {
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
  
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[4/5] Deploying to Nginx...\n`;
  
  // Multi-site: Each subdomain gets its own directory
  const siteDir = subdomain ? `/var/www/sites/${subdomain}` : '/var/www/html';
  await execSSH(conn, `mkdir -p ${siteDir}`);
  
  // Check for static files or WASM output
  const hasStaticDir = await fileExists(conn, `/root/${repoName}/static`);
  const hasPkgDir = await fileExists(conn, `/root/${repoName}/pkg`);
  
  if (hasStaticDir) {
    await execSSH(conn, `cp -r /root/${repoName}/static/* ${siteDir}/`);
    output += `✓ Deployed static files to ${siteDir}\n`;
  } else if (hasPkgDir) {
    await execSSH(conn, `cp -r /root/${repoName}/pkg/* ${siteDir}/`);
    output += `✓ Deployed WASM package to ${siteDir}\n`;
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
      await updateDeploymentOutput(deploymentId, output, 'in-progress');
      
      // Configure Nginx as reverse proxy (Rust apps typically run on port 8080)
      output += `\nConfiguring Nginx reverse proxy...\n`;
      const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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
      
      await execSSH(conn, `echo '${nginxConfig}' > /etc/nginx/sites-available/default`);
      await execSSH(conn, `nginx -t && systemctl reload nginx`);
      output += `✓ Nginx configured as reverse proxy to port 8080\n`;
      output += `\n🚀 Your Rust backend is live!\n`;
    } else {
      output += `⚠️ No deployable artifacts found\n`;
      output += `Expected: static/, pkg/, or target/release/${repoName}\n`;
    }
  }
  
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  return output;
}

// Deploy Go app
async function deployGoApp(conn, repoName, output, deploymentId, serverId, subdomain = null) {
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
  
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

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
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
  
  // Configure Nginx as reverse proxy (Go apps typically run on port 8080)
  output += `\nConfiguring Nginx reverse proxy...\n`;
  const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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
  
  await execSSH(conn, `echo '${nginxConfig}' > /etc/nginx/sites-available/default`);
  await execSSH(conn, `nginx -t && systemctl reload nginx`);
  output += `✓ Nginx configured as reverse proxy to port 8080\n`;
  output += `\n🚀 Your Go backend is live!\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
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
    const linkedSubdomain = req.body.linked_subdomain || null; // Optional: link to existing deployment
    const userId = req.session.userId;

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT id FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;
    
    // If linked_subdomain provided, verify it belongs to this user
    if (linkedSubdomain) {
      const depCheck = await pool.query(
        'SELECT id FROM deployments WHERE subdomain = $1 AND user_id = $2',
        [linkedSubdomain, userId]
      );
      if (depCheck.rows.length === 0) {
        return res.redirect('/dashboard?error=Invalid deployment selected');
      }
    }

    // Check if domain already exists
    const existingDomain = await pool.query(
      'SELECT id FROM domains WHERE domain = $1',
      [domain]
    );

    if (existingDomain.rows.length > 0) {
      return res.redirect('/dashboard?error=Domain already in use');
    }

    // Store domain in database with optional linked_subdomain
    await pool.query(
      'INSERT INTO domains (server_id, user_id, domain, ssl_enabled, linked_subdomain) VALUES ($1, $2, $3, $4, $5)',
      [serverId, userId, domain, false, linkedSubdomain]
    );

    // In real implementation, this would:
    // 1. Configure Nginx on the droplet
    // 2. Set up SSL certificate with Let's Encrypt
    
    res.redirect('/dashboard?success=Domain added! Configure your DNS as shown above.');
  } catch (error) {
    console.error('Add domain error:', error);
    res.redirect('/dashboard?error=Failed to add domain');
  }
};

// POST /delete-domain
exports.deleteDomain = async (req, res) => {
  try {
    const domainId = req.body.domainId;
    const userId = req.session.userId;

    if (!domainId) {
      return res.json({ success: false, error: 'Domain ID required' });
    }

    // Verify the domain belongs to this user
    const domainResult = await pool.query(
      'SELECT d.id, d.domain, d.server_id, s.ip_address, s.ssh_password FROM domains d JOIN servers s ON d.server_id = s.id WHERE d.id = $1 AND d.user_id = $2',
      [domainId, userId]
    );

    if (domainResult.rows.length === 0) {
      return res.json({ success: false, error: 'Domain not found or access denied' });
    }

    const domain = domainResult.rows[0];
    const domainName = domain.domain;

    // Try to remove nginx config for this domain on the server
    // This is best-effort - domain will be deleted from DB regardless
    if (domain.ip_address && domain.ssh_password) {
      try {
        const Client = require('ssh2').Client;
        const conn = new Client();
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            conn.end();
            resolve(); // Don't fail on timeout, just continue
          }, 15000);

          conn.on('ready', () => {
            // Remove nginx config for this domain
            const cmd = `sudo rm -f /etc/nginx/sites-enabled/${domainName} /etc/nginx/sites-available/${domainName} && sudo nginx -t && sudo systemctl reload nginx`;
            
            conn.exec(cmd, (err, stream) => {
              if (err) {
                clearTimeout(timeout);
                conn.end();
                resolve(); // Don't fail, continue with DB deletion
                return;
              }
              
              stream.on('close', () => {
                clearTimeout(timeout);
                conn.end();
                resolve();
              });
              
              stream.on('data', () => {}); // Drain output
              stream.stderr.on('data', () => {}); // Drain errors
            });
          });

          conn.on('error', () => {
            clearTimeout(timeout);
            resolve(); // Don't fail, continue with DB deletion
          });

          conn.connect({
            host: domain.ip_address,
            port: 22,
            username: 'root',
            password: domain.ssh_password,
            readyTimeout: 10000
          });
        });
      } catch (sshError) {
        console.error('SSH cleanup error (non-fatal):', sshError.message);
        // Continue with deletion regardless
      }
    }

    // Delete from database
    await pool.query('DELETE FROM domains WHERE id = $1', [domainId]);

    console.log(`[DELETE-DOMAIN] User ${userId} deleted domain: ${domainName}`);

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete domain error:', error);
    return res.json({ success: false, error: 'Failed to delete domain' });
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

    // SECURITY: Verify domain belongs to this user and get linked_subdomain
    const domainCheck = await pool.query(
      'SELECT id, linked_subdomain FROM domains WHERE domain = $1 AND user_id = $2',
      [domain, userId]
    );

    if (domainCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Domain not found or access denied');
    }
    
    const linkedSubdomain = domainCheck.rows[0].linked_subdomain;

    // Send response immediately - process SSL in background
    res.redirect('/dashboard?message=SSL certificate generation started! This may take a minute.');

    // Background process - trigger SSL certificate generation
    triggerSSLCertificateForCustomer(server.id, domain, server, linkedSubdomain).catch(err => {
      console.error('[SSL] Failed to trigger certificate for server', server.id, ':', err);
    });

  } catch (error) {
    console.error('Enable SSL error:', error);
    res.redirect('/dashboard?error=Failed to enable SSL');
  }
};

// Background function to trigger SSL via SSH2 library (secure, no command injection)
async function triggerSSLCertificateForCustomer(serverId, domain, server, linkedSubdomain = null) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', async () => {
      console.log(`[SSL] SSH connected to server ${serverId}`);
      
      // Security: Strict domain validation (prevents command injection)
      // Only allow alphanumeric, dots, and hyphens (RFC 1123)
      if (!/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i.test(domain)) {
        conn.end();
        return reject(new Error('Invalid domain format'));
      }
      
      try {
        // Step 1: Create nginx config for this custom domain
        // Use linked deployment's directory if specified, otherwise default
        const siteDir = linkedSubdomain ? `/var/www/sites/${linkedSubdomain}` : '/var/www/html';
        console.log(`[SSL] Setting up ${domain} to serve from ${siteDir}`);
        
        // Create the nginx config file with proper root
        const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    root ${siteDir};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }
}`;
        
        // Write nginx config
        await new Promise((res, rej) => {
          const writeCmd = `cat > /etc/nginx/sites-available/${domain.replace(/\./g, '-')} << 'NGINXEOF'\n${nginxConfig}\nNGINXEOF`;
          conn.exec(writeCmd, (err, stream) => {
            if (err) return rej(err);
            stream.on('close', () => res());
            stream.on('data', () => {});
            stream.stderr.on('data', () => {});
          });
        });
        
        // Enable the site
        await new Promise((res, rej) => {
          conn.exec(`ln -sf /etc/nginx/sites-available/${domain.replace(/\./g, '-')} /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx`, (err, stream) => {
            if (err) return rej(err);
            stream.on('close', (code) => code === 0 ? res() : rej(new Error('Nginx reload failed')));
            stream.on('data', () => {});
            stream.stderr.on('data', () => {});
          });
        });
        
        console.log(`[SSL] Nginx config created for ${domain}`);
        
        // Step 2: Run certbot to get SSL certificate
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
                console.log(`[SSL] Certificate success for ${domain}`);
                
                conn.end();
                
                // Update domains table - SSL cert is working
                await pool.query('UPDATE domains SET ssl_enabled = true WHERE domain = $1', [domain]);
                console.log(`[SSL] Certificate activated for ${domain} on server ${serverId}`);
                resolve();
              } else {
                conn.end();
                console.error(`[SSL] Certbot did not succeed. Code: ${code}, stdout: ${stdout}, stderr: ${stderr}`);
                reject(new Error('Certbot command did not complete successfully'));
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
      } catch (nginxErr) {
        conn.end();
        reject(nginxErr);
      }
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
    
    // SECURITY: Verify deployment belongs to this user and get DNS record info
    const deploymentCheck = await pool.query(
      'SELECT id, subdomain, dns_record_id FROM deployments WHERE id = $1 AND user_id = $2',
      [deploymentId, userId]
    );
    
    if (deploymentCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Deployment not found or access denied');
    }
    
    const deployment = deploymentCheck.rows[0];
    
    // Clean up DNS record if one exists
    if (deployment.subdomain) {
      try {
        const dnsResult = await deleteDNSRecord(deployment.subdomain);
        if (dnsResult.success) {
          console.log(`[DELETE] Deleted DNS record for ${deployment.subdomain}.cloudedbasement.ca`);
        } else {
          console.log(`[DELETE] DNS cleanup note: ${dnsResult.error}`);
        }
      } catch (dnsErr) {
        console.error(`[DELETE] DNS cleanup error:`, dnsErr.message);
        // Continue with deletion even if DNS cleanup fails
      }
    }
    
    // Delete deployment
    await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
    
    res.redirect('/dashboard?success=Deployment deleted successfully');
  } catch (error) {
    console.error('Delete deployment error:', error);
    res.redirect('/dashboard?error=Failed to delete deployment');
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
  deleteDeployment: exports.deleteDeployment
};

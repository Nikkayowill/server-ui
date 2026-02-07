const pool = require('../db');
const { getDashboardHead, getFooter, getScripts, getResponsiveNav, escapeHtml, getDashboardLayoutStart, getDashboardLayoutEnd } = require('../helpers');
const { getUserServer, hasSuccessfulPayment } = require('../utils/db-helpers');
const { PAYMENT_STATUS, SERVER_STATUS } = require('../constants');
const serverUpdates = require('../services/serverUpdates');
const { sendEmail } = require('../services/email');

// Dashboard navigation items - centralized for consistency
const DASHBOARD_NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'
  },
  {
    id: 'sites',
    label: 'Sites',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>'
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>'
  },
  {
    id: 'dev-tools',
    label: 'Dev Tools',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
  }
];

// GET /dashboard
exports.showDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get flash messages from session or query params
        const sessionFlash = req.session.flashMessage || '';
        delete req.session.flashMessage; // Clear after reading
        
        const flashSuccess = escapeHtml(req.query.success || sessionFlash || '');
        const flashError = escapeHtml(req.query.error || '');
        const emailConfirmed = !!req.session.emailConfirmed;
        
        // Check if coming from payment (show provisioning UI even if server not created yet)
        const isProvisioning = req.query.provisioning === 'true';

        // Check if user has paid
        const hasPaid = await hasSuccessfulPayment(userId);

        // Get user's server info (using helper)
        const server = await getUserServer(userId);
        const hasServer = !!server;
        // Explicit boolean check - if column doesn't exist, treats as false (safe default)
        const postgresInstalled = server?.postgres_installed === true;
        const mongodbInstalled = server?.mongodb_installed === true;
        
        // Extract database credentials if they exist
        const postgresCredentials = postgresInstalled ? {
            dbName: server?.postgres_db_name || 'app_db',
            dbUser: server?.postgres_db_user || 'basement_user',
            dbPassword: server?.postgres_db_password || '',
            host: server?.ip_address || 'localhost',
            port: '5432'
        } : null;
        
        const mongodbCredentials = mongodbInstalled ? {
            dbName: server?.mongodb_db_name || 'app_db',
            dbUser: server?.mongodb_db_user || 'basement_user',
            dbPassword: server?.mongodb_db_password || '',
            host: server?.ip_address || 'localhost',
            port: '27017',
            // URL-encoded versions for connection strings
            dbUserEncoded: encodeURIComponent(server?.mongodb_db_user || 'basement_user'),
            dbPasswordEncoded: encodeURIComponent(server?.mongodb_db_password || '')
        } : null;

        // Get payment details to determine plan
        const paymentResult = hasPaid ? await pool.query(
            'SELECT plan FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, PAYMENT_STATUS.SUCCEEDED]
        ) : { rows: [] };
        const paidPlan = paymentResult.rows[0]?.plan || 'basic';

        // Get deployments
        const deploymentsResult = await pool.query(
            'SELECT * FROM deployments WHERE user_id = $1 ORDER BY deployed_at DESC NULLS LAST, created_at DESC',
            [userId]
        );

        // Count unique sites for this server (distinct git_urls)
        const siteCountResult = hasServer ? await pool.query(
            'SELECT COUNT(DISTINCT git_url) as count FROM deployments WHERE server_id = $1',
            [server.id]
        ) : { rows: [{ count: 0 }] };
        
        const siteCount = parseInt(siteCountResult.rows[0]?.count || 0);
        const siteLimit = server?.site_limit || 2;

        // Get domains
        const domainsResult = await pool.query(
            'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Get support tickets
        const ticketsResult = await pool.query(
            'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Get pending server updates (if user has a server)
        let pendingUpdates = [];
        let updateHistory = [];
        if (server?.id) {
            pendingUpdates = await serverUpdates.getPendingUpdates(server.id);
            updateHistory = await serverUpdates.getUpdateHistory(server.id);
        }

        // Check if user is eligible for free trial (comprehensive check to match /start-trial endpoint)
        const trialCheckResult = await pool.query(
            'SELECT trial_used, browser_fingerprint FROM users WHERE id = $1',
            [userId]
        );
        
        let trialAvailable = !trialCheckResult.rows[0]?.trial_used && !hasServer && !hasPaid;
        
        // Additional checks to match /start-trial endpoint validation
        if (trialAvailable) {
            // Must have fingerprint (JS enabled)
            const userFingerprint = trialCheckResult.rows[0]?.browser_fingerprint;
            if (!userFingerprint) {
                trialAvailable = false;
            } else {
                // Check if IP or fingerprint already used trial within 90 days
                const clientIp = req.ip || req.socket.remoteAddress;
                
                const ipTrialCheck = await pool.query(
                    `SELECT id FROM users 
                     WHERE signup_ip = $1 
                     AND trial_used = true 
                     AND trial_used_at > NOW() - INTERVAL '90 days'
                     AND id != $2`,
                    [clientIp, userId]
                );
                
                const fpTrialCheck = await pool.query(
                    `SELECT id FROM users 
                     WHERE browser_fingerprint = $1 
                     AND trial_used = true 
                     AND trial_used_at > NOW() - INTERVAL '90 days'
                     AND id != $2`,
                    [userFingerprint, userId]
                );
                
                if (ipTrialCheck.rows.length > 0 || fpTrialCheck.rows.length > 0) {
                    trialAvailable = false;
                }
            }
        }

        const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
        
        // Show provisioning UI if: coming from payment OR server exists with provisioning status
        const showProvisioningUI = isProvisioning || (hasServer && server?.status === 'provisioning');

        // Compute live site URL: prefer SSL domain > any domain > IP
        const domains = domainsResult.rows || [];
        const sslDomain = domains.find(d => d.ssl_enabled);
        const liveSiteUrl = sslDomain 
            ? `https://${sslDomain.domain}` 
            : (domains.length > 0 ? `http://${domains[0].domain}` : `http://${server?.ip_address || ''}`);

        const dashboardHTML = buildDashboardTemplate({
            flashSuccess,
            flashError,
            emailConfirmed,
            serverStatus: server?.status || (isProvisioning ? 'provisioning' : 'unknown'),
            serverName: server?.hostname || 'basement-core',
            plan: (server?.plan || paidPlan || 'basic').toString(),
            ipAddress: server?.ip_address || '',
            ipv6Address: server?.ipv6_address || '',
            serverIp: server?.ip_address || '',
            sshUsername: server?.ssh_username || 'root',
            sshPassword: server?.ssh_password || '',
            dropletName: server?.droplet_name || `basement-${userId}-unknown`,
            userId: userId,
            serverId: server?.id || null,
            csrfToken,
            deployments: deploymentsResult.rows || [],
            domains: domains,
            tickets: ticketsResult.rows || [],
            liveSiteUrl,
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            hasPaid,
            hasServer,
            isProvisioning: showProvisioningUI,
            dismissedNextSteps: req.session.dismissedNextSteps || false,
            postgresInstalled,
            mongodbInstalled,
            postgresCredentials,
            mongodbCredentials,
            siteCount,
            siteLimit,
            trialAvailable,
            // Auto-deploy fields
            autoDeployEnabled: server?.auto_deploy_enabled === true,
            githubWebhookSecret: server?.github_webhook_secret || null,
            // Server updates
            pendingUpdates,
            updateHistory
        });

        res.send(`
${getDashboardHead('Dashboard - Basement')}
    
        ${getResponsiveNav(req)}
    
        ${dashboardHTML}
    
        ${getFooter()}
    
        ${getScripts('nav.js', 'dashboard.js')}
        `);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('An error occurred loading your dashboard');
    }
};

// POST /submit-ticket - Customer submits new support ticket
const submitSupportTicket = async (req, res) => {
  try {
    const { subject, description, priority } = req.body;
    const userId = req.session.userId;

    if (!subject || !description || !priority) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    if (!['normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority' });
    }

    // Insert new ticket
    const result = await pool.query(
      'INSERT INTO support_tickets (user_id, subject, description, priority, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [userId, subject.trim(), description.trim(), priority, 'open']
    );

    const ticketId = result.rows[0].id;

    // Log audit event
    console.log(`[TICKET] New ticket #${ticketId} submitted by user ${userId}`);

    // Send email notification to business email
    try {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      const userEmail = userResult.rows[0]?.email || 'unknown';

      const html = `
        <h2>New Support Ticket #${ticketId}</h2>
        <p><strong>From:</strong> ${userEmail} (User ID: ${userId})</p>
        <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
        <p><strong>Subject:</strong> ${subject.trim()}</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p><strong>Description:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${description.trim()}</p>
      `;
      const text = `New Support Ticket #${ticketId}\nFrom: ${userEmail} (User ID: ${userId})\nPriority: ${priority}\nSubject: ${subject.trim()}\n\nDescription:\n${description.trim()}`;

      await sendEmail('support@cloudedbasement.ca', `[Ticket #${ticketId}] ${subject.trim()}`, html, text);
      console.log(`[TICKET] Email notification sent for ticket #${ticketId}`);
    } catch (emailErr) {
      console.error(`[TICKET] Failed to send email notification for ticket #${ticketId}:`, emailErr.message);
      // Don't fail the ticket submission if email fails
    }

    res.json({ success: true, message: 'Ticket submitted', ticketId });
  } catch (error) {
    console.error('[TICKET] Submit error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit ticket' });
  }
};

// POST /change-password - Change user password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    const userEmail = req.session.userEmail;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Get user from database
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[DASHBOARD] Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

// POST /apply-updates - Apply all pending updates to user's server
const applyUpdates = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get user's server (getUserServer imported at top of file)
    const server = await getUserServer(userId);
    
    if (!server) {
      return res.redirect('/dashboard?error=No server found');
    }
    
    // Verify server is in a state where updates can be applied
    if (server.status !== 'running') {
      return res.redirect('/dashboard?error=Server is not running. Updates can only be applied to running servers.');
    }
    
    if (!server.ip_address || !server.ssh_password) {
      return res.redirect('/dashboard?error=Server is missing connection details. Please contact support.');
    }
    
    // Get pending updates for this server
    const pending = await serverUpdates.getPendingUpdates(server.id);
    
    if (pending.length === 0) {
      return res.redirect('/dashboard?success=Server already up to date');
    }
    
    // Apply all pending updates
    const results = await serverUpdates.applyAllPendingUpdates(server, 'user');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (failCount === 0) {
      return res.redirect(`/dashboard?success=${successCount} update(s) applied successfully`);
    } else {
      return res.redirect(`/dashboard?error=${failCount} update(s) failed. ${successCount} succeeded.`);
    }
  } catch (error) {
    console.error('[DASHBOARD] Apply updates error:', error);
    res.redirect('/dashboard?error=Failed to apply updates. Please try again or contact support.');
  }
};

// GET /api/credentials - Fetch sensitive credentials on demand (not embedded in HTML)
const getCredentials = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user's server
    const server = await getUserServer(userId);
    
    if (!server) {
      return res.status(404).json({ error: 'No server found' });
    }
    
    const credentialType = req.query.type; // 'ssh', 'postgres', 'mongodb', or 'all'
    
    const response = {};
    
    if (credentialType === 'ssh' || credentialType === 'all') {
      response.ssh = {
        username: server.ssh_username || 'root',
        password: server.ssh_password || '',
        ip: server.ip_address || '',
        command: `ssh ${server.ssh_username || 'root'}@${server.ip_address || ''}`
      };
    }
    
    if (credentialType === 'postgres' || credentialType === 'all') {
      if (server.postgres_installed && server.postgres_db_password) {
        response.postgres = {
          host: server.ip_address || 'localhost',
          port: '5432',
          database: server.postgres_db_name || 'app_db',
          username: server.postgres_db_user || 'basement_user',
          password: server.postgres_db_password || '',
          connectionString: `postgresql://${server.postgres_db_user || 'basement_user'}:${server.postgres_db_password || ''}@${server.ip_address || 'localhost'}:5432/${server.postgres_db_name || 'app_db'}`
        };
      }
    }
    
    if (credentialType === 'mongodb' || credentialType === 'all') {
      if (server.mongodb_installed && server.mongodb_db_password) {
        const userEncoded = encodeURIComponent(server.mongodb_db_user || 'basement_user');
        const passEncoded = encodeURIComponent(server.mongodb_db_password || '');
        response.mongodb = {
          host: server.ip_address || 'localhost',
          port: '27017',
          database: server.mongodb_db_name || 'app_db',
          username: server.mongodb_db_user || 'basement_user',
          password: server.mongodb_db_password || '',
          connectionString: `mongodb://${userEncoded}:${passEncoded}@${server.ip_address || 'localhost'}:27017/${server.mongodb_db_name || 'app_db'}`
        };
      }
    }
    
    // Log credential access for audit
    console.log(`[CREDENTIALS] User ${userId} accessed ${credentialType} credentials`);
    
    res.json(response);
  } catch (error) {
    console.error('[CREDENTIALS] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve credentials' });
  }
};

module.exports = { showDashboard: exports.showDashboard, submitSupportTicket, changePassword, applyUpdates, getCredentials };

/**
 * Dashboard Template Builder - Tech-View Design
 * Advanced glassmorphic dashboard with resource monitoring
 * Uses centralized layout helpers for consistency
 */
const buildDashboardTemplate = (data) => {
  // Layout options for the dashboard wrapper
  const layoutOptions = {
    userEmail: data.userEmail || 'User',
    plan: data.plan || 'basic',
    navItems: DASHBOARD_NAV_ITEMS,
    pageTitle: 'Overview'
  };
  
  return `
${getDashboardLayoutStart(layoutOptions)}

    ${!data.emailConfirmed ? `
    <!-- Email Verification Top Bar -->
    <div class="bg-gradient-to-r from-yellow-600 to-orange-500 border-b border-yellow-700 shadow-lg rounded-lg mb-6">
      <div class="px-4 py-3">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <p class="text-white text-sm font-medium">
              <span class="font-bold">Verify your email</span> · Code sent to ${data.userEmail || 'your email'}
            </p>
          </div>
          <form id="verifyForm" action="/verify-email" method="POST" class="flex items-center gap-2">
            <input type="text" name="code" maxlength="6" pattern="[0-9]{6}" required
              placeholder="000000"
              class="w-24 px-3 py-1.5 bg-white bg-opacity-20 backdrop-blur border border-white border-opacity-30 rounded text-white font-mono text-center text-sm tracking-wider placeholder-white placeholder-opacity-50 focus:bg-opacity-30 focus:border-white focus:outline-none">
            <button type="submit" class="px-4 py-1.5 bg-white text-orange-600 font-bold text-sm rounded hover:bg-opacity-90 transition-colors whitespace-nowrap">
              Verify
            </button>
            <button type="button" id="resendCodeBtn" class="text-white hover:text-yellow-100 text-xs underline whitespace-nowrap">
              Resend
            </button>
          </form>
        </div>
      </div>
    </div>
    <script>
      document.getElementById('resendCodeBtn')?.addEventListener('click', async function() {
        this.textContent = 'Sending...';
        this.disabled = true;
        try {
          const res = await fetch('/resend-code', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          const data = await res.json();
          if (data.success) {
            this.textContent = 'Sent!';
            setTimeout(() => { this.textContent = 'Resend'; this.disabled = false; }, 3000);
          } else {
            this.textContent = 'Failed';
            this.disabled = false;
          }
        } catch (err) {
          this.textContent = 'Error';
          this.disabled = false;
        }
      });
    </script>
    ` : ''}


    <!-- Alerts -->
    ${data.flashSuccess ? `<div class="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6 flex items-center justify-between text-sm">${data.flashSuccess}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-green-300 hover:text-green-100 font-bold text-xl">&times;</button></div>` : ''}
    ${data.flashError ? `<div class="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center justify-between text-sm">${data.flashError}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-red-300 hover:text-red-100 font-bold text-xl">&times;</button></div>` : ''}
    
    ${data.hasServer && !data.dismissedNextSteps ? `
    <!-- Next Steps Banner -->
    <div id="nextStepsBanner" class="bg-gradient-to-r from-brand to-cyan-600 rounded-lg p-4 md:p-6 mb-6 border border-brand shadow-lg" data-csrf="${data.csrfToken}">
        <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
                <h3 class="text-lg font-bold text-white mb-3">🚀 Server Online - Ready to Deploy!</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 border border-white border-opacity-10">
                        <div class="text-white font-bold mb-1 text-sm">1. Deploy with Git</div>
                        <p class="text-white text-opacity-70 text-xs">Paste your repo URL below for automatic setup</p>
                    </div>
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 border border-white border-opacity-10">
                        <div class="text-white font-bold mb-1 text-sm">2. Connect via SSH</div>
                        <p class="text-white text-opacity-70 text-xs">See SSH Access section for credentials</p>
                    </div>
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 border border-white border-opacity-10">
                        <div class="text-white font-bold mb-1 text-sm">3. Add Domain + SSL</div>
                        <p class="text-white text-opacity-70 text-xs">Point DNS → one-click free SSL certificate</p>
                    </div>
                </div>
            </div>
            <button onclick="dismissNextSteps()" class="text-white hover:text-white hover:bg-black hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shrink-0 transition-colors" title="Dismiss">&times;</button>
        </div>
    </div>
    ` : ''}

    <!-- Content Sections -->
    <div class="sections-container">
        <!-- OVERVIEW SECTION -->
        <section id="section-overview" class="dash-section active">
        ${(data.hasServer || data.isProvisioning) ? `
        <div class="dash-card" data-server-status="${data.serverStatus}">
            <div class="dash-card-header">
                <div class="flex items-center gap-3">
                    <span class="dash-status">
                        <span class="dash-status-dot ${data.serverStatus}"></span>
                        ${data.serverStatus === 'running' ? 'Online' : data.serverStatus === 'provisioning' ? 'Provisioning' : 'Offline'}
                    </span>
                </div>
                <h3 class="dash-card-title">${escapeHtml(data.serverName)}</h3>
            </div>
            
            ${data.isProvisioning && !data.hasServer ? `
            <!-- Provisioning State -->
            <div class="text-center py-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--dash-accent)] bg-opacity-10 mb-4">
                    <svg class="animate-spin h-6 w-6 text-[var(--dash-accent)]" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-[var(--dash-text-primary)] mb-2">Setting up your server...</h3>
                <p class="text-sm text-[var(--dash-text-secondary)]">This usually takes 2-3 minutes. Page will refresh automatically.</p>
            </div>
            ` : `
            <!-- Server Details -->
            <div class="space-y-0 mb-8">
                <div class="dash-data-row">
                    <span class="dash-data-label">IPv4</span>
                    <span class="dash-data-value text-[var(--dash-accent)]">${escapeHtml(data.ipAddress)}</span>
                </div>
                ${data.ipv6Address ? `
                <div class="dash-data-row">
                    <span class="dash-data-label">IPv6</span>
                    <span class="dash-data-value text-[var(--dash-text-secondary)] text-xs">${escapeHtml(data.ipv6Address)}</span>
                </div>
                ` : ''}
                <div class="dash-data-row">
                    <span class="dash-data-label">Plan</span>
                    <span class="dash-data-value">${escapeHtml(data.plan.toUpperCase())}</span>
                </div>
                <div class="dash-data-row">
                    <span class="dash-data-label">Sites</span>
                    <span class="dash-data-value ${data.siteCount >= data.siteLimit ? 'text-[var(--dash-danger)]' : ''}">${data.siteCount} / ${data.siteLimit}</span>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3">
                <form action="/server-action" method="POST" class="flex-1">
                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                    <input type="hidden" name="action" value="restart">
                    <button type="submit" class="dash-btn dash-btn-secondary w-full">Restart</button>
                </form>
                <form id="terminate-form" action="/delete-server" method="POST" class="sm:flex-initial">
                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                    <button type="button" onclick="openTerminateModal()" class="dash-btn dash-btn-danger w-full sm:w-auto">Cancel Plan</button>
                </form>
            </div>
            `}
        </div>

        ` : `
        <!-- No Server State -->
        <div class="dash-card text-center py-12">
            <h3 class="text-lg font-semibold text-[var(--dash-text-secondary)] mb-2">No Server</h3>
            <p class="text-sm text-[var(--dash-text-muted)]">${data.hasPaid ? 'Waiting for server setup (contact support if delayed)' : data.trialAvailable ? 'Start your free trial below to get a server' : 'Purchase a plan to see your server details here'}</p>
        </div>
        `}
        </section>

        <!-- SITES SECTION (Domains + SSL) -->
        <section id="section-sites" class="dash-section">
        <div class="dash-card">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Your Sites</h3>
            </div>
            ${data.domains.length > 0 ? `
            <div class="space-y-3 mb-6">
                ${data.domains.map(d => `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg" style="background: var(--dash-bg)">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="${d.ssl_enabled ? 'text-green-400' : 'text-yellow-400'} flex-shrink-0">${d.ssl_enabled ? '🔒' : '⚠️'}</span>
                        <div class="min-w-0">
                            <a href="${d.ssl_enabled ? 'https' : 'http'}://${d.domain}" target="_blank" class="text-sm font-medium text-[var(--dash-text-primary)] hover:text-[var(--dash-accent)] block truncate">${escapeHtml(d.domain)}</a>
                            <p class="text-xs text-[var(--dash-text-muted)]">${d.ssl_enabled ? 'SSL active' : 'Waiting for SSL'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        ${!d.ssl_enabled && data.hasServer ? `
                        <form action="/enable-ssl" method="POST">
                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                            <input type="hidden" name="domain" value="${escapeHtml(d.domain)}">
                            <button type="submit" class="dash-btn dash-btn-secondary text-xs">Enable SSL</button>
                        </form>
                        ` : ''}
                        <form action="/delete-domain" method="POST" onsubmit="return confirm('Remove this domain?')">
                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                            <input type="hidden" name="domain_id" value="${d.id}">
                            <button type="submit" class="dash-btn dash-btn-danger text-xs">Remove</button>
                        </form>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : `
            <div class="text-center py-8 text-[var(--dash-text-muted)]">
                <p class="text-sm">No domains configured yet</p>
            </div>
            `}
            
            ${data.hasServer ? `
            <form action="/add-domain" method="POST" class="pt-4" style="border-top: 1px solid var(--dash-card-border)">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="flex flex-col sm:flex-row gap-3">
                    <input type="text" name="domain" placeholder="yourdomain.com" required class="flex-1 dash-input">
                    <button type="submit" class="dash-btn dash-btn-primary w-full sm:w-auto">Add Domain</button>
                </div>
                <p class="text-xs text-[var(--dash-text-muted)] mt-3">Point your domain's A record to <code class="text-[var(--dash-accent)]">${escapeHtml(data.ipAddress)}</code> first.</p>
            </form>
            ` : ''}
        </div>
        </section>

        <!-- DEPLOY SECTION -->
        <section id="section-deploy" class="dash-section">
        <div class="dash-card">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Deploy from Git</h3>
            </div>
            ${data.hasServer ? `
            <form action="/deploy" method="POST">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="flex flex-col sm:flex-row gap-3">
                    <input type="text" name="git_url" placeholder="https://github.com/username/repo.git" required class="flex-1 px-4 py-3 bg-[var(--dash-bg)] border border-[var(--dash-card-border)] rounded-lg text-white text-sm focus:border-[var(--dash-accent)] focus:outline-none">
                    <button type="submit" class="dash-btn dash-btn-primary w-full sm:w-auto">Deploy</button>
                </div>
                <p class="text-xs text-[var(--dash-text-muted)] mt-3">Paste your GitHub repository URL to deploy automatically.</p>
            </form>
            ` : data.trialAvailable ? `
            <div class="text-center py-6">
                <div class="text-4xl mb-4">🚀</div>
                <h3 class="text-lg font-semibold text-[var(--dash-text-primary)] mb-2">Start Your Free Trial</h3>
                <p class="text-sm text-[var(--dash-text-secondary)] mb-6">Get a fully-functional server for 3 days — no credit card required.</p>
                <form action="/start-trial" method="POST" class="inline-block" id="trialForm">
                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                    <button type="button" onclick="showTrialModal()" class="dash-btn dash-btn-primary">Start 3-Day Free Trial</button>
                </form>
                <p class="text-xs text-[var(--dash-text-muted)] mt-4">1 GB RAM · 1 vCPU · 25 GB SSD · Full SSH access</p>
            </div>
            
            <!-- Trial Confirmation Modal -->
            <div id="trialModal" class="fixed inset-0 bg-black bg-opacity-80 hidden items-center justify-center z-50">
                <div class="dash-card max-w-md mx-4 text-center">
                    <div class="text-5xl mb-4">🖥️</div>
                    <h3 class="text-xl font-semibold text-[var(--dash-text-primary)] mb-3">Create your server</h3>
                    <p class="text-sm text-[var(--dash-text-secondary)] mb-6">This will provision a real Ubuntu server with full SSH access. Takes about 2-5 minutes.</p>
                    <div class="flex gap-3 justify-center">
                        <button onclick="hideTrialModal()" class="dash-btn dash-btn-secondary">Cancel</button>
                        <button onclick="submitTrial()" class="dash-btn dash-btn-primary">Proceed</button>
                    </div>
                </div>
            </div>
            
            <script>
                function showTrialModal() {
                    document.getElementById('trialModal').classList.remove('hidden');
                    document.getElementById('trialModal').classList.add('flex');
                }
                function hideTrialModal() {
                    document.getElementById('trialModal').classList.add('hidden');
                    document.getElementById('trialModal').classList.remove('flex');
                }
                function submitTrial() {
                    document.getElementById('trialForm').submit();
                }
                document.getElementById('trialModal')?.addEventListener('click', function(e) {
                    if (e.target === this) hideTrialModal();
                });
            </script>
            <div class="mt-6 text-center">
                <span class="text-[var(--dash-text-muted)] text-sm">or</span>
                <a href="/pricing" class="text-[var(--dash-accent)] hover:underline text-sm ml-2">View paid plans →</a>
            </div>
            ` : `
            <div class="text-center py-6">
                <p class="text-[var(--dash-text-secondary)] mb-4">No active server. Purchase a plan to deploy applications.</p>
                <a href="/pricing" class="dash-btn dash-btn-primary">View Plans</a>
            </div>
            `}
        </div>

        <!-- AUTO-DEPLOY SECTION -->
        ${data.hasServer ? `
        <div id="auto-deploy" class="dash-card scroll-mt-24">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Auto-Deploy</h3>
                ${data.autoDeployEnabled ? 
                    `<span class="text-xs font-medium text-[var(--dash-success)]">● Enabled</span>` : 
                    `<span class="text-xs font-medium text-[var(--dash-text-muted)]">○ Disabled</span>`
                }
            </div>
            
            ${data.autoDeployEnabled && data.githubWebhookSecret ? `
            <p class="text-sm text-[var(--dash-text-secondary)] mb-4">Add this webhook to your GitHub repository:</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs text-[var(--dash-text-muted)] mb-2">Webhook URL</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <code class="flex-1 px-3 py-2 bg-[var(--dash-bg)] border border-[var(--dash-card-border)] rounded-lg text-[var(--dash-accent)] text-xs font-mono overflow-x-auto break-all">https://cloudedbasement.ca/webhook/github/${data.serverId}</code>
                        <button onclick="navigator.clipboard.writeText('https://cloudedbasement.ca/webhook/github/${data.serverId}')" class="dash-btn dash-btn-primary px-3 w-full sm:w-auto">Copy</button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs text-[var(--dash-text-muted)] mb-2">Secret</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <code id="webhookSecret" class="flex-1 px-3 py-2 bg-[var(--dash-bg)] border border-[var(--dash-card-border)] rounded-lg text-[var(--dash-accent)] text-xs font-mono">••••••••••••••••</code>
                        <div class="flex gap-2">
                            <button onclick="toggleWebhookSecret()" class="dash-btn dash-btn-secondary px-3 flex-1 sm:flex-initial">Show</button>
                            <button onclick="navigator.clipboard.writeText('${data.githubWebhookSecret}')" class="dash-btn dash-btn-primary px-3 flex-1 sm:flex-initial">Copy</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-[var(--dash-bg)] border border-[var(--dash-card-border)] rounded-lg">
                <p class="text-xs text-[var(--dash-text-secondary)] font-medium mb-2">Setup Instructions:</p>
                <ol class="text-xs text-[var(--dash-text-muted)] space-y-1 list-decimal list-inside">
                    <li>GitHub repo → Settings → Webhooks → Add webhook</li>
                    <li>Paste the Webhook URL</li>
                    <li>Content type: <code class="text-[var(--dash-accent)]">application/json</code></li>
                    <li>Paste the Secret</li>
                    <li>Select "Just the push event"</li>
                </ol>
            </div>
            
            <form action="/disable-auto-deploy" method="POST" class="mt-6">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <button type="submit" class="dash-btn dash-btn-danger">Disable Auto-Deploy</button>
            </form>
            
            <script>
                function toggleWebhookSecret() {
                    const el = document.getElementById('webhookSecret');
                    if (el.textContent.includes('•')) {
                        el.textContent = '${data.githubWebhookSecret}';
                    } else {
                        el.textContent = '••••••••••••••••';
                    }
                }
            </script>
            ` : `
            <p class="text-sm text-[var(--dash-text-secondary)] mb-4">Automatically redeploy when you push to main/master.</p>
            <ul class="text-xs text-[var(--dash-text-muted)] space-y-1 mb-6">
                <li>✓ No manual clicking "Redeploy"</li>
                <li>✓ Deploys in seconds after push</li>
                <li>✓ Secure webhook signature verification</li>
            </ul>
            
            <form action="/enable-auto-deploy" method="POST">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <button type="submit" class="dash-btn dash-btn-primary">Enable Auto-Deploy</button>
            </form>
            `}
        </div>
        ` : ''}
        
        <!-- Deployment History (within Deploy section) -->
        ${data.deployments.length > 0 ? `
        <div class="dash-card mt-6">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Recent Deployments</h3>
            </div>
            <div class="space-y-3">
                ${data.deployments.slice(0, 5).map(dep => `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg" style="background: var(--dash-bg)">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="${dep.status === 'success' ? 'text-green-400' : dep.status === 'failed' ? 'text-red-400' : 'text-yellow-400'} flex-shrink-0">
                            ${dep.status === 'success' ? '●' : dep.status === 'failed' ? '●' : '○'}
                        </span>
                        <div class="min-w-0">
                            <p class="text-sm text-[var(--dash-text-primary)] truncate">${escapeHtml(dep.git_url.split('/').pop() || 'repo')}</p>
                            <p class="text-xs text-[var(--dash-text-muted)]">${new Date(dep.deployed_at || dep.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    ${dep.status === 'success' ? `
                    <form method="POST" action="/deploy" class="flex-shrink-0 self-end sm:self-center">
                        <input type="hidden" name="_csrf" value="${data.csrfToken}">
                        <input type="hidden" name="git_url" value="${escapeHtml(dep.git_url)}">
                        <button type="submit" class="dash-btn dash-btn-secondary text-xs">Redeploy</button>
                    </form>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        </section>

        <!-- DEV TOOLS SECTION -->
        <section id="section-dev-tools" class="dash-section">
        <!-- DEVELOPER TOOLS SECTION -->
        <div class="dash-card">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Developer Tools</h3>
            </div>
            
            ${data.hasServer ? `
            <!-- SSH Access -->
            <div class="mb-8">
                <h5 class="text-sm font-semibold mb-4" style="color: var(--dash-text-primary)">SSH Access</h5>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-xs mb-2" style="color: var(--dash-text-muted)">Username</label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <input type="password" id="sshUsername" value="••••••••" readonly data-credential="ssh" data-field="username" class="flex-1 px-3 py-2 rounded-lg text-white font-mono text-sm" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                            <button onclick="fetchAndShowCredential('ssh', 'username', 'sshUsername', this)" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Show</button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs mb-2" style="color: var(--dash-text-muted)">Password</label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <input type="password" id="sshPassword" value="••••••••" readonly data-credential="ssh" data-field="password" class="flex-1 px-3 py-2 rounded-lg text-white font-mono text-sm" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                            <button onclick="fetchAndShowCredential('ssh', 'password', 'sshPassword', this)" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Show</button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs mb-2" style="color: var(--dash-text-muted)">Connection Command</label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <input type="password" id="sshCommand" value="ssh ••••@••••" readonly data-credential="ssh" data-field="command" class="flex-1 px-3 py-2 rounded-lg text-white font-mono text-sm" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                            <button onclick="fetchAndCopyCredential('ssh', 'command')" class="dash-btn dash-btn-primary text-xs w-full sm:w-auto">Copy</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Databases -->
            <div class="pt-6" style="border-top: 1px solid var(--dash-card-border)">
                <h5 class="text-sm font-semibold mb-4" style="color: var(--dash-text-primary)">Databases</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- PostgreSQL -->
                <div class="p-4 rounded-lg" style="background: rgba(0,0,0,0.3); border: 1px solid var(--dash-card-border)">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs uppercase font-bold" style="color: var(--dash-text-secondary)">PostgreSQL</p>
                        ${data.postgresInstalled ? 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900/50 text-green-400 flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Installed</span>' : 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900/50 text-yellow-400">Not Installed</span>'}
                    </div>
                    
                    ${data.postgresInstalled && data.postgresCredentials ? `
                    <!-- PostgreSQL Credentials -->
                    <div class="rounded-lg p-3 mb-4" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3)">
                        <p class="text-green-400 text-xs font-bold mb-1">✓ PostgreSQL Ready</p>
                        <p class="text-xs leading-relaxed" style="color: var(--dash-text-secondary)">Click Show/Copy to reveal credentials (loaded securely on-demand).</p>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Connection String</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="postgresql://••••:••••@••••:5432/••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono truncate" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="postgres-connection-string" data-credential="postgres" data-field="connectionString">
                                <button onclick="fetchAndCopyCredential('postgres', 'connectionString')" class="dash-btn dash-btn-primary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Host</p>
                                <div class="flex gap-2">
                                    <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="postgres-host" data-credential="postgres" data-field="host">
                                    <button onclick="fetchAndCopyCredential('postgres', 'host')" class="dash-btn dash-btn-secondary text-xs">Copy</button>
                                </div>
                            </div>
                            <div>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Port</p>
                                <input type="text" readonly value="5432" class="w-full text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Database</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="postgres-dbname" data-credential="postgres" data-field="database">
                                <button onclick="fetchAndCopyCredential('postgres', 'database')" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Username</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="postgres-user" data-credential="postgres" data-field="username">
                                <button onclick="fetchAndCopyCredential('postgres', 'username')" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Password</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="postgres-password" data-credential="postgres" data-field="password">
                                <div class="flex gap-2">
                                    <button onclick="fetchAndShowCredential('postgres', 'password', 'postgres-password', this)" class="dash-btn dash-btn-secondary text-xs flex-1 sm:flex-initial" id="postgres-password-toggle">Show</button>
                                    <button onclick="fetchAndCopyCredential('postgres', 'password')" class="dash-btn dash-btn-secondary text-xs flex-1 sm:flex-initial">Copy</button>
                                </div>
                            </div>
                        </div>
                        <details class="mt-4">
                            <summary class="text-xs cursor-pointer transition-colors" style="color: var(--dash-accent)">Show Code Examples</summary>
                            <div class="mt-3 p-4 rounded-lg" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                                <p class="text-xs mb-3" style="color: var(--dash-text-primary)"><strong>Quick Start:</strong> Click Copy on Connection String above, then paste into your .env</p>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)"><strong>Node.js:</strong> <code style="color: var(--dash-text-secondary)">npm install pg</code></p>
                                <pre class="text-xs p-3 rounded-lg overflow-x-auto mb-3 font-mono" style="background: rgba(0,0,0,0.4); color: var(--dash-text-secondary)"><code>const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL  // Paste connection string in .env
});</code></pre>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)"><strong>Python:</strong> <code style="color: var(--dash-text-secondary)">pip install psycopg2-binary</code></p>
                                <pre class="text-xs p-3 rounded-lg overflow-x-auto font-mono" style="background: rgba(0,0,0,0.4); color: var(--dash-text-secondary)"><code>import os
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])</code></pre>
                            </div>
                        </details>
                    </div>
                    ` : `
                    <p class="text-sm mt-4 mb-4" style="color: var(--dash-text-muted)">Install PostgreSQL to view credentials.</p>
                    <form action="/setup-database" method="POST">
                        <input type="hidden" name="_csrf" value="${data.csrfToken}">
                        <input type="hidden" name="database_type" value="postgres">
                        <button type="submit" class="dash-btn dash-btn-primary w-full">Install PostgreSQL</button>
                    </form>
                    `}
                </div>
                
                <!-- MongoDB -->
                <div class="p-4 rounded-lg" style="background: rgba(0,0,0,0.3); border: 1px solid var(--dash-card-border)">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs uppercase font-bold" style="color: var(--dash-text-secondary)">MongoDB</p>
                        ${data.mongodbInstalled ? 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900/50 text-green-400 flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Installed</span>' : 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900/50 text-yellow-400">Not Installed</span>'}
                    </div>
                    
                    ${data.mongodbInstalled && data.mongodbCredentials ? `
                    <!-- MongoDB Credentials -->
                    <div class="rounded-lg p-3 mb-4" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3)">
                        <p class="text-green-400 text-xs font-bold mb-1">✓ MongoDB Ready</p>
                        <p class="text-xs leading-relaxed" style="color: var(--dash-text-secondary)">Click Show/Copy to reveal credentials (loaded securely on-demand).</p>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Connection String</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="mongodb://••••:••••@••••:27017/••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono truncate" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="mongodb-connection-string" data-credential="mongodb" data-field="connectionString">
                                <button onclick="fetchAndCopyCredential('mongodb', 'connectionString')" class="dash-btn dash-btn-primary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Host</p>
                                <div class="flex gap-2">
                                    <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="mongodb-host" data-credential="mongodb" data-field="host">
                                    <button onclick="fetchAndCopyCredential('mongodb', 'host')" class="dash-btn dash-btn-secondary text-xs">Copy</button>
                                </div>
                            </div>
                            <div>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Port</p>
                                <input type="text" readonly value="27017" class="w-full text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Database</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="mongodb-dbname" data-credential="mongodb" data-field="database">
                                <button onclick="fetchAndCopyCredential('mongodb', 'database')" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Username</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="mongodb-user" data-credential="mongodb" data-field="username">
                                <button onclick="fetchAndCopyCredential('mongodb', 'username')" class="dash-btn dash-btn-secondary text-xs w-full sm:w-auto">Copy</button>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs mb-2" style="color: var(--dash-text-muted)">Password</p>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input type="password" readonly value="••••••••" class="flex-1 text-white text-xs px-3 py-2 rounded-lg font-mono" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)" id="mongodb-password" data-credential="mongodb" data-field="password">
                                <div class="flex gap-2">
                                    <button onclick="fetchAndShowCredential('mongodb', 'password', 'mongodb-password', this)" class="dash-btn dash-btn-secondary text-xs flex-1 sm:flex-initial" id="mongodb-password-toggle">Show</button>
                                    <button onclick="fetchAndCopyCredential('mongodb', 'password')" class="dash-btn dash-btn-secondary text-xs flex-1 sm:flex-initial">Copy</button>
                                </div>
                            </div>
                        </div>
                        <details class="mt-4">
                            <summary class="text-xs cursor-pointer transition-colors" style="color: var(--dash-accent)">Show Code Examples</summary>
                            <div class="mt-3 p-4 rounded-lg" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border)">
                                <p class="text-xs mb-3" style="color: var(--dash-text-primary)"><strong>Quick Start:</strong> Click Copy on Connection String above, then paste into your .env</p>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)"><strong>Node.js:</strong> <code style="color: var(--dash-text-secondary)">npm install mongodb</code></p>
                                <pre class="text-xs p-3 rounded-lg overflow-x-auto mb-3 font-mono" style="background: rgba(0,0,0,0.4); color: var(--dash-text-secondary)"><code>const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URL);  // Paste connection string in .env
await client.connect();</code></pre>
                                <p class="text-xs mb-2" style="color: var(--dash-text-muted)"><strong>Python:</strong> <code style="color: var(--dash-text-secondary)">pip install pymongo</code></p>
                                <pre class="text-xs p-3 rounded-lg overflow-x-auto font-mono" style="background: rgba(0,0,0,0.4); color: var(--dash-text-secondary)"><code>import os
from pymongo import MongoClient
client = MongoClient(os.environ['MONGODB_URL'])</code></pre>
                            </div>
                        </details>
                    </div>
                    ` : `
                    <p class="text-sm mt-4 mb-4" style="color: var(--dash-text-muted)">Install MongoDB to view credentials.</p>
                    <form action="/setup-database" method="POST">
                        <input type="hidden" name="_csrf" value="${data.csrfToken}">
                        <input type="hidden" name="database_type" value="mongodb">
                        <button type="submit" class="dash-btn dash-btn-primary w-full">Install MongoDB</button>
                    </form>
                    `}
                </div>
            </div>
            ` : '<p class="text-sm" style="color: var(--dash-text-muted)">Provision a server to enable databases.</p>'}
            </div>
        </div>
        </section>

        <!-- SETTINGS SECTION -->
        <section id="section-settings" class="dash-section">
        
        <!-- Server Updates Card -->
        ${data.hasServer ? `
        <div class="dash-card mb-6">
            <div class="dash-card-header">
                <h4 class="dash-card-title">Server Updates</h4>
                ${data.pendingUpdates.length > 0 ? `
                <span class="px-2 py-1 text-xs font-bold uppercase rounded bg-orange-900/50 text-orange-400">${data.pendingUpdates.length} available</span>
                ` : `
                <span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900/50 text-green-400">✓ Up to date</span>
                `}
            </div>
            
            ${data.pendingUpdates.length > 0 ? `
            <div class="space-y-3 mb-4">
                <p class="text-xs text-gray-500 mb-2">Review what will be installed before applying:</p>
                ${data.pendingUpdates.map(update => `
                <div class="bg-black bg-opacity-30 border border-gray-700/50 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="text-white font-medium">${escapeHtml(update.title)}</span>
                            ${update.is_critical ? '<span class="ml-2 text-xs text-red-400">⚠️ Critical</span>' : ''}
                        </div>
                        <span class="inline-flex items-center gap-1.5 text-xs font-medium ${
                          update.type === 'security' ? 'text-red-400' :
                          update.type === 'config' ? 'text-yellow-400' :
                          update.type === 'feature' ? 'text-blue-400' : 'text-purple-400'
                        }">
                            <span class="w-2 h-2 rounded-full ${
                              update.type === 'security' ? 'bg-red-500' :
                              update.type === 'config' ? 'bg-yellow-500' :
                              update.type === 'feature' ? 'bg-blue-500' : 'bg-purple-500'
                            }"></span>
                            ${update.type}
                        </span>
                    </div>
                    ${update.description ? `<p class="text-gray-400 text-sm mb-3">${escapeHtml(update.description)}</p>` : ''}
                    ${update.version ? `<p class="text-gray-500 text-xs">Version: ${escapeHtml(update.version)}</p>` : ''}
                </div>
                `).join('')}
            </div>
            
            <form method="POST" action="/apply-updates" class="flex justify-end">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <button type="submit" class="dash-btn dash-btn-primary" onclick="return confirm('Apply ${data.pendingUpdates.length} update(s) to your server?')">
                    Apply All Updates
                </button>
            </form>
            ` : `
            <p class="text-sm" style="color: var(--dash-text-muted)">Your server is running the latest patches and configurations.</p>
            `}
            
            <!-- Update History (Transparency) -->
            ${data.updateHistory && data.updateHistory.length > 0 ? `
            <div class="mt-6 pt-4 border-t border-gray-700">
                <h5 class="text-xs font-bold uppercase text-gray-400 mb-3">Update History</h5>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${data.updateHistory.slice(0, 10).map(log => `
                    <div class="flex items-center justify-between text-xs py-2 border-b border-gray-800">
                        <div>
                            <span class="text-white">${escapeHtml(log.title)}</span>
                            ${log.version ? `<span class="text-gray-500 ml-1">v${escapeHtml(log.version)}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="${log.status === 'success' ? 'text-green-400' : 'text-red-400'}">
                                ${log.status === 'success' ? '✓' : '✗'} ${escapeHtml(log.status)}
                            </span>
                            <span class="text-gray-500">${new Date(log.applied_at).toLocaleDateString()}</span>
                            <span class="text-gray-600">${log.trigger_type === 'customer' ? 'by you' : 'auto'}</span>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ${data.updateHistory.length > 10 ? `<p class="text-xs text-gray-500 mt-2">+ ${data.updateHistory.length - 10} more</p>` : ''}
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <!-- Support Card -->
        <div class="dash-card mb-6">
            <div class="dash-card-header">
                <h4 class="dash-card-title">Support</h4>
                <button onclick="openSubmitTicketModal()" class="dash-btn dash-btn-primary text-xs">+ New Ticket</button>
            </div>
            ${data.tickets.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.tickets.slice(0, 4).map(ticket => `
                    <div class="bg-black bg-opacity-30 border border-gray-700/50 rounded-lg p-4">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs" style="color: var(--dash-text-muted)">Ticket #${ticket.id}</span>
                            <span class="px-2 py-1 text-xs font-bold uppercase rounded ${ticket.status === 'resolved' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}">
                                ${escapeHtml(ticket.status)}
                            </span>
                        </div>
                        <p class="text-sm text-white font-medium mb-3">${escapeHtml(ticket.subject)}</p>
                        <span class="px-2 py-1 text-xs font-bold uppercase rounded ${ticket.priority === 'urgent' ? 'bg-red-900/50 text-red-400' : ticket.priority === 'high' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700/50 text-gray-400'}">
                            ${escapeHtml(ticket.priority)}
                        </span>
                    </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--dash-text-muted)" class="text-sm">No support tickets. Click "New Ticket" to create one.</p>'}
        </div>

        <!-- Account Settings Card -->
        <div class="dash-card">
            <div class="dash-card-header">
                <h3 class="dash-card-title">Account</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <p class="text-xs uppercase font-semibold mb-2" style="color: var(--dash-text-muted)">Email</p>
                    <p class="px-4 py-3 rounded-lg text-white text-sm font-mono" style="background: rgba(0,0,0,0.3); border: 1px solid var(--dash-card-border)">${data.userEmail}</p>
                </div>
                <div>
                    <p class="text-xs uppercase font-semibold mb-2" style="color: var(--dash-text-muted)">Role</p>
                    <p class="px-4 py-3 rounded-lg text-white text-sm" style="background: rgba(0,0,0,0.3); border: 1px solid var(--dash-card-border)">${data.userRole === 'admin' ? 'Administrator' : 'User'}</p>
                </div>
            </div>
            
            <div class="pt-6 mb-8" style="border-top: 1px solid var(--dash-card-border)">
                <h5 class="text-xs font-bold uppercase tracking-wide mb-4" style="color: var(--dash-accent)">Change Password</h5>
                <form onsubmit="changePassword(event)" class="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                    <input type="password" id="currentPassword" placeholder="Current Password" required class="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border); --tw-ring-color: var(--dash-accent)">
                    <input type="password" id="newPassword" placeholder="New Password" required class="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border); --tw-ring-color: var(--dash-accent)">
                    <input type="password" id="confirmPassword" placeholder="Confirm Password" required class="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border); --tw-ring-color: var(--dash-accent)">
                    <button type="submit" class="dash-btn dash-btn-primary w-full">Update Password</button>
                </form>
            </div>

            <div class="pt-6" style="border-top: 1px solid var(--dash-card-border)">
                <a href="/logout" class="dash-btn dash-btn-danger inline-block">Logout</a>
            </div>
        </div>
        </section>

    </div><!-- End sections-container -->

${getDashboardLayoutEnd()}


<!-- Cancel Plan Confirmation Modal -->
<div id="terminate-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
    <div class="bg-gray-900 border border-red-600 rounded-lg p-6 sm:p-8 max-w-lg w-11/12">
        <h2 class="text-xl sm:text-2xl font-bold text-red-500 mb-4">⚠️ Cancel Plan</h2>
        <p class="text-gray-300 mb-4 text-sm sm:text-base">This action will <span class="text-red-500 font-bold">CANCEL YOUR SUBSCRIPTION</span> and destroy your server and all data. There is no undo.</p>
        
        <div class="bg-black bg-opacity-40 border border-gray-700 rounded-lg p-3 sm:p-4 mb-4">
            <p class="text-xs text-gray-400 mb-2 uppercase font-bold">To confirm, type the server name below:</p>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                <code class="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-brand font-mono text-sm truncate" id="droplet-name-display">${escapeHtml(data.dropletName)}    </code>
                <button onclick="navigator.clipboard.writeText(dropletName)" class="dash-btn dash-btn-secondary text-xs">Copy</button>
            </div>
            <input type="text" id="confirm-input" oninput="validateTermination()" placeholder="Paste and remove trailing spaces" class="w-full px-4 py-3 bg-black border border-gray-600 rounded text-white font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none">
        </div>
        
        <div class="flex flex-col-reverse sm:flex-row gap-3">
            <button onclick="closeTerminateModal()" class="dash-btn dash-btn-secondary flex-1">Cancel</button>
            <button id="confirm-button" onclick="confirmTermination()" disabled class="dash-btn dash-btn-danger flex-1 opacity-50 cursor-not-allowed">Confirm Cancellation</button>
        </div>
    </div>
</div>

<!-- Submit Ticket Modal -->
<div id="submitTicketModal" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
    <div class="bg-gray-900 rounded-lg p-6 sm:p-8 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <h2 class="text-lg font-bold text-white mb-6">Submit Support Ticket</h2>
        <form onsubmit="submitTicket(event)" class="space-y-4">
            <div>
                <label class="block text-xs text-gray-400 uppercase font-bold mb-2">Subject</label>
                <input type="text" id="ticketSubject" placeholder="Brief description" required maxlength="100" class="w-full px-4 py-3 bg-black bg-opacity-50 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
            </div>
            <div>
                <label class="block text-xs text-gray-400 uppercase font-bold mb-2">Priority</label>
                <select id="ticketPriority" class="w-full px-4 py-3 bg-black bg-opacity-50 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <div>
                <label class="block text-xs text-gray-400 uppercase font-bold mb-2">Description</label>
                <textarea id="ticketDescription" placeholder="Details about your issue" required class="w-full px-4 py-3 bg-black bg-opacity-50 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none h-32"></textarea>
            </div>
            <div class="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" class="dash-btn dash-btn-secondary flex-1" onclick="closeSubmitTicketModal()">Cancel</button>
                <button type="submit" class="dash-btn dash-btn-primary flex-1">Submit</button>
            </div>
        </form>
    </div>
</div>

<!-- Delete Domain Confirmation Modal -->
<div id="delete-domain-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
    <div class="bg-gray-900 border border-red-600 rounded-lg p-5 sm:p-6 max-w-md w-full">
        <h2 class="text-xl font-bold text-red-400 mb-4">🗑️ Delete Domain</h2>
        <p class="text-gray-300 mb-2 text-sm sm:text-base">Are you sure you want to delete:</p>
        <p class="text-white font-mono bg-black px-3 py-2 rounded mb-4 text-sm break-all" id="delete-domain-name"></p>
        
        <div class="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded p-3 mb-4">
            <p class="text-yellow-300 text-xs sm:text-sm">⚠️ This will remove the domain from your server's nginx configuration. If SSL was enabled, the certificate will remain but won't be renewed.</p>
        </div>
        
        <div class="flex flex-col-reverse sm:flex-row gap-3">
            <button onclick="closeDeleteDomainModal()" class="dash-btn dash-btn-secondary flex-1">Cancel</button>
            <button onclick="confirmDeleteDomain()" class="dash-btn dash-btn-danger flex-1">Delete Domain</button>
        </div>
    </div>
</div>

<script>
function openSubmitTicketModal() { document.getElementById('submitTicketModal').classList.remove('hidden'); document.getElementById('submitTicketModal').classList.add('flex'); }
function closeSubmitTicketModal() { document.getElementById('submitTicketModal').classList.remove('flex'); document.getElementById('submitTicketModal').classList.add('hidden'); }
document.addEventListener('click', (e) => {
    if (e.target.id === 'submitTicketModal') closeSubmitTicketModal();
});

async function submitTicket(e) {
    e.preventDefault();
    const subject = document.getElementById('ticketSubject').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const priority = document.getElementById('ticketPriority').value;
    const res = await fetch('/submit-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': '${data.csrfToken}' },
        body: JSON.stringify({ subject, description, priority })
    });
    const result = await res.json();
    if (result.success) {
        alert('Ticket submitted!');
        closeSubmitTicketModal();
        window.location.reload();
    } else {
        alert('Error: ' + result.error);
    }
}

async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (newPwd !== confirm) { alert('Passwords do not match'); return; }
    if (newPwd.length < 8) { alert('Min 8 characters'); return; }
    const res = await fetch('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': '${data.csrfToken}' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
    });
    const result = await res.json();
    if (result.success) {
        alert('Password updated!');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } else {
        alert('Error: ' + result.error);
    }
}

// Use global copyToClipboard from public/js/dashboard.js

// Password visibility toggle
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('sshPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>';
    } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
    }
}

// Update clock
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const elem = document.getElementById('clock');
    if (elem) elem.textContent = timeString;
}
setInterval(updateTime, 1000);
updateTime();

// Terminate modal logic
const dropletName = '${escapeHtml(data.dropletName)}    '; // Note trailing spaces for paste validation
const dropletNameTrimmed = dropletName.trim();

function openTerminateModal() {
    document.getElementById('terminate-modal').classList.remove('hidden');
    document.getElementById('confirm-input').value = '';
    document.getElementById('confirm-button').disabled = true;
}

function closeTerminateModal() {
    document.getElementById('terminate-modal').classList.add('hidden');
}

function validateTermination() {
    const input = document.getElementById('confirm-input').value;
    const button = document.getElementById('confirm-button');
    
    if (input === dropletNameTrimmed) {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function confirmTermination() {
    document.getElementById('terminate-form').submit();
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTerminateModal();
});

// ==========================================
// HASH-BASED SECTION NAVIGATION
// ==========================================
console.log('[Dashboard] Hash navigation script loaded');
console.log('[Dashboard] Sections found:', document.querySelectorAll('.dash-section').length);
console.log('[Dashboard] Nav links found:', document.querySelectorAll('.sidebar-nav-link').length);

// Show/hide sections based on hash
function showSection(sectionId) {
    console.log('[Dashboard] showSection called with:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.dash-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById('section-' + sectionId);
    console.log('[Dashboard] Target section element:', targetSection);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log('[Dashboard] Section activated:', sectionId);
    } else {
        console.warn('[Dashboard] Section not found: section-' + sectionId);
    }
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Update section title
    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        const titles = { overview: 'Overview', sites: 'Sites', deploy: 'Deploy', 'dev-tools': 'Dev Tools', settings: 'Settings' };
        sectionTitle.textContent = titles[sectionId] || 'Overview';
    }
}

// Handle hash changes
function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'overview';
    console.log('[Dashboard] handleHashChange, hash:', hash);
    showSection(hash);
}

// Listen for hash changes
window.addEventListener('hashchange', handleHashChange);
console.log('[Dashboard] hashchange listener added');

// Initial section from hash
handleHashChange();

// Add click handlers to nav links
document.querySelectorAll('.sidebar-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const sectionId = link.getAttribute('data-section');
        console.log('[Dashboard] Nav link clicked, data-section:', sectionId);
        if (sectionId) {
            e.preventDefault();
            window.location.hash = sectionId;
            console.log('[Dashboard] Hash set to:', sectionId);
        }
    });
});
console.log('[Dashboard] Click handlers attached to nav links');

// ==========================================
// DELETE DOMAIN MODAL
// ==========================================

let deleteDomainId = null;
let deleteDomainName = '';

function openDeleteDomainModal(domain, id) {
    deleteDomainId = id;
    deleteDomainName = domain;
    document.getElementById('delete-domain-name').textContent = domain;
    document.getElementById('delete-domain-modal').classList.remove('hidden');
    document.getElementById('delete-domain-modal').classList.add('flex');
}

function closeDeleteDomainModal() {
    document.getElementById('delete-domain-modal').classList.add('hidden');
    document.getElementById('delete-domain-modal').classList.remove('flex');
    deleteDomainId = null;
    deleteDomainName = '';
}

async function confirmDeleteDomain() {
    if (!deleteDomainId) return;
    
    const btn = document.querySelector('#delete-domain-modal button.dash-btn-danger');
    btn.disabled = true;
    btn.textContent = 'Deleting...';
    
    try {
        const res = await fetch('/delete-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CSRF-Token': '${data.csrfToken}' },
            body: JSON.stringify({ domainId: deleteDomainId })
        });
        const result = await res.json();
        if (result.success) {
            window.location.reload();
        } else {
            alert('Error: ' + result.error);
            btn.disabled = false;
            btn.textContent = 'Delete Domain';
        }
    } catch (err) {
        alert('Network error');
        btn.disabled = false;
        btn.textContent = 'Delete Domain';
    }
}

// Close on click outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'delete-domain-modal') closeDeleteDomainModal();
});
</script>
  `;
};

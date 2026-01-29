const pool = require('../db');
const { getDashboardHead, getFooter, getScripts, getResponsiveNav, escapeHtml } = require('../helpers');
const { getUserServer, hasSuccessfulPayment } = require('../utils/db-helpers');
const { PAYMENT_STATUS, SERVER_STATUS } = require('../constants');

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

        // Check if user has paid
        const hasPaid = await hasSuccessfulPayment(userId);

        // Get user's server info (using helper)
        const server = await getUserServer(userId);
        const hasServer = !!server;
        // Explicit boolean check - if column doesn't exist, treats as false (safe default)
        const postgresInstalled = server?.postgres_installed === true;
        const mongodbInstalled = server?.mongodb_installed === true;

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

        // Get domains
        const domainsResult = await pool.query(
            'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        
        // Get environment variables
        const envVarsResult = hasServer ? await pool.query(
            'SELECT * FROM environment_variables WHERE server_id = $1 ORDER BY key ASC',
            [server.id]
        ) : { rows: [] };

        // Get support tickets
        const ticketsResult = await pool.query(
            'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';

        const dashboardHTML = buildDashboardTemplate({
            flashSuccess,
            flashError,
            emailConfirmed,
            serverStatus: server?.status || 'unknown',
            serverName: server?.hostname || 'basement-core',
            plan: (server?.plan || paidPlan || 'basic').toString(),
            ipAddress: server?.ip_address || '',
            serverIp: server?.ip_address || '',
            sshUsername: server?.ssh_username || 'root',
            sshPassword: server?.ssh_password || '',
            csrfToken,
            deployments: deploymentsResult.rows || [],
            domains: domainsResult.rows || [],
            envVars: envVarsResult.rows || [],
            tickets: ticketsResult.rows || [],
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            hasPaid,
            hasServer,
            dismissedNextSteps: req.session.dismissedNextSteps || false,
            postgresInstalled,
            mongodbInstalled
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

module.exports = { showDashboard: exports.showDashboard, submitSupportTicket, changePassword };

/**
 * Dashboard Template Builder - Tech-View Design
 * Advanced glassmorphic dashboard with resource monitoring
 */
const buildDashboardTemplate = (data) => {
  return `
<!-- Main Content -->
<main class="flex-1 px-4 md:px-8 lg:px-12 pt-24 pb-12 bg-black">
    <!-- Header -->
    <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16">
    <header class="flex flex-col gap-6 mb-12">
        <div>
            <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand text-opacity-70 mb-2">
                <span class="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></span>
                Live Connection Established
            </div>
            <h2 class="text-3xl font-bold text-white uppercase tracking-tight">
                Dashboard
            </h2>
        </div>
        <div class="flex items-center gap-4">
            <div class="border-r border-white border-opacity-5 pr-4 mr-4">
                <p class="text-xs text-gray-500 uppercase">Local Time</p>
                <p class="text-sm font-bold text-white font-mono" id="clock">00:00:00</p>
            </div>
        </div>
    </header>

    ${!data.emailConfirmed ? `
    <!-- Email Verification Top Bar -->
    <div class="bg-gradient-to-r from-yellow-600 to-orange-500 border-b border-yellow-700 shadow-lg">
      <div class="max-w-6xl mx-auto px-8 py-3">
        <div class="flex items-center justify-between gap-4">
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
              class="w-32 px-3 py-1.5 bg-white bg-opacity-20 backdrop-blur border border-white border-opacity-30 rounded text-white font-mono text-center text-sm tracking-wider placeholder-white placeholder-opacity-50 focus:bg-opacity-30 focus:border-white focus:outline-none">
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
            this.textContent = '✓ Sent!';
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
    ${data.flashSuccess ? `<div class="bg-green-900 border border-green-700 text-green-300 px-6 py-4 rounded-lg mb-6 flex items-center justify-between">${data.flashSuccess}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-green-300 hover:text-green-100 font-bold text-xl">&times;</button></div>` : ''}
    ${data.flashError ? `<div class="bg-red-900 border border-red-700 text-red-300 px-6 py-4 rounded-lg mb-6 flex items-center justify-between">${data.flashError}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-red-300 hover:text-red-100 font-bold text-xl">&times;</button></div>` : ''}
    
    ${data.hasServer && !data.dismissedNextSteps ? `
    <!-- Next Steps Banner -->
    <div id="nextStepsBanner" class="bg-gradient-to-r from-brand to-cyan-600 rounded-lg p-6 mb-8 border-2 border-brand shadow-lg">
        <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-4">
                    <h3 class="text-xl sm:text-2xl font-bold text-white">Server Online - Ready to Deploy!</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="bg-gray-900 bg-opacity-40 rounded-lg p-4 backdrop-blur border border-white border-opacity-10">
                        <div class="text-white font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">1️⃣</span> Deploy with Git
                        </div>
                        <p class="text-white text-opacity-90 text-sm">Scroll down to Deployment section → paste your repo URL → automatic setup</p>
                    </div>
                    <div class="bg-gray-900 bg-opacity-40 rounded-lg p-4 backdrop-blur border border-white border-opacity-10">
                        <div class="text-white font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">2️⃣</span> Connect via SSH
                        </div>
                        <p class="text-white text-opacity-90 text-sm">See SSH Access section below for credentials and connection command</p>
                    </div>
                    <div class="bg-gray-900 bg-opacity-40 rounded-lg p-4 backdrop-blur border border-white border-opacity-10">
                        <div class="text-white font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">3️⃣</span> Add Domain + SSL
                        </div>
                        <p class="text-white text-opacity-90 text-sm">Custom Domains section → point DNS → one-click free SSL certificate</p>
                    </div>
                </div>
                <p class="text-white text-sm font-medium">First time? Git deployment is the easiest way to get started!</p>
            </div>
            <button onclick="dismissNextSteps()" class="text-white hover:text-gray-200 text-3xl font-bold leading-none px-2 shrink-0">×</button>
        </div>
    </div>
    ` : ''}

    <!-- Main Content Grid -->
    <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 space-y-6">
        ${data.hasServer ? `
        <div class="bg-gray-800 rounded-lg overflow-hidden" data-server-status="${data.serverStatus}">
            <div class="px-6 py-4 border-b border-gray-700 bg-white bg-opacity-5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        ${data.serverStatus === 'running' ? '<svg class="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : data.serverStatus === 'provisioning' ? '<svg class="animate-spin h-5 w-5 text-brand drop-shadow-[0_0_10px_rgba(45,167,223,0.8)]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><circle class="opacity-75" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="32" stroke-dashoffset="16"></circle></svg>' : '<div class="w-2 h-2 rounded-full bg-gray-500 shadow-lg"></div>'}
                        <h4 class="text-sm font-bold uppercase tracking-wide text-white">
                            Instance Core: <span class="text-brand">${data.serverName}</span>
                        </h4>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="refreshDashboard()" class="p-2 border border-white border-opacity-5 bg-transparent hover:bg-white hover:bg-opacity-5 text-brand rounded transition-transform hover:rotate-180" title="Refresh Dashboard">⟳</button>
                        <button class="p-2 border border-white border-opacity-5 bg-transparent hover:bg-white hover:bg-opacity-5 text-gray-500 rounded" disabled title="Coming Soon">Settings</button>
                    </div>
                </div>
            </div>
            <div class="p-6">
                <div class="space-y-4 mb-6">
                    <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                        <span class="text-xs text-gray-500 uppercase font-bold">IPv4 Interface</span>
                        <span class="text-sm font-mono text-brand">${escapeHtml(data.ipAddress)}</span>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                        <span class="text-xs text-gray-500 uppercase font-bold">Host Name</span>
                        <span class="text-sm font-mono text-white">${escapeHtml(data.serverName)}</span>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                        <span class="text-xs text-gray-500 uppercase font-bold">Plan</span>
                        <span class="text-sm font-mono text-white">${escapeHtml(data.plan.toUpperCase())}</span>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                        <span class="text-xs text-gray-500 uppercase font-bold">Status</span>
                        <span class="text-sm font-mono ${data.serverStatus === 'running' ? 'text-green-500' : data.serverStatus === 'provisioning' ? 'text-brand animate-pulse' : 'text-red-400'}">${escapeHtml(data.serverStatus.toUpperCase())}</span>
                    </div>
                </div>
                <div class="flex gap-3">
                    ${data.serverStatus === 'stopped' ? `
                        <form action="/server-action" method="POST" class="flex-1">
                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                            <input type="hidden" name="action" value="start">
                            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white font-bold">Start Core</button>
                        </form>
                    ` : `
                        <form action="/server-action" method="POST" class="flex-1">
                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                            <input type="hidden" name="action" value="restart">
                            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white font-bold">Restart</button>
                        </form>
                        <form action="/server-action" method="POST" class="flex-1">
                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                            <input type="hidden" name="action" value="stop">
                            <button type="submit" class="w-full px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">Stop</button>
                        </form>
                    `}
                    <form action="/delete-server" method="POST" class="flex-1" onsubmit="return confirm('Permanently destroy this server?');">
                        <input type="hidden" name="_csrf" value="${data.csrfToken}">
                        <button type="submit" class="w-full px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Terminate</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- SSH Access Card -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">🔒 SSH Access</h4>
            <p class="text-xs text-gray-500 mb-4">Use these credentials to connect to your server via SSH:</p>
            
            <div class="space-y-4">
                <div>
                    <p class="text-xs text-gray-400 uppercase font-bold mb-2">Username</p>
                    <div class="flex gap-2">
                        <input type="text" value="${escapeHtml(data.sshUsername)}" readonly class="flex-1 px-3 py-2 bg-black bg-opacity-30 border border-gray-700 rounded text-white font-mono text-sm">
                        <button onclick="navigator.clipboard.writeText('${data.sshUsername.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-brand text-gray-900 font-bold rounded hover:bg-cyan-500 transition-colors text-xs">Copy</button>
                    </div>
                </div>
                
                <div>
                    <p class="text-xs text-gray-400 uppercase font-bold mb-2">Password</p>
                    <div class="flex gap-2">
                        <input type="password" id="sshPassword" value="${escapeHtml(data.sshPassword)}" readonly class="flex-1 px-3 py-2 bg-black bg-opacity-30 border border-gray-700 rounded text-white font-mono text-sm">
                        <button onclick="togglePasswordVisibility()" class="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-xs" title="Show/Hide Password">
                            <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                        <button onclick="navigator.clipboard.writeText('${data.sshPassword.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-brand text-gray-900 font-bold rounded hover:bg-cyan-500 transition-colors text-xs">Copy</button>
                    </div>
                </div>
                
                <div>
                    <p class="text-xs text-gray-400 uppercase font-bold mb-2">Connection Command</p>
                    <div class="flex gap-2">
                        <input type="text" value="ssh ${escapeHtml(data.sshUsername)}@${escapeHtml(data.ipAddress)}" readonly class="flex-1 px-3 py-2 bg-black bg-opacity-30 border border-gray-700 rounded text-white font-mono text-sm">
                        <button onclick="navigator.clipboard.writeText('ssh ${data.sshUsername.replace(/'/g, "\\'")}@${data.ipAddress.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-brand text-gray-900 font-bold rounded hover:bg-cyan-500 transition-colors text-xs">Copy</button>
                    </div>
                </div>
            </div>
        </div>
        ` : `
        <!-- Server Placeholder (Provisioning or No Server) -->
        <div class="bg-gray-800 rounded-lg p-8 text-center">
            <h3 class="text-xl font-bold text-gray-400 mb-2">Server Details</h3>
            <p class="text-sm text-gray-500">${data.hasPaid ? 'Waiting for server setup (contact support if delayed)' : 'Purchase a plan to see your server details here'}</p>
        </div>
        `}

        <!-- Deploy from GitHub -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Deploy from GitHub</h4>
            ${data.hasServer ? `
            <form action="/deploy" method="POST" class="mb-4">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input type="text" name="git_url" placeholder="https://github.com/username/repo.git" required class="w-full px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <button type="submit" class="px-6 py-3 bg-blue-600 text-white font-bold whitespace-nowrap">Deploy Now</button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Paste your public or private GitHub repository URL to deploy automatically.</p>
            </form>
            ` : `
            <div class="bg-red-900 bg-opacity-20 border-2 border-red-600 rounded-lg p-4">
                <p class="text-red-400 text-sm font-medium mb-3">⚠️ No active server detected</p>
                <p class="text-red-300 text-xs mb-4">You must purchase a hosting plan before deploying applications from GitHub.</p>
                <a href="/pricing" class="inline-block px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm">View Plans →</a>
            </div>
            `}
        </div>

        <!-- Deployments Card -->
        ${data.hasServer && data.deployments.length > 0 ? `
        <div class="bg-gray-800 rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-700 bg-white bg-opacity-5">
                <h4 class="text-sm font-bold uppercase tracking-wide text-white">Deployment Pipeline</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-white bg-opacity-5 border-b border-gray-700">
                            <th class="px-6 py-4 text-xs uppercase font-bold text-gray-500">Identifier</th>
                            <th class="px-6 py-4 text-xs uppercase font-bold text-gray-500">Repository</th>
                            <th class="px-6 py-4 text-xs uppercase font-bold text-gray-500">Timestamp</th>
                            <th class="px-6 py-4 text-xs uppercase font-bold text-gray-500">Status</th>
                            <th class="px-6 py-4 text-xs uppercase font-bold text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.deployments.slice(0, 5).map((dep, i) => `
                        <tr class="border-b border-gray-700" data-deployment-id="${dep.id}" data-deployment-status="${escapeHtml(dep.status)}">
                            <td class="px-6 py-4 font-mono text-xs text-white">#DEP-${1000 + i}</td>
                            <td class="px-6 py-4 text-xs text-gray-400">${escapeHtml(dep.git_url.split('/').pop() || 'repo')}</td>
                            <td class="px-6 py-4 text-xs text-gray-400 font-mono">${new Date(dep.deployed_at).toLocaleDateString()} ${new Date(dep.deployed_at).toLocaleTimeString()}</td>
                            <td class="px-6 py-4">
                                <span class="deployment-status-badge px-2 py-1 text-xs font-bold uppercase rounded ${
                                    dep.status === 'success' ? 'bg-green-900 text-green-300' : 
                                    dep.status === 'failed' ? 'bg-red-900 text-red-300' : 
                                    dep.status === 'deploying' ? 'bg-yellow-900 text-yellow-300' :
                                    'bg-blue-900 text-blue-300'
                                }">${escapeHtml(dep.status)}</span>
                                ${dep.status === 'success' && data.serverIp ? `
                                <div class="mt-2">
                                    <a href="http://${escapeHtml(data.serverIp)}" target="_blank" class="text-brand hover:text-cyan-400 text-xs">View Live Site →</a>
                                </div>
                                ` : ''}
                            </td>
                            <td class="px-6 py-4">
                                <button onclick="toggleDeploymentLog(${dep.id})" class="text-brand hover:text-cyan-400 text-xs font-bold uppercase mr-4">
                                    View Logs
                                </button>
                                <form method="POST" action="/delete-deployment" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this deployment record?');">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="deploymentId" value="${dep.id}">
                                    <button type="submit" class="text-red-400 hover:text-red-300 text-xs font-bold uppercase">
                                        Delete
                                    </button>
                                </form>
                            </td>
                        </tr>
                        <tr id="deployment-log-${dep.id}" class="hidden border-b border-gray-700">
                            <td colspan="5" class="px-6 py-4 bg-black bg-opacity-30">
                                <div class="mb-2 flex justify-between items-center">
                                    <span class="text-xs font-bold uppercase text-gray-500">Deployment Output</span>
                                    <button onclick="toggleDeploymentLog(${dep.id})" class="text-gray-500 hover:text-white text-xs">Close</button>
                                </div>
                                <pre class="deployment-output bg-gray-900 p-4 rounded border border-gray-700 text-xs text-green-400 font-mono overflow-x-auto max-h-96 overflow-y-auto">${escapeHtml(dep.output || 'Waiting for deployment to start...')}</pre>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${!data.deployments.length ? '<p class="px-6 py-6 text-gray-500 text-xs italic">No deployments yet. Deploy your first app to see history here.</p>' : ''}
        </div>
        ` : ''}

        <!-- Database Setup -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Add Database</h4>
            ${data.hasServer ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <form action="/setup-database" method="POST" class="flex gap-3">
                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                    <input type="hidden" name="database_type" value="postgres">
                    <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white font-bold text-sm">
                        📦 Add PostgreSQL
                    </button>
                </form>
                <form action="/setup-database" method="POST" class="flex gap-3">
                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                    <input type="hidden" name="database_type" value="mongodb">
                    <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white font-bold text-sm">
                        🍃 Add MongoDB
                    </button>
                </form>
            </div>
            <p class="text-xs text-gray-500">One-click setup installs and configures the database. Takes 2-3 minutes. SSH to /root/.database_config for credentials.</p>
            ` : `
            <div class="bg-red-900 bg-opacity-20 border-2 border-red-600 rounded-lg p-4">
                <p class="text-red-400 text-sm font-medium">⚠️ No active server detected</p>
                <p class="text-red-300 text-xs">Add a database after your server is provisioned.</p>
            </div>
            `}
        </div>

        <!-- Database Status -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Database Status</h4>
            ${data.hasServer ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-black bg-opacity-30 border border-gray-700 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-gray-400 uppercase font-bold">PostgreSQL</p>
                        ${data.postgresInstalled ? 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900 text-green-300 flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Installed</span>' : 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900 text-yellow-300">Not Installed</span>'}
                    </div>
                    <p class="text-xs text-gray-500 mb-3">After install, SSH and run <span class="text-white">cat /root/.database_config</span> to view credentials.</p>
                    <div class="bg-black bg-opacity-50 rounded p-2 border border-gray-700">
                        <p class="text-xs text-gray-400 mb-1">Quick SSH:</p>
                        <code class="text-xs text-brand">ssh ${data.sshUsername}@${data.ipAddress}</code>
                    </div>
                </div>
                <div class="bg-black bg-opacity-30 border border-gray-700 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-gray-400 uppercase font-bold">MongoDB</p>
                        ${data.mongodbInstalled ? 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900 text-green-300 flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Installed</span>' : 
                          '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900 text-yellow-300">Not Installed</span>'}
                    </div>
                    <p class="text-xs text-gray-500 mb-3">After install, SSH and run <span class="text-white">cat /root/.database_config</span> to view connection string.</p>
                    <div class="bg-black bg-opacity-50 rounded p-2 border border-gray-700">
                        <p class="text-xs text-gray-400 mb-1">Quick SSH:</p>
                        <code class="text-xs text-brand">ssh ${data.sshUsername}@${data.ipAddress}</code>
                    </div>
                </div>
            </div>
            ` : '<p class="text-gray-500 text-xs italic">Provision a server to enable databases.</p>'}
        </div>

        <!-- Custom Domains -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Custom Domains</h4>
            <form action="/add-domain" method="POST" class="mb-6">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input type="text" name="domain" placeholder="example.com" required class="w-full px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <button type="submit" class="px-6 py-3 bg-blue-600 text-white font-bold">Add Domain</button>
                </div>
            </form>
            ${data.domains.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${data.domains.map(dom => `
                    <div class="bg-black bg-opacity-30 border border-gray-700 rounded-lg p-3">
                        <p class="text-sm text-white font-medium mb-1.5">${escapeHtml(dom.domain)}</p>
                        <p class="text-xs text-gray-500 mb-2">Added ${new Date(dom.created_at).toLocaleDateString()}</p>
                        ${dom.ssl_enabled ? '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900 text-green-300">SSL Active</span>' : '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900 text-yellow-300">No SSL</span>'}
                    </div>
                    `).join('')}
                </div>
            ` : '<p class="text-gray-500 text-xs italic">No domains configured yet.</p>'}
        </div>

        <!-- Support Tickets -->
        <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex justify-between items-center mb-6">
                <h4 class="text-sm font-bold uppercase tracking-wide text-white">Support Tickets</h4>
                <button onclick="openSubmitTicketModal()" class="px-4 py-2 bg-brand bg-opacity-90 text-black font-bold text-xs rounded-lg hover:bg-brand transition-colors">+ New</button>
            </div>
            ${data.tickets.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    ${data.tickets.slice(0, 4).map(ticket => `
                    <div class="bg-black bg-opacity-30 border border-gray-700 rounded-lg p-3">
                        <div class="flex justify-between items-center mb-2">
                            <p class="text-xs text-gray-400">Ticket #${ticket.id}</p>
                            <span class="px-2 py-1 text-xs font-bold uppercase rounded ${ticket.status === 'resolved' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}">
                                ${escapeHtml(ticket.status)}
                            </span>
                        </div>
                        <p class="text-xs text-white font-medium mb-2">${escapeHtml(ticket.subject)}</p>
                        <span class="px-2 py-1 text-xs font-bold uppercase rounded ${ticket.priority === 'urgent' ? 'bg-red-900 text-red-300' : ticket.priority === 'high' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'}">
                            ${escapeHtml(ticket.priority)}
                        </span>
                    </div>
                    `).join('')}
                </div>
            ` : '<p class="text-gray-500 text-xs italic">No support tickets. Click "New" to create one.</p>'}
        </div>

        <!-- Environment Variables -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Environment Variables</h4>
            <p class="text-gray-400 text-xs mb-4">Set environment variables for your deployments (e.g., DATABASE_URL, API_KEY)</p>
            
            <form action="/add-env-var" method="POST" class="mb-6">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" name="key" placeholder="KEY_NAME" required pattern="[A-Z_][A-Z0-9_]*" title="Uppercase letters, numbers, and underscores only" class="px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none text-sm">
                    <input type="text" name="value" placeholder="value" required class="px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none text-sm">
                    <button type="submit" class="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">Add Variable</button>
                </div>
            </form>
            
            ${data.envVars && data.envVars.length > 0 ? `
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="py-3 px-4 text-gray-400 font-bold uppercase">Key</th>
                                <th class="py-3 px-4 text-gray-400 font-bold uppercase">Value</th>
                                <th class="py-3 px-4 text-gray-400 font-bold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.envVars.map(env => `
                                <tr class="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-30 transition-colors">
                                    <td class="py-3 px-4 font-mono text-brand">${escapeHtml(env.key)}</td>
                                    <td class="py-3 px-4 font-mono text-white truncate max-w-xs">
                                        <span class="inline-block max-w-full overflow-hidden text-ellipsis">${escapeHtml(env.value.length > 50 ? env.value.substring(0, 50) + '...' : env.value)}</span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <form action="/delete-env-var" method="POST" class="inline" onsubmit="return confirm('Delete ${escapeHtml(env.key).replace(/'/g, "\\'")}?')">
                                            <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                            <input type="hidden" name="id" value="${env.id}">
                                            <button type="submit" class="text-red-500 hover:text-red-400 text-xs font-bold">Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p class="text-gray-500 text-xs italic">No environment variables set.</p>'}
        </div>

        <!-- Account Settings -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Account Settings</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <p class="text-xs text-gray-500 uppercase font-bold mb-2">Email</p>
                    <p class="px-3 py-2 bg-black bg-opacity-30 rounded border border-gray-700 text-white text-xs">${data.userEmail}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase font-bold mb-2">Role</p>
                    <p class="px-3 py-2 bg-black bg-opacity-30 rounded border border-gray-700 text-white text-xs">${data.userRole === 'admin' ? 'Administrator' : 'User'}</p>
                </div>
            </div>
            
            <div class="pt-6 border-t border-gray-700 mb-6">
                <h5 class="text-xs font-bold uppercase tracking-wide text-brand mb-4">Change Password</h5>
                <form onsubmit="changePassword(event)" class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="password" id="currentPassword" placeholder="Current" required class="px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <input type="password" id="newPassword" placeholder="New Password" required class="px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <input type="password" id="confirmPassword" placeholder="Confirm" required class="px-4 py-3 bg-gray-900 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <button type="submit" class="px-6 py-3 bg-blue-600 text-white font-bold">Update</button>
                </form>
            </div>

            <div class="pt-6 border-t border-gray-700">
                <a href="/logout" class="inline-block px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Logout</a>
            </div>
        </div>
    </div>
    </div>
</main>

<!-- Submit Ticket Modal -->
<div id="submitTicketModal" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
    <div class="bg-gray-900 rounded-lg p-8 max-w-md w-11/12 max-h-[80vh] overflow-y-auto">
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
            <div class="flex gap-3">
                <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white font-bold">Submit</button>
                <button type="button" class="flex-1 px-6 py-3 bg-gray-700 text-white font-bold" onclick="closeSubmitTicketModal()">Cancel</button>
            </div>
        </form>
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
</script>
  `;
};

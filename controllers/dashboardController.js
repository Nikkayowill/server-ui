const pool = require('../db');
const { getDashboardHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

// GET /dashboard
exports.showDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        const flashSuccess = req.query.success || '';
        const flashError = req.query.error || '';
        const emailConfirmed = !!req.session.emailConfirmed;

        // Check if user has paid (not currently used in template but kept for logic)
        const paymentCheck = await pool.query(
            'SELECT 1 FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, 'succeeded']
        );
        const hasPaid = paymentCheck.rows.length > 0;

        // Get user's server info
        const serverResult = await pool.query(
            'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        const server = serverResult.rows[0] || null;
        const hasServer = !!server;

        // Get payment details to determine plan
        const paymentResult = hasPaid ? await pool.query(
            'SELECT plan FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, 'succeeded']
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
            csrfToken,
            deployments: deploymentsResult.rows || [],
            domains: domainsResult.rows || [],
            tickets: ticketsResult.rows || [],
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            hasPaid,
            hasServer,
            dismissedNextSteps: req.session.dismissedNextSteps || false
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
<main class="flex-1 px-4 md:px-8 lg:px-12 pt-24 pb-12">
    <!-- Header -->
    <header class="flex flex-col gap-6 mb-12">
        <div>
            <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand text-opacity-70 mb-2">
                <span class="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></span>
                Live Connection Established
            </div>
            <h2 class="text-3xl font-bold text-white uppercase tracking-tight">
                Control Panel <span class="text-brand font-normal">v2</span>
            </h2>
        </div>
        <div class="flex items-center gap-4">
            <div class="border-r border-white border-opacity-5 pr-4 mr-4">
                <p class="text-xs text-gray-500 uppercase">Local Time</p>
                <p class="text-sm font-bold text-white font-mono" id="clock">00:00:00</p>
            </div>
        </div>
    </header>

    <!-- Alerts -->
    ${data.flashSuccess ? `<div class="bg-green-900 border border-green-700 text-green-300 px-6 py-4 rounded-lg mb-6 flex items-center justify-between">${data.flashSuccess}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-green-300 hover:text-green-100 font-bold text-xl">&times;</button></div>` : ''}
    ${data.flashError ? `<div class="bg-red-900 border border-red-700 text-red-300 px-6 py-4 rounded-lg mb-6 flex items-center justify-between">${data.flashError}<button onclick="this.parentElement.style.display='none'" class="ml-4 text-red-300 hover:text-red-100 font-bold text-xl">&times;</button></div>` : ''}

    ${!data.emailConfirmed ? `
    <div class="bg-yellow-900 bg-opacity-10 border-2 border-yellow-600 px-6 py-4 rounded-lg text-center max-w-6xl mx-auto mb-6">
        <p class="text-yellow-600 text-sm mb-3"><strong>Email not confirmed</strong> - Verify to unlock purchases.</p>
        <button id="resendEmailBtn" class="px-6 py-2 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors">Resend Code</button>
        <div id="resendStatus" class="mt-2 text-sm"></div>
    </div>
    <script>
        document.getElementById('resendEmailBtn').addEventListener('click', async () => {
            const btn = document.getElementById('resendEmailBtn');
            const status = document.getElementById('resendStatus');
            btn.disabled = true;
            btn.textContent = 'Sending...';
            try {
                const res = await fetch('/resend-code', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (data.success) {
                    status.className = 'mt-2 text-sm text-green-400';
                    status.textContent = data.message;
                    btn.textContent = 'Code Sent!';
                    setTimeout(() => { btn.textContent = 'Resend Code'; btn.disabled = false; }, 3000);
                } else {
                    status.className = 'mt-2 text-sm text-red-400';
                    status.textContent = data.error;
                    btn.disabled = false;
                }
            } catch (err) {
                status.className = 'mt-2 text-sm text-red-400';
                status.textContent = 'Failed to send';
                btn.disabled = false;
            }
        });
    </script>
    ` : ''}
    
    ${data.hasServer && !data.dismissedNextSteps ? `
    <!-- Next Steps Banner -->
    <div id="nextStepsBanner" class="bg-gradient-to-r from-brand to-cyan-600 rounded-lg p-6 mb-8 border-2 border-brand shadow-lg">
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-4">
                    <h3 class="text-2xl font-bold text-gray-900">Server Online - Ready to Deploy!</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur">
                        <div class="text-gray-900 font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">1️⃣</span> Deploy with Git
                        </div>
                        <p class="text-gray-800 text-sm">Scroll down to Deployment section → paste your repo URL → automatic setup</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur">
                        <div class="text-gray-900 font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">2️⃣</span> Connect via SSH
                        </div>
                        <p class="text-gray-800 text-sm">See SSH Access section below for credentials and connection command</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur">
                        <div class="text-gray-900 font-bold mb-2 flex items-center gap-2">
                            <span class="text-xl">3️⃣</span> Add Domain + SSL
                        </div>
                        <p class="text-gray-800 text-sm">Custom Domains section → point DNS → one-click free SSL certificate</p>
                    </div>
                </div>
                <p class="text-gray-900 text-sm font-medium">First time? Git deployment is the easiest way to get started!</p>
            </div>
            <button onclick="dismissNextSteps()" class="ml-4 text-gray-900 hover:text-gray-700 text-3xl font-bold leading-none px-2">×</button>
        </div>
    </div>
    ` : ''}

    <!-- Provisioning Banner (Compact) -->
    ${!data.hasServer && data.hasPaid ? `
    <div class="bg-brand bg-opacity-10 border-l-4 border-brand rounded-lg p-4 mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <div>
                <h3 class="text-lg font-bold text-white">Server Provisioning in Progress</h3>
                <p class="text-sm text-gray-300">Your <span class="text-brand font-bold">${data.plan}</span> server is being created (2-5 min). You'll receive an email at <strong class="text-white">${data.userEmail}</strong> when ready.</p>
            </div>
        </div>
        <button onclick="location.reload()" class="px-4 py-2 bg-brand text-gray-900 font-bold text-sm rounded-lg hover:bg-cyan-500 transition-colors whitespace-nowrap">
            Check Status
        </button>
    </div>
    ` : ''}

    <!-- No Server Prompt -->
    ${!data.hasServer && !data.hasPaid ? `
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center mb-6">
            <h2 class="text-3xl font-bold text-white mb-4">Welcome to Basement!</h2>
            <p class="text-xl text-gray-400 mb-6">You don't have a server yet. Get started by choosing a hosting plan.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto text-left">
                <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
                    <h3 class="text-brand text-lg font-bold mb-2">Basic</h3>
                    <p class="text-3xl font-bold text-white mb-2">$25<span class="text-sm text-gray-400">/mo</span></p>
                    <p class="text-gray-400 text-sm">1GB RAM, 1 CPU, 25GB SSD</p>
                </div>
                <div class="bg-gray-900 border border-brand rounded-lg p-6">
                    <h3 class="text-brand text-lg font-bold mb-2">Priority</h3>
                    <p class="text-3xl font-bold text-white mb-2">$60<span class="text-sm text-gray-400">/mo</span></p>
                    <p class="text-gray-400 text-sm">2GB RAM, 2 CPUs, 50GB SSD</p>
                </div>
                <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
                    <h3 class="text-brand text-lg font-bold mb-2">Premium</h3>
                    <p class="text-3xl font-bold text-white mb-2">$120<span class="text-sm text-gray-400">/mo</span></p>
                    <p class="text-gray-400 text-sm">4GB RAM, 2 CPUs, 80GB SSD</p>
                </div>
            </div>
            
            <a href="/pricing" class="px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors inline-block">View All Plans</a>
        </div>
    ` : ''}

    <!-- Main Content Grid -->
    <div class="max-w-7xl mx-auto space-y-6">
        ${data.hasServer ? `
        <div class="bg-gray-800 border border-gray-700 border-l-4 border-l-brand rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-700 bg-white bg-opacity-5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full ${data.serverStatus === 'active' ? 'bg-green-500' : 'bg-gray-500'} shadow-lg"></div>
                        <h4 class="text-sm font-bold uppercase tracking-wide text-white">
                            Instance Core: <span class="text-brand">${data.serverName}</span>
                        </h4>
                    </div>
                    <div class="flex gap-2">
                        <button class="p-2 border border-white border-opacity-5 bg-transparent hover:bg-white hover:bg-opacity-5 text-brand rounded">⟳</button>
                        <button class="p-2 border border-white border-opacity-5 bg-transparent hover:bg-white hover:bg-opacity-5 text-gray-500 rounded">Settings</button>
                    </div>
                </div>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <div class="space-y-4 mb-6">
                            <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                                <span class="text-xs text-gray-500 uppercase font-bold">IPv4 Interface</span>
                                <span class="text-sm font-mono text-brand">${data.ipAddress}</span>
                            </div>
                            <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                                <span class="text-xs text-gray-500 uppercase font-bold">Host Name</span>
                                <span class="text-sm font-mono text-white">${data.serverName}</span>
                            </div>
                            <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                                <span class="text-xs text-gray-500 uppercase font-bold">Plan</span>
                                <span class="text-sm font-mono text-white">${data.plan.toUpperCase()}</span>
                            </div>
                            <div class="flex justify-between items-center pb-2 border-b border-white border-opacity-5">
                                <span class="text-xs text-gray-500 uppercase font-bold">Status</span>
                                <span class="text-sm font-mono ${data.serverStatus === 'active' ? 'text-green-500' : 'text-red-400'}">${data.serverStatus.toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            ${data.serverStatus === 'stopped' ? `
                                <form action="/server-action" method="POST" class="flex-1">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="action" value="start">
                                    <button type="submit" class="w-full px-4 py-2 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Start Core</button>
                                </form>
                            ` : `
                                <form action="/server-action" method="POST" class="flex-1">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="action" value="restart">
                                    <button type="submit" class="w-full px-4 py-2 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Restart</button>
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
            </div>
        </div>
        ` : `
        <!-- Server Placeholder (Provisioning or No Server) -->
        <div class="bg-gray-800 border border-gray-700 border-l-4 border-l-gray-600 rounded-lg p-8 text-center">
            <h3 class="text-xl font-bold text-gray-400 mb-2">Server Details</h3>
            <p class="text-sm text-gray-500">${data.hasPaid ? 'Your server is being provisioned...' : 'Purchase a plan to see your server details here'}</p>
        </div>
        `}

        <!-- Deployments Card -->
        ${data.hasServer && data.deployments.length > 0 ? `
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
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
                        <tr class="border-b border-gray-700" data-deployment-id="${dep.id}" data-deployment-status="${dep.status}">
                            <td class="px-6 py-4 font-mono text-xs text-white">#DEP-${1000 + i}</td>
                            <td class="px-6 py-4 text-xs text-gray-400">${dep.git_url.split('/').pop() || 'repo'}</td>
                            <td class="px-6 py-4 text-xs text-gray-400 font-mono">${new Date(dep.deployed_at).toLocaleDateString()} ${new Date(dep.deployed_at).toLocaleTimeString()}</td>
                            <td class="px-6 py-4">
                                <span class="deployment-status-badge px-2 py-1 text-xs font-bold uppercase rounded ${
                                    dep.status === 'success' ? 'bg-green-900 text-green-300' : 
                                    dep.status === 'failed' ? 'bg-red-900 text-red-300' : 
                                    dep.status === 'deploying' ? 'bg-yellow-900 text-yellow-300' :
                                    'bg-blue-900 text-blue-300'
                                }">${dep.status}</span>
                                ${dep.status === 'success' && data.serverIp ? `
                                <div class="mt-2">
                                    <a href="http://${data.serverIp}" target="_blank" class="text-brand hover:text-cyan-400 text-xs">View Live Site →</a>
                                </div>
                                ` : ''}
                            </td>
                            <td class="px-6 py-4">
                                <button onclick="toggleDeploymentLog(${dep.id})" class="text-brand hover:text-cyan-400 text-xs font-bold uppercase">
                                    View Logs
                                </button>
                            </td>
                        </tr>
                        <tr id="deployment-log-${dep.id}" class="hidden border-b border-gray-700">
                            <td colspan="5" class="px-6 py-4 bg-black bg-opacity-30">
                                <div class="mb-2 flex justify-between items-center">
                                    <span class="text-xs font-bold uppercase text-gray-500">Deployment Output</span>
                                    <button onclick="toggleDeploymentLog(${dep.id})" class="text-gray-500 hover:text-white text-xs">Close</button>
                                </div>
                                <pre class="deployment-output bg-gray-900 p-4 rounded border border-gray-700 text-xs text-green-400 font-mono overflow-x-auto max-h-96 overflow-y-auto">${dep.output || 'Waiting for deployment to start...'}</pre>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${!data.deployments.length ? '<p class="px-6 py-6 text-gray-500 text-xs italic">No deployments yet. Deploy your first app to see history here.</p>' : ''}
        </div>
        ` : ''}

        <!-- Custom Domains -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-6">Custom Domains</h4>
            <form action="/add-domain" method="POST" class="mb-6">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input type="text" name="domain" placeholder="example.com" required class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <button type="submit" class="px-6 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Add Domain</button>
                </div>
            </form>
            ${data.domains.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${data.domains.map(dom => `
                    <div class="bg-black bg-opacity-30 border border-gray-700 rounded-lg p-3">
                        <p class="text-sm text-white font-medium mb-1.5">${dom.domain}</p>
                        <p class="text-xs text-gray-500 mb-2">Added ${new Date(dom.created_at).toLocaleDateString()}</p>
                        ${dom.ssl_enabled ? '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-green-900 text-green-300">SSL Active</span>' : '<span class="px-2 py-1 text-xs font-bold uppercase rounded bg-yellow-900 text-yellow-300">No SSL</span>'}
                    </div>
                    `).join('')}
                </div>
            ` : '<p class="text-gray-500 text-xs italic">No domains configured yet.</p>'}
        </div>

        <!-- Support Tickets -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
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
                                ${ticket.status}
                            </span>
                        </div>
                        <p class="text-xs text-white font-medium mb-2">${ticket.subject}</p>
                        <span class="px-2 py-1 text-xs font-bold uppercase rounded ${ticket.priority === 'urgent' ? 'bg-red-900 text-red-300' : ticket.priority === 'high' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'}">
                            ${ticket.priority}
                        </span>
                    </div>
                    `).join('')}
                </div>
            ` : '<p class="text-gray-500 text-xs italic">No support tickets. Click "New" to create one.</p>'}
        </div>

        <!-- Account Settings -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
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
                    <input type="password" id="currentPassword" placeholder="Current" required class="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <input type="password" id="newPassword" placeholder="New Password" required class="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <input type="password" id="confirmPassword" placeholder="Confirm" required class="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none">
                    <button type="submit" class="px-6 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Update</button>
                </form>
            </div>

            <div class="pt-6 border-t border-gray-700">
                <a href="/logout" class="inline-block px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Logout</a>
            </div>
        </div>
    </div>
</main>

<!-- Submit Ticket Modal -->
<div id="submitTicketModal" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
    <div class="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-11/12 max-h-[80vh] overflow-y-auto">
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
                <button type="submit" class="flex-1 px-6 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Submit</button>
                <button type="button" class="flex-1 px-6 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors" onclick="closeSubmitTicketModal()">Cancel</button>
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

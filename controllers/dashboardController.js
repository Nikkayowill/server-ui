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
        const server = serverResult.rows[0] || {};

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
            bandwidthUsed: '',
            serverCount: 1,
            totalRam: server.ram || '4GB',
            cpuLoad: 45,
            ramUsage: 30,
            diskUsage: 10,
            serverStatus: server.status || 'unknown',
            serverName: server.hostname || 'basement-core',
            plan: (server.plan || 'basic').toString(),
            ipAddress: server.ip_address || '',
            csrfToken,
            deployments: deploymentsResult.rows || [],
            domains: domainsResult.rows || [],
            tickets: ticketsResult.rows || [],
            userEmail: req.session.userEmail,
            userRole: req.session.userRole,
            hasPaid
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
    const bcrypt = require('bcryptjs');
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
  const cpuPercent = data.cpuLoad || 45;
  const ramPercent = data.ramUsage || 30;
  const diskPercent = data.diskUsage || 10;
  
  // Calculate SVG stroke offset for circular monitors (220px circumference)
  const cpuOffset = 220 - (220 * cpuPercent / 100);
  const ramOffset = 220 - (220 * ramPercent / 100);
  const diskOffset = 220 - (220 * diskPercent / 100);

  return `
<!-- Main Content -->
<div style="flex: 1; padding: 5rem 3rem 3rem 3rem;">
    <!-- Header -->
    <header style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 3rem;">
        <div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(45, 167, 223, 0.7); margin-bottom: 8px;">
                <span style="width: 6px; height: 6px; background: var(--glow); border-radius: 50%; animation: pulse 1.5s infinite;"></span>
                Live Connection Established
            </div>
            <h2 style="font-size: 1.75rem; font-weight: 700; color: white; letter-spacing: -0.5px; margin: 0; text-transform: uppercase;">
                Control Panel <span style="color: var(--glow); font-weight: 400;">v2</span>
            </h2>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="border-right: 1px solid rgba(255, 255, 255, 0.05); padding-right: 1rem; margin-right: 1rem;">
                <p style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; margin: 0;">Local Time</p>
                <p style="font-size: 14px; font-weight: 700; color: white; font-family: 'JetBrains Mono', monospace; margin: 0;" id="clock">00:00:00</p>
            </div>
        </div>
    </header>

    <!-- Alerts -->
    ${data.flashSuccess ? `<div class="alert success">${data.flashSuccess}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
    ${data.flashError ? `<div class="alert error">${data.flashError}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}

    ${!data.emailConfirmed ? `
    <div style="background: rgba(255, 170, 0, 0.1); border: 2px solid #ffaa00; padding: 16px; margin: 20px auto; max-width: 1200px; border-radius: 4px; text-align: center;">
        <p style="color: #ffaa00; font-size: 14px; margin-bottom: 8px;">⚠️ <strong>Email not confirmed</strong> - Verify to unlock purchases.</p>
        <button id="resendEmailBtn" class="dash-btn" style="background: #ffaa00; color: #000;">Resend Code</button>
        <div id="resendStatus" style="margin-top: 8px; font-size: 13px;"></div>
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
                    status.style.color = '#88FE00';
                    status.textContent = '✓ ' + data.message;
                    btn.textContent = 'Code Sent!';
                    setTimeout(() => { btn.textContent = 'Resend Code'; btn.disabled = false; }, 3000);
                } else {
                    status.style.color = '#ff4444';
                    status.textContent = '✗ ' + data.error;
                    btn.disabled = false;
                }
            } catch (err) {
                status.style.color = '#ff4444';
                status.textContent = '✗ Failed to send';
                btn.disabled = false;
            }
        });
    </script>
    ` : ''}

    <!-- Stats Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="dash-card" style="background: linear-gradient(to bottom right, rgba(45, 167, 223, 0.05), transparent);">
            <p class="stat-label">Global Traffic</p>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0;">${data.bandwidthUsed || '0'}/s</h3>
                <div style="font-size: 10px; color: #22c55e; font-weight: 700;">+12%</div>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); overflow: hidden; border-radius: 2px;">
                <div style="height: 100%; background: var(--glow); width: 66%; box-shadow: 0 0 10px rgba(45, 167, 223, 0.5);"></div>
            </div>
        </div>
        <div class="dash-card">
            <p class="stat-label">Active Instances</p>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0;">${data.serverCount || 0}</h3>
                <div style="font-size: 10px; color: var(--glow); font-weight: 700;">Stable</div>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); overflow: hidden; border-radius: 2px;">
                <div style="height: 100%; background: #22c55e; width: 95%;"></div>
            </div>
        </div>
        <div class="dash-card">
            <p class="stat-label">Memory Pool</p>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0;">${data.totalRam || '0'}</h3>
                <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700;">${ramPercent}% Used</div>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); overflow: hidden; border-radius: 2px;">
                <div style="height: 100%; background: #facc15; width: ${ramPercent}%;"></div>
            </div>
        </div>
        <div class="dash-card">
            <p class="stat-label">System Load</p>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0;">1.04</h3>
                <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700;">Optimal</div>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); overflow: hidden; border-radius: 2px;">
                <div style="height: 100%; background: var(--glow); width: 33%;"></div>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5rem;">
        <!-- Primary Server Card (Full Width) -->
        <div class="dash-card" style="grid-column: span 12; border-left: 4px solid var(--glow); position: relative; overflow: hidden;">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-cyan); background: rgba(255, 255, 255, 0.01);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 8px; height: 8px; background: ${data.serverStatus === 'active' ? '#22c55e' : '#6b7280'}; border-radius: 50%; box-shadow: 0 0 8px currentColor;"></div>
                        <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                            Instance Core: <span style="color: var(--glow);">${data.serverName}</span>
                        </h4>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button style="padding: 8px; border: 1px solid rgba(255, 255, 255, 0.05); background: transparent; cursor: pointer; color: var(--glow);">⟳</button>
                        <button style="padding: 8px; border: 1px solid rgba(255, 255, 255, 0.05); background: transparent; cursor: pointer; color: var(--text-secondary);">⚙</button>
                    </div>
                </div>
            </div>
            <div style="padding: 1.5rem 2rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                        <div style="space-y: 1.5rem;">
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 8px; margin-bottom: 16px;">
                                <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">IPv4 Interface</span>
                                <span style="font-size: 14px; font-family: 'JetBrains Mono', monospace; color: var(--glow);">${data.ipAddress}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 8px; margin-bottom: 16px;">
                                <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Host Name</span>
                                <span style="font-size: 14px; font-family: 'JetBrains Mono', monospace; color: white;">${data.serverName}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 8px; margin-bottom: 16px;">
                                <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Plan</span>
                                <span style="font-size: 14px; font-family: 'JetBrains Mono', monospace; color: white;">${data.plan.toUpperCase()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 8px;">
                                <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Status</span>
                                <span style="font-size: 14px; font-family: 'JetBrains Mono', monospace; color: ${data.serverStatus === 'active' ? '#22c55e' : '#f87171'};">${data.serverStatus.toUpperCase()}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-top: 2rem;">
                            ${data.serverStatus === 'stopped' ? `
                                <form action="/server-action" method="POST" style="flex: 1;">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="action" value="start">
                                    <button type="submit" class="dash-btn" style="width: 100%;">Start Core</button>
                                </form>
                            ` : `
                                <form action="/server-action" method="POST" style="flex: 1;">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="action" value="restart">
                                    <button type="submit" class="dash-btn" style="width: 100%;">Restart</button>
                                </form>
                                <form action="/server-action" method="POST" style="flex: 1;">
                                    <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                    <input type="hidden" name="action" value="stop">
                                    <button type="submit" class="dash-btn dash-btn-secondary" style="width: 100%;">Stop</button>
                                </form>
                            `}
                            <form action="/delete-server" method="POST" style="flex: 1;" onsubmit="return confirm('Permanently destroy this server?');">
                                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                                <button type="submit" class="dash-btn dash-btn-danger" style="width: 100%;">Terminate</button>
                            </form>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2);">
                            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 8px;">
                                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="4"></circle>
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="var(--glow)" stroke-width="4" stroke-linecap="round" style="stroke-dasharray: 220; stroke-dashoffset: ${cpuOffset}; filter: drop-shadow(0 0 5px var(--glow)); transition: stroke-dashoffset 1s ease-out;"></circle>
                                </svg>
                                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white;">${cpuPercent}%</div>
                            </div>
                            <span style="font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">CPU Load</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2);">
                            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 8px;">
                                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="4"></circle>
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round" style="stroke-dasharray: 220; stroke-dashoffset: ${ramOffset}; filter: drop-shadow(0 0 5px #a855f7); transition: stroke-dashoffset 1s ease-out;"></circle>
                                </svg>
                                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white;">${ramPercent}%</div>
                            </div>
                            <span style="font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">RAM Usage</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2);">
                            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 8px;">
                                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="4"></circle>
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" style="stroke-dasharray: 220; stroke-dashoffset: ${diskOffset}; filter: drop-shadow(0 0 5px #f59e0b); transition: stroke-dashoffset 1s ease-out;"></circle>
                                </svg>
                                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white;">${diskPercent}%</div>
                            </div>
                            <span style="font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Disk IO</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2);">
                            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 8px;">
                                <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="4"></circle>
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" style="stroke-dasharray: 220; stroke-dashoffset: calc(220 - 220 * 92 / 100); filter: drop-shadow(0 0 5px #22c55e);"></circle>
                                </svg>
                                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white;">92%</div>
                            </div>
                            <span style="font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Net Sync</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Deployments Card -->
        <div class="dash-card" style="grid-column: span 12;">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-cyan); background: rgba(255, 255, 255, 0.01);">
                <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin: 0;">📦 Deployment Pipeline</h4>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="background: rgba(255, 255, 255, 0.01); border-bottom: 1px solid var(--border-cyan);">
                            <th style="padding: 1rem 1.5rem; font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary);">Identifier</th>
                            <th style="padding: 1rem 1.5rem; font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary);">Repository</th>
                            <th style="padding: 1rem 1.5rem; font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary);">Timestamp</th>
                            <th style="padding: 1rem 1.5rem; font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary);">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.deployments.slice(0, 5).map((dep, i) => `
                        <tr style="border-bottom: 1px solid var(--border-cyan);">
                            <td style="padding: 1rem 1.5rem; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: white;">#DEP-${1000 + i}</td>
                            <td style="padding: 1rem 1.5rem; font-size: 12px; color: var(--text-secondary);">${dep.git_url.split('/').pop() || 'repo'}</td>
                            <td style="padding: 1rem 1.5rem; font-size: 12px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace;">${new Date(dep.deployed_at).toLocaleDateString()} ${new Date(dep.deployed_at).toLocaleTimeString()}</td>
                            <td style="padding: 1rem 1.5rem;"><span class="status-badge ${dep.status === 'success' ? 'status-active' : 'status-failed'}">${dep.status.toUpperCase()}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${!data.deployments.length ? '<p style="padding: 1.5rem; color: #666; font-size: 12px; font-style: italic;">No deployments yet. Deploy your first app to see history here.</p>' : ''}
        </div>

        <!-- Right Column: Domains & Quick Actions -->
        <div style="grid-column: span 12; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border-cyan); border-radius: 4px; padding: 1.5rem;">
            <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin: 0 0 1.5rem 0;">🌐 Custom Domains</h4>
            <form action="/add-domain" method="POST" style="margin-bottom: 1.5rem;">
                <input type="hidden" name="_csrf" value="${data.csrfToken}">
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px;">
                    <input type="text" name="domain" placeholder="example.com" class="dash-form-input" required>
                    <button type="submit" class="dash-btn">Add Domain</button>
                </div>
            </form>
            ${data.domains.length > 0 ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">
                    ${data.domains.map(dom => `
                    <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-cyan); border-radius: 4px; padding: 12px;">
                        <p style="font-size: 13px; color: white; font-weight: 500; margin: 0 0 6px 0;">${dom.domain}</p>
                        <p style="font-size: 11px; color: #666; margin: 0 0 8px 0;">Added ${new Date(dom.created_at).toLocaleDateString()}</p>
                        ${dom.ssl_enabled ? '<span class="status-badge status-active" style="font-size: 9px;">🔒 SSL</span>' : '<span class="status-badge" style="font-size: 9px; background: rgba(255, 184, 0, 0.2); color: #facc15;">⚠️ No SSL</span>'}
                    </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #666; font-size: 12px; font-style: italic;">No domains configured yet.</p>'}
        </div>

        <!-- Tickets & Alerts -->
        <div style="grid-column: span 12; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border-cyan); border-radius: 4px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin: 0;">🎫 Support Tickets</h4>
                <button onclick="openSubmitTicketModal()" class="dash-btn" style="background: rgba(45, 167, 223, 0.9); color: #000; padding: 6px 12px; font-size: 11px;">+ New</button>
            </div>
            ${data.tickets.length > 0 ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                    ${data.tickets.slice(0, 4).map(ticket => `
                    <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-cyan); border-radius: 4px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <p style="font-size: 11px; color: var(--text-secondary); margin: 0;">Ticket #${ticket.id}</p>
                            <span class="status-badge ${ticket.status === 'resolved' ? 'status-active' : 'status-provisioning'}" style="font-size: 9px;">
                                ${ticket.status.toUpperCase()}
                            </span>
                        </div>
                        <p style="font-size: 12px; color: white; margin: 0 0 8px 0; font-weight: 500;">${ticket.subject}</p>
                        <span class="status-badge ${ticket.priority === 'urgent' ? 'status-failed' : ticket.priority === 'high' ? 'status-provisioning' : 'status-active'}" style="font-size: 9px;">
                            ${ticket.priority.toUpperCase()}
                        </span>
                    </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #666; font-size: 12px; font-style: italic;">No support tickets. Click "New" to create one.</p>'}
        </div>

        <!-- Account Settings -->
        <div style="grid-column: span 12; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border-cyan); border-radius: 4px; padding: 1.5rem;">
            <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin: 0 0 1.5rem 0;">⚙️ Account Settings</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div>
                    <p class="stat-label">Email</p>
                    <p style="padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 3px; border: 1px solid var(--border-cyan); margin: 0; color: white; font-size: 12px;">${data.userEmail}</p>
                </div>
                <div>
                    <p class="stat-label">Role</p>
                    <p style="padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 3px; border: 1px solid var(--border-cyan); margin: 0; color: white; font-size: 12px;">${data.userRole === 'admin' ? 'Administrator' : 'User'}</p>
                </div>
            </div>
            
            <div style="padding-top: 1.5rem; border-top: 1px solid var(--border-cyan); margin-bottom: 1.5rem;">
                <h5 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); margin: 0 0 1rem 0;">Change Password</h5>
                <form onsubmit="changePassword(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                    <input type="password" id="currentPassword" placeholder="Current" class="dash-form-input" required>
                    <input type="password" id="newPassword" placeholder="New Password" class="dash-form-input" required>
                    <input type="password" id="confirmPassword" placeholder="Confirm" class="dash-form-input" required>
                    <button type="submit" class="dash-btn">Update</button>
                </form>
            </div>

            <div style="padding-top: 1.5rem; border-top: 1px solid var(--border-cyan);">
                <a href="/logout" class="dash-btn dash-btn-danger" style="display: inline-block; text-decoration: none; padding: 8px 16px;">Logout</a>
            </div>
        </div>
    </div>
</div>

<!-- Submit Ticket Modal -->
<div id="submitTicketModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; justify-content: center; align-items: center;">
    <div style="background: #0f0f0f; border: 1px solid var(--border-cyan); border-radius: 4px; padding: 2rem; max-width: 450px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <h2 style="font-size: 18px; margin: 0 0 1.5rem 0; color: white;">Submit Support Ticket</h2>
        <form onsubmit="submitTicket(event)">
            <div class="dash-form-group">
                <label class="dash-form-label">Subject</label>
                <input type="text" id="ticketSubject" class="dash-form-input" placeholder="Brief description" required maxlength="100">
            </div>
            <div class="dash-form-group">
                <label class="dash-form-label">Priority</label>
                <select id="ticketPriority" class="dash-form-select">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <div class="dash-form-group">
                <label class="dash-form-label">Description</label>
                <textarea id="ticketDescription" class="dash-form-textarea" placeholder="Details about your issue" required></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button type="submit" class="dash-btn" style="flex: 1;">Submit</button>
                <button type="button" class="dash-btn dash-btn-secondary" style="flex: 1;" onclick="closeSubmitTicketModal()">Cancel</button>
            </div>
        </form>
    </div>
</div>

<script>
function openSubmitTicketModal() { document.getElementById('submitTicketModal').style.display = 'flex'; }
function closeSubmitTicketModal() { document.getElementById('submitTicketModal').style.display = 'none'; }
document.getElementById('submitTicketModal')?.addEventListener('click', (e) => {
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

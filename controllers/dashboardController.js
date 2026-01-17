const pool = require('../db');
const { getDashboardHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

// GET /dashboard
exports.showDashboard = async (req, res) => {
  try {
    // Get user's server info
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    // No server state - show simplified dashboard
    if (serverResult.rows.length === 0) {
      return res.send(`
${getDashboardHead('Dashboard - Basement')}
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Dashboard</h1>
        
        ${req.query.success ? `<div class="alert success">${req.query.success}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.error ? `<div class="alert error">${req.query.error}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.message ? `<div class="alert success">${req.query.message}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        
        <div class="card" style="text-align: center; padding: 64px 32px;">
            <h2 style="font-size: 32px; margin-bottom: 16px;">Welcome to Basement</h2>
            <p style="color: #8892a0; font-size: 16px; margin-bottom: 32px;">You don't have a server yet. Get started by choosing a plan.</p>
            <a href="/pricing" class="btn" style="display: inline-block; padding: 16px 32px; font-size: 16px;">View Plans</a>
        </div>
        
        <div class="dashboard-grid" style="margin-top: 32px;">
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">📊 Monitor</h3>
                <p style="color: #8892a0; font-size: 14px;">Track your server's performance, CPU usage, memory, and disk space in real-time.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🚀 Deploy</h3>
                <p style="color: #8892a0; font-size: 14px;">Connect your Git repository and deploy applications with a single click.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🌐 Domains</h3>
                <p style="color: #8892a0; font-size: 14px;">Add custom domains and manage DNS settings for your applications.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🔒 SSH Access</h3>
                <p style="color: #8892a0; font-size: 14px;">Full SSH access to your server with secure credentials and connection details.</p>
            </div>
        </div>
    </div>
    
    <script src="/js/nav.js"></script>
</body>
</html>
      `);
    }

    const server = serverResult.rows[0];
    
    // Get deployment history
    const deploymentsResult = await pool.query(
      'SELECT * FROM deployments WHERE user_id = $1 ORDER BY deployed_at DESC LIMIT 10',
      [req.session.userId]
    );

    // Get domains
    const domainsResult = await pool.query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    
    const deployments = deploymentsResult.rows;
    const domains = domainsResult.rows;
    const specs = typeof server.specs === 'string' ? JSON.parse(server.specs) : server.specs;

    res.send(`
${getDashboardHead('Dashboard - Basement')}
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Dashboard</h1>
        
        ${req.query.success ? `<div class="alert success">${req.query.success}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.error ? `<div class="alert error">${req.query.error}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        
        <div class="dashboard-grid">
            <div class="card">
                <h2>Server Status</h2>
                <p><span class="status ${server.status}">${server.status}</span></p>
                ${server.status === 'provisioning' ? '<p style="color: #8892a0; font-size: 13px; margin-top: 12px;">⏳ Setting up your server... This page will auto-refresh.</p>' : ''}
                ${server.status === 'failed' ? '<p style="color: #ff4444; font-size: 13px; margin-top: 12px;">❌ Server provisioning failed. Please contact support.</p>' : ''}
                <p style="margin-top: 16px;"><strong>Plan:</strong> ${server.plan.charAt(0).toUpperCase() + server.plan.slice(1)}</p>
                <p><strong>Created:</strong> ${new Date(server.created_at).toLocaleDateString()}</p>
            </div>
            
            <div class="card">
                <h2>Server Specs</h2>
                <p><strong>RAM:</strong> ${specs.ram}</p>
                <p><strong>CPU:</strong> ${specs.cpu}</p>
                <p><strong>Storage:</strong> ${specs.storage}</p>
                <p><strong>Bandwidth:</strong> ${specs.bandwidth}</p>
            </div>
            
            <div class="card">
                <h2>Connection Details</h2>
                <p><strong>IP Address:</strong></p>
                <div class="copy-box">
                    <span>${server.ip_address}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${server.ip_address}')">Copy</button>
                </div>
            </div>
            
            <div class="card">
                <h2>Resource Usage</h2>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>CPU</span>
                        <span>${Math.floor(Math.random() * 30 + 15)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 30 + 15)}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>RAM</span>
                        <span>${Math.floor(Math.random() * 40 + 30)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 40 + 30)}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>Disk</span>
                        <span>${Math.floor(Math.random() * 20 + 10)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 20 + 10)}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 32px;">
            <h2>SSH Access</h2>
            <p style="margin-bottom: 16px;">Use these credentials to connect to your server via SSH:</p>
            
            <p><strong>Username:</strong></p>
            <div class="copy-box">
                <span>${server.ssh_username}</span>
                <button class="copy-btn" onclick="copyToClipboard('${server.ssh_username}')">Copy</button>
            </div>
            
            <p><strong>Password:</strong></p>
            <div class="copy-box">
                <span>${server.ssh_password}</span>
                <button class="copy-btn" onclick="copyToClipboard('${server.ssh_password}')">Copy</button>
            </div>
            
            <p><strong>Connection command:</strong></p>
            <div class="copy-box">
                <span>ssh ${server.ssh_username}@${server.ip_address}</span>
                <button class="copy-btn" onclick="copyToClipboard('ssh ${server.ssh_username}@${server.ip_address}')">Copy</button>
            </div>
        </div>
        
        <div class="card">
            <h2>Server Controls</h2>
            <p style="margin-bottom: 16px;">Manage your server</p>
            
            ${server.status === 'stopped' ? `
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="start">
                    <button type="submit" class="btn">Start Server</button>
                </form>
            ` : `
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="restart">
                    <button type="submit" class="btn">Restart Server</button>
                </form>
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="stop">
                    <button type="submit" class="btn">Stop Server</button>
                </form>
            `}
            
            <form action="/delete-server" method="POST" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255, 68, 68, 0.2);" onsubmit="return confirm('Are you sure? This will permanently destroy your server and all data on it.');">
                <p style="color: #ff4444; font-size: 13px; margin-bottom: 12px;">⚠️ Danger Zone</p>
                <button type="submit" class="btn" style="background: transparent; border-color: #ff4444; color: #ff4444;">Delete Server</button>
            </form>
        </div>
        
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Deployment</h2>
            <p style="margin-bottom: 16px; color: #8892a0;">Deploy your application from a Git repository</p>
            <form action="/deploy" method="POST">
                <label style="display: block; margin-bottom: 8px;">
                    <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Git Repository URL</span>
                    <input type="url" name="git_url" placeholder="https://github.com/username/repo.git" 
                        style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                        border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                </label>
                <button type="submit" class="btn" style="margin-top: 12px;">Deploy from Git</button>
            </form>
            
            ${deployments.length > 0 ? `
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(136, 254, 0, 0.1);">
                <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--glow); text-transform: uppercase; letter-spacing: 1px;">Recent Deployments</h3>
                ${deployments.map(dep => `
                <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 4px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <code style="font-size: 12px; color: #e0e6f0; word-break: break-all;">${dep.git_url}</code>
                        <span style="font-size: 10px; padding: 4px 12px; background: ${dep.status === 'success' ? 'rgba(136, 254, 0, 0.2)' : dep.status === 'failed' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 184, 0, 0.2)'}; color: ${dep.status === 'success' ? 'var(--glow)' : dep.status === 'failed' ? '#ff4444' : '#ffb800'}; border-radius: 4px; text-transform: uppercase; font-weight: 600; white-space: nowrap; margin-left: 12px;">${dep.status}</span>
                    </div>
                    <p style="font-size: 11px; color: #666; margin: 0;">${new Date(dep.deployed_at).toLocaleString()}</p>
                </div>
                `).join('')}
            </div>
            ` : '<p style="color: #666; font-size: 12px; margin-top: 16px; font-style: italic;">No deployments yet. Deploy your first app above!</p>'}
        </div>
        
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Custom Domains</h2>
            <p style="margin-bottom: 16px; color: #8892a0;">Connect a domain you own to your server</p>
            
            <form action="/add-domain" method="POST" style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px;">
                    <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Domain Name</span>
                    <input type="text" name="domain" placeholder="example.com" 
                        style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                        border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                </label>
                <button type="submit" class="btn" style="margin-top: 12px;">Add Domain</button>
            </form>
            
            <div style="background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: var(--glow); font-size: 16px; margin-bottom: 16px;">🔒 One-Click SSL</h3>
                <p style="color: #8892a0; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
                    Secure your domain with free HTTPS certificate from Let's Encrypt. Make sure your domain's DNS is pointing to your server IP before enabling SSL.
                </p>
                <form action="/enable-ssl" method="POST">
                    <label style="display: block; margin-bottom: 8px;">
                        <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Domain to Secure</span>
                        <input type="text" name="domain" placeholder="example.com" 
                            style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                    </label>
                    <button type="submit" class="btn" style="margin-top: 12px; background: rgba(136, 254, 0, 0.9); color: #000;">Enable SSL</button>
                </form>
            </div>
            
            <div style="background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; padding: 16px;">
                <h3 style="color: var(--glow); font-size: 14px; margin-bottom: 12px;">DNS Configuration</h3>
                <p style="color: #8892a0; font-size: 13px; line-height: 1.6; margin-bottom: 8px;">
                    To point your domain to this server, add these DNS records at your domain registrar (GoDaddy, Namecheap, etc.):
                </p>
                <div style="background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 12px;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: var(--glow);">A Record:</strong><br>
                        Name: <span style="color: #e0e6f0;">@</span> (or leave blank)<br>
                        Value: <span style="color: #e0e6f0;">${server.ip_address}</span><br>
                        TTL: <span style="color: #e0e6f0;">3600</span>
                    </div>
                    <div style="margin-top: 12px;">
                        <strong style="color: var(--glow);">A Record (www):</strong><br>
                        Name: <span style="color: #e0e6f0;">www</span><br>
                        Value: <span style="color: #e0e6f0;">${server.ip_address}</span><br>
                        TTL: <span style="color: #e0e6f0;">3600</span>
                    </div>
                </div>
                <p style="color: #666; font-size: 11px; margin-top: 12px;">
                    DNS changes can take 24-48 hours to propagate worldwide
                </p>
            </div>
            
            ${domains.length > 0 ? `
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(136, 254, 0, 0.1);">
                <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--glow); text-transform: uppercase; letter-spacing: 1px;">Your Domains</h3>
                ${domains.map(dom => `
                <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 4px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <code style="font-size: 14px; color: #e0e6f0; font-weight: 500;">${dom.domain}</code>
                        <p style="font-size: 11px; color: #666; margin: 6px 0 0 0;">Added ${new Date(dom.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${dom.ssl_enabled ? '<span style="font-size: 11px; padding: 6px 12px; background: rgba(136, 254, 0, 0.2); color: var(--glow); border-radius: 4px; font-weight: 600;">🔒 SSL Active</span>' : '<span style="font-size: 11px; padding: 6px 12px; background: rgba(255, 184, 0, 0.2); color: #ffb800; border-radius: 4px; font-weight: 600;">⚠️ No SSL</span>'}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<p style="color: #666; font-size: 12px; margin-top: 16px; font-style: italic;">No domains configured yet. Add your first domain above!</p>'}
        </div>
    </div>
    
    ${getFooter()}
    
    ${getScripts('nav.js', 'dashboard.js')}
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('An error occurred loading your dashboard');
  }
};

module.exports = { showDashboard: exports.showDashboard };

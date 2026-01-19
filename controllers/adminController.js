const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

// GET /admin - Simple scrollable admin dashboard
const listUsers = async (req, res) => {
  try {
    // Optimized: Single query with parallel fetching instead of 6 sequential queries
    const [usersResult, serversResult, domainsResult, deploymentsResult, paymentsResult, pendingRequestsResult] = await Promise.all([
      pool.query('SELECT id, email, role, email_confirmed, created_at FROM users ORDER BY created_at DESC'),
      pool.query('SELECT s.id, s.plan, s.status, s.ip_address, s.created_at, u.email as owner_email FROM servers s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC'),
      pool.query('SELECT id, domain, ssl_enabled, ssl_expires_at, created_at FROM domains ORDER BY created_at DESC'),
      pool.query('SELECT d.id, d.git_url, d.status, d.deployed_at, u.email as owner_email FROM deployments d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.deployed_at DESC LIMIT 50'),
      pool.query('SELECT p.id, p.amount, p.plan, p.status, p.created_at, u.email as customer_email FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 50'),
      pool.query('SELECT t.id, t.description, t.status, t.created_at, u.email as customer_email FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.subject = $1 AND t.status IN ($2, $3) ORDER BY t.created_at ASC', ['Server Setup Request', 'open', 'in-progress'])
    ]);
    
    const users = usersResult.rows;
    const servers = serversResult.rows;
    const domains = domainsResult.rows;
    const deployments = deploymentsResult.rows;
    const payments = paymentsResult.rows;
    const pendingRequests = pendingRequestsResult.rows;

    res.send(`
${getHTMLHead('Admin Dashboard')}
    <style>
      .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
      main.dashboard { flex: 1; padding: 120px 24px 60px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
      
      .admin-header { margin-bottom: 32px; }
      .admin-title { font-size: 36px; color: var(--glow); margin: 0 0 12px 0; font-weight: 700; }
      
      .section { margin-bottom: 48px; }
      .section-title { font-size: 24px; color: var(--glow); margin: 0 0 16px 0; font-weight: 600; }
      
      .table-card { background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 24px; overflow-x: auto; }
      
      table { width: 100%; border-collapse: collapse; min-width: 600px; }
      th { text-align: left; padding: 12px; color: #8892a0; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid rgba(136, 254, 0, 0.15); }
      td { padding: 12px; color: #e0e6f0; border-bottom: 1px solid rgba(136, 254, 0, 0.05); }
      tr:last-child td { border-bottom: none; }
      
      @media (max-width: 768px) {
        main.dashboard { padding: 80px 16px 40px 16px; }
        .admin-title { font-size: 28px; }
        .section-title { font-size: 20px; }
        .table-card { padding: 16px; }
        th, td { padding: 8px; font-size: 12px; }
      }
    </style>
</head>
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}

    <main class="dashboard">
      <div class="admin-header">
        <h1 class="admin-title">Admin Dashboard</h1>
      </div>

      <!-- Pending Server Requests (Priority) -->
      ${pendingRequests.length > 0 ? `
      <div class="section">
        <h2 class="section-title" style="color: #2DA7DF;">⚡ Pending Server Requests (${pendingRequests.length})</h2>
        <div class="table-card" style="border-color: #2DA7DF; background: rgba(45, 167, 223, 0.05);">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Details</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingRequests.map(r => {
                const details = r.description.split('\n').reduce((acc, line) => {
                  const [key, val] = line.split(': ');
                  acc[key] = val;
                  return acc;
                }, {});
                return `
                <tr>
                  <td><strong>${r.customer_email}</strong></td>
                  <td>
                    <div style="font-size: 12px; color: #a0a8b8;">
                      <div>Region: <strong style="color: #2DA7DF;">${details.Region || 'N/A'}</strong></div>
                      <div>Name: ${details['Server Name'] || 'Default'}</div>
                      <div>Use: ${details['Use Case'] || 'Not specified'}</div>
                    </div>
                  </td>
                  <td><span style="padding: 4px 12px; background: rgba(255, 165, 0, 0.2); color: #ffa500; border-radius: 12px; font-size: 11px; text-transform: uppercase;">${r.status}</span></td>
                  <td>${new Date(r.created_at).toLocaleDateString()} ${new Date(r.created_at).toLocaleTimeString()}</td>
                  <td><a href="https://cloud.digitalocean.com/droplets/new" target="_blank" style="color: #2DA7DF; text-decoration: underline; font-size: 12px;">Provision →</a></td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Users Section -->
      <div class="section">
        <h2 class="section-title">Users (${users.length})</h2>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Confirmed</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.email}</td>
                  <td>${u.role}</td>
                  <td>${u.email_confirmed ? 'Yes' : 'No'}</td>
                  <td>${new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <form method="POST" action="/admin/delete-user/${u.id}" style="display: inline;" onsubmit="return confirm('Delete user ${u.email}? This will also delete all their servers, deployments, and payments.');">
                      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                      <button type="submit" style="background: #ff4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">Delete</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Servers Section -->
      <div class="section">
        <h2 class="section-title">Servers (${servers.length})</h2>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${servers.map(s => `
                <tr>
                  <td>#${s.id}</td>
                  <td>${s.owner_email || '-'}</td>
                  <td>${s.plan}</td>
                  <td>${s.status}</td>
                  <td>${s.ip_address || '-'}</td>
                  <td>${new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <form method="POST" action="/admin/destroy-droplet/${s.id}" style="display: inline; margin-right: 4px;" onsubmit="return confirm('DESTROY droplet for server #${s.id}? This will permanently delete the DigitalOcean droplet AND the database record. This cannot be undone!');">
                      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                      <button type="submit" style="background: #cc0000; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">Destroy</button>
                    </form>
                    <form method="POST" action="/admin/delete-server/${s.id}" style="display: inline;" onsubmit="return confirm('Delete server record #${s.id}? This will remove it from the database but NOT destroy the actual droplet.');">
                      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                      <button type="submit" style="background: #ff4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">Delete DB</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Domains Section -->
      <div class="section">
        <h2 class="section-title">Domains (${domains.length})</h2>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>SSL Enabled</th>
                <th>SSL Expires</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${domains.map(d => `
                <tr>
                  <td>${d.domain}</td>
                  <td>${d.ssl_enabled ? 'Yes' : 'No'}</td>
                  <td>${d.ssl_expires_at ? new Date(d.ssl_expires_at).toLocaleDateString() : '-'}</td>
                  <td>${new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Deployments Section -->
      <div class="section">
        <h2 class="section-title">Recent Deployments (${deployments.length})</h2>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Owner</th>
                <th>Git URL</th>
                <th>Status</th>
                <th>Deployed</th>
              </tr>
            </thead>
            <tbody>
              ${deployments.map(d => `
                <tr>
                  <td>#${d.id}</td>
                  <td>${d.owner_email || '-'}</td>
                  <td>${d.git_url || '-'}</td>
                  <td>${d.status}</td>
                  <td>${d.deployed_at ? new Date(d.deployed_at).toLocaleDateString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payments Section -->
      <div class="section">
        <h2 class="section-title">Recent Payments (${payments.length})</h2>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>#${p.id}</td>
                  <td>${p.customer_email || '-'}</td>
                  <td>${p.plan}</td>
                  <td>$${(p.amount / 100).toFixed(2)}</td>
                  <td>${p.status}</td>
                  <td>${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </main>

    ${getFooter()}
    ${getScripts('nav.js')}
</body>
</html>
  `);
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).send('Failed to load admin page');
  }
};

// POST /admin/delete-user/:id - Delete a user account
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Delete user (cascade will handle related records if foreign keys are set up)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.redirect('/admin?success=User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    res.redirect('/admin?error=Failed to delete user');
  }
};

// POST /admin/delete-server/:id - Delete a server record
const deleteServer = async (req, res) => {
  try {
    const serverId = req.params.id;
    
    // Delete server record from database (does not destroy actual droplet)
    await pool.query('DELETE FROM servers WHERE id = $1', [serverId]);
    
    res.redirect('/admin?success=Server record deleted successfully');
  } catch (error) {
    console.error('Delete server error:', error);
    res.redirect('/admin?error=Failed to delete server');
  }
};

// POST /admin/destroy-droplet/:id - Destroy actual DigitalOcean droplet
const destroyDroplet = async (req, res) => {
  try {
    const serverId = req.params.id;
    const { destroyDroplet } = require('../services/digitalocean');
    
    await destroyDroplet(serverId);
    
    res.redirect('/admin?success=Droplet destroyed and server deleted successfully');
  } catch (error) {
    console.error('Destroy droplet error:', error);
    res.redirect('/admin?error=Failed to destroy droplet: ' + error.message);
  }
};

module.exports = { listUsers, deleteUser, deleteServer, destroyDroplet };

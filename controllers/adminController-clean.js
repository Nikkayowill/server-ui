const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

// GET /admin - Simple scrollable admin dashboard
const listUsers = async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT id, email, role, email_confirmed, created_at FROM users ORDER BY created_at DESC');
    const serversResult = await pool.query('SELECT s.id, s.plan, s.status, s.ip_address, s.created_at, u.email as owner_email FROM servers s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC');
    const domainsResult = await pool.query('SELECT id, domain, ssl_enabled, ssl_expires_at, created_at FROM domains ORDER BY created_at DESC');
    const deploymentsResult = await pool.query('SELECT d.id, d.git_url, d.status, d.deployed_at, u.email as owner_email FROM deployments d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.deployed_at DESC LIMIT 50');
    const paymentsResult = await pool.query('SELECT p.id, p.amount, p.plan, p.status, p.created_at, u.email as customer_email FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 50');
    
    const users = usersResult.rows;
    const servers = serversResult.rows;
    const domains = domainsResult.rows;
    const deployments = deploymentsResult.rows;
    const payments = paymentsResult.rows;

    res.send(`
${getHTMLHead('Admin Dashboard')}
    <link rel="stylesheet" href="/css/dashboard.css">
    <style>
      .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
      main.dashboard { flex: 1; padding: 120px 24px 60px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
      
      .admin-header { margin-bottom: 32px; }
      .admin-title { font-size: 36px; color: var(--glow); margin: 0 0 12px 0; font-weight: 700; }
      
      .section { margin-bottom: 48px; }
      .section-title { font-size: 24px; color: var(--glow); margin: 0 0 16px 0; font-weight: 600; }
      
      .table-card { background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 24px; }
      
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 12px; color: #8892a0; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid rgba(136, 254, 0, 0.15); }
      td { padding: 12px; color: #e0e6f0; border-bottom: 1px solid rgba(136, 254, 0, 0.05); }
      tr:last-child td { border-bottom: none; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}

    <main class="dashboard">
      <div class="admin-header">
        <h1 class="admin-title">Admin Dashboard</h1>
      </div>

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
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.email}</td>
                  <td>${u.role}</td>
                  <td>${u.email_confirmed ? 'Yes' : 'No'}</td>
                  <td>${new Date(u.created_at).toLocaleDateString()}</td>
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

module.exports = { listUsers };

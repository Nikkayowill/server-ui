const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

// GET /admin/users - Minimal admin dashboard
const listUsers = async (req, res) => {
  try {
    // Fetch basic data
    const usersResult = await pool.query('SELECT id, email, role, email_confirmed, created_at FROM users ORDER BY created_at DESC');
    const serversResult = await pool.query('SELECT s.id, s.plan, s.status, s.ip_address, s.created_at, u.email as owner_email FROM servers s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC');
    const domainsResult = await pool.query('SELECT id, domain, ssl_enabled, ssl_expires_at, created_at FROM domains ORDER BY created_at DESC');
    
    const users = usersResult.rows;
    const servers = serversResult.rows;
    const domains = domainsResult.rows;

    res.send(`
${getHTMLHead('Admin Dashboard')}
    <link rel="stylesheet" href="/css/dashboard.css">
    <style>
      .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
      main.dashboard { flex: 1; padding: 120px 24px 60px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
      
      .admin-header { margin-bottom: 32px; }
      .admin-title { font-size: 36px; color: var(--glow); margin: 0 0 12px 0; font-weight: 700; }
      
      .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid rgba(136, 254, 0, 0.15); }
      .tab { padding: 12px 24px; background: none; border: none; color: #8892a0; cursor: pointer; border-bottom: 2px solid transparent; }
      .tab.active { color: var(--glow); border-bottom-color: var(--glow); }
      
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      
      .table-card { background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 24px; }
      
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 12px; color: #8892a0; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid rgba(136, 254, 0, 0.15); }
      td { padding: 12px; color: #e0e6f0; border-bottom: 1px solid rgba(136, 254, 0, 0.05); }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}

    <main class="dashboard">
      <div class="admin-header">
        <h1 class="admin-title">Admin Dashboard</h1>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="switchTab('users')">Users</button>
        <button class="tab" onclick="switchTab('servers')">Servers</button>
        <button class="tab" onclick="switchTab('domains')">Domains</button>
      </div>

      <div id="users-tab" class="tab-content active">
        <div class="table-card">
          <h2>Users (${users.length})</h2>
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

      <div id="servers-tab" class="tab-content">
        <div class="table-card">
          <h2>Servers (${servers.length})</h2>
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

      <div id="domains-tab" class="tab-content">
        <div class="table-card">
          <h2>Domains (${domains.length})</h2>
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
    </main>

    ${getFooter()}
    
    <script>
      function switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        const clickedTab = Array.from(document.querySelectorAll('.tab')).find(
          tab => tab.textContent.toLowerCase().includes(tabName)
        );
        if (clickedTab) clickedTab.classList.add('active');
        
        const targetContent = document.getElementById(tabName + '-tab');
        if (targetContent) targetContent.classList.add('active');
      }
    </script>
    ${getScripts('nav.js')}
  `);
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).send('Failed to load admin page');
  }
};

module.exports = { listUsers };

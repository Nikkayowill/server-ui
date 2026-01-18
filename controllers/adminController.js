const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');
const { logAdminAction, getAuditLog } = require('../services/auditLog');

// GET /admin/users - Admin dashboard with Users, Domains, and Servers tabs
const listUsers = async (req, res) => {
  try {
    const usersResult = await pool.query(
      'SELECT id, email, role, email_confirmed, created_at FROM users ORDER BY created_at DESC'
    );
    const domainsResult = await pool.query(
      'SELECT id, name, status, provider, renewal_date, notes, created_at FROM domains ORDER BY created_at DESC'
    );
    const serversResult = await pool.query(
      'SELECT s.id, s.plan, s.status, s.ip_address, s.domain, s.ssl_status, s.created_at, u.email as owner_email FROM servers s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC'
    );
    const deploymentsResult = await pool.query(
      'SELECT d.id, d.git_url, d.status, d.output, d.deployed_at, s.id as server_id, s.plan, u.email as owner_email FROM deployments d LEFT JOIN servers s ON d.server_id = s.id LEFT JOIN users u ON d.user_id = u.id ORDER BY d.deployed_at DESC'
    );
    const paymentsResult = await pool.query(
      'SELECT p.id, p.amount, p.plan, p.status, p.created_at, u.email as customer_email FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
    );
    
    // Analytics: Revenue by plan
    const revenueByPlanResult = await pool.query(
      "SELECT plan, COUNT(*) as count, SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total FROM payments GROUP BY plan"
    );
    
    // Analytics: Recent revenue (last 7 days)
    const recentRevenueResult = await pool.query(
      "SELECT DATE(created_at) as date, SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as revenue FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date DESC"
    );
    
    // Analytics: Customer growth
    const customerGrowthResult = await pool.query(
      "SELECT DATE(created_at) as date, COUNT(*) as new_users FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC"
    );

    // Support Tickets
    const ticketsResult = await pool.query(
      'SELECT t.id, t.subject, t.priority, t.status, t.created_at, u.email as customer_email FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC'
    );

    const users = usersResult.rows;
    const domains = domainsResult.rows;
    const servers = serversResult.rows;
    const deployments = deploymentsResult.rows;
    const payments = paymentsResult.rows;
    const revenueByPlan = revenueByPlanResult.rows;
    const recentRevenue = recentRevenueResult.rows;
    const customerGrowth = customerGrowthResult.rows;
    const tickets = ticketsResult.rows;
    
    const totalUsers = users.length;
    const confirmedUsers = users.filter(u => u.email_confirmed).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    
    const totalDomains = domains.length;
    const activeDomains = domains.filter(d => d.status === 'active').length;
    const hostingerDomains = domains.filter(d => d.provider === 'hostinger').length;
    
    const totalServers = servers.length;
    const runningServers = servers.filter(s => s.status === 'running').length;
    const provisioningServers = servers.filter(s => s.status === 'provisioning').length;
    
    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter(d => d.status === 'success').length;
    const failedDeployments = deployments.filter(d => d.status === 'failed').length;
    
    const totalPayments = payments.length;
    const succeededPayments = payments.filter(p => p.status === 'succeeded').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const totalRevenue = payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;
    
    const isSuperAdmin = req.session.userEmail === 'nikkayowillpbiz@gmail.com';

    res.send(`
${getHTMLHead('Admin Dashboard')}
    <link rel="stylesheet" href="/css/dashboard.css">
    <style>
      * { --glow: #88FE00; --bg-dark: #0a0812; --bg-card: rgba(2, 8, 20, 0.8); --border-light: rgba(136, 254, 0, 0.15); }
      
      .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
      main.dashboard { flex: 1; padding: 120px 24px 60px 24px; max-width: 1600px; margin: 0 auto; width: 100%; }
      
      @media (max-width: 768px) {
        main.dashboard { padding: 100px 16px 40px 16px; }
      }
      
      @media (max-width: 480px) {
        main.dashboard { padding: 90px 12px 30px 12px; }
      }
      
      .admin-header { margin-bottom: 32px; }
      .admin-title { font-size: 36px; color: var(--glow); margin: 0 0 12px 0; font-weight: 700; letter-spacing: -0.5px; }
      .admin-subtitle { color: #8892a0; font-size: 15px; margin: 0; }
      
      .tabs { display: flex; gap: 0; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); }
      .tab { padding: 14px 24px; color: #8892a0; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: .2s; text-transform: uppercase; letter-spacing: 0.5px; }
      .tab:hover { color: var(--glow); }
      .tab.active { color: var(--glow); border-bottom-color: var(--glow); }
      
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      
      .tab-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
      .btn-add { padding: 10px 20px; background: var(--glow); color: #0a0812; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; }
      .btn-add:hover { box-shadow: 0 0 20px rgba(136, 254, 0, 0.5); }
      
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
      .stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 6px; padding: 24px; }
      .stat-value { font-size: 32px; font-weight: 700; color: var(--glow); margin-bottom: 6px; }
      .stat-label { color: #8892a0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
      
      .table-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 6px; overflow: hidden; }
      .table-header { background: rgba(136, 254, 0, 0.05); border-bottom: 1px solid var(--border-light); padding: 24px; }
      .table-header-title { font-size: 18px; color: #e0e6f0; margin: 0; font-weight: 600; }
      
      .table-content { overflow-x: auto; }
      .admin-table { width: 100%; border-collapse: collapse; }
      .admin-table th { background: rgba(0, 0, 0, 0.3); padding: 14px 18px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8892a0; border-bottom: 1px solid var(--border-light); }
      .admin-table td { padding: 16px 18px; border-bottom: 1px solid rgba(136, 254, 0, 0.05); color: #c8d2e0; font-size: 13px; }
      .admin-table tbody tr:hover { background: rgba(136, 254, 0, 0.03); }
      
      .user-email, .domain-name { color: #e0e6f0; font-weight: 500; }
      
      .badge { display: inline-block; padding: 5px 11px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge.admin { background: rgba(136, 254, 0, 0.15); color: var(--glow); }
      .badge.user { background: rgba(123, 180, 255, 0.15); color: #7bb4ff; }
      .badge.confirmed { background: rgba(123, 255, 123, 0.15); color: #7BFF7B; }
      .badge.pending { background: rgba(255, 196, 107, 0.15); color: #ffc46b; }
      .badge.active { background: rgba(123, 255, 123, 0.15); color: #7BFF7B; }
      .badge.expired { background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }
      .badge.hostinger { background: rgba(136, 254, 0, 0.15); color: var(--glow); }
      
      .action-cell { display: flex; gap: 10px; align-items: center; }
      .action-btn { padding: 7px 12px; font-size: 11px; border: 1px solid rgba(136, 254, 0, 0.25); background: transparent; color: var(--glow); border-radius: 3px; cursor: pointer; transition: .2s; font-weight: 500; white-space: nowrap; }
      .action-btn:hover { background: rgba(136, 254, 0, 0.1); border-color: var(--glow); }
      .action-btn.danger { color: #ff6b6b; border-color: rgba(255, 107, 107, 0.25); }
      .action-btn.danger:hover { background: rgba(255, 107, 107, 0.1); border-color: #ff6b6b; }
      
      .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 20px; }
      .modal.active { display: flex; }
      .modal-content { background: rgba(2, 8, 20, 0.98); border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 8px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; }
      .modal-title { font-size: 20px; color: var(--glow); margin: 0 0 14px 0; font-weight: 600; }
      .modal-warning { color: #8892a0; font-size: 14px; margin: 14px 0 24px 0; line-height: 1.7; }
      .form-group { margin-bottom: 18px; }
      .form-group label { display: block; color: #8892a0; font-size: 12px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.2); color: #e0e6f0; border-radius: 4px; font-family: inherit; font-size: 13px; }
      .form-group textarea { resize: vertical; min-height: 80px; }
      .modal-actions { display: flex; gap: 12px; }
      .modal-btn { flex: 1; padding: 11px; border: 1px solid rgba(136, 254, 0, 0.2); background: transparent; color: var(--glow); border-radius: 4px; cursor: pointer; font-weight: 500; transition: .2s; font-size: 13px; }
      .modal-btn.confirm { background: var(--glow); color: #0a0812; border-color: var(--glow); }
      .modal-btn:hover { background: rgba(136, 254, 0, 0.1); }
      .modal-btn.confirm:hover { box-shadow: 0 0 25px rgba(136, 254, 0, 0.5); }
      
      .no-data { text-align: center; padding: 80px 20px; color: #8892a0; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="admin-wrapper">
      ${getResponsiveNav(req)}

      <main class="dashboard">
        <div class="admin-header">
          <h1 class="admin-title">Admin Dashboard</h1>
          <p class="admin-subtitle">Manage users, domains, and system settings</p>
        </div>

        <div class="tabs">
          <div class="tab active" onclick="switchTab('users')">Users</div>
          <div class="tab" onclick="switchTab('domains')">Domains</div>
          <div class="tab" onclick="switchTab('servers')">Servers</div>
          <div class="tab" onclick="switchTab('deployments')">Deployments</div>
          <div class="tab" onclick="switchTab('billing')">Billing</div>
          <div class="tab" onclick="switchTab('tickets')">Support Tickets</div>
          <div class="tab" onclick="switchTab('analytics')">Analytics</div>
          <div class="tab" onclick="switchTab('audit')">Audit Log</div>
        </div>

        <!-- USERS TAB -->
        <div id="users-tab" class="tab-content active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${totalUsers}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${confirmedUsers}</div>
              <div class="stat-label">Confirmed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${adminUsers}</div>
              <div class="stat-label">Admins</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${totalUsers - confirmedUsers}</div>
              <div class="stat-label">Pending Confirmation</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">All Users</h2>
            </div>
            <div class="table-content">
              ${users.length > 0 ? `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => `
                    <tr>
                      <td class="user-email">${user.email}</td>
                      <td><span class="badge ${user.role === 'admin' ? 'admin' : 'user'}">${user.role || 'user'}</span></td>
                      <td><span class="badge ${user.email_confirmed ? 'confirmed' : 'pending'}">${user.email_confirmed ? 'Confirmed' : 'Pending'}</span></td>
                      <td>${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td class="action-cell">
                        ${isSuperAdmin && user.role !== 'admin' ? `<button class="action-btn" onclick="openModal('promote', '${user.email}')">Promote</button>` : ''}
                        ${isSuperAdmin && user.role === 'admin' && user.email !== req.session.userEmail ? `<button class="action-btn danger" onclick="openModal('demote', '${user.email}')">Demote</button>` : ''}
                        ${!isSuperAdmin ? '<span style="color: #8892a0; font-size: 11px;">View only</span>' : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : `
              <div class="no-data">
                <p>No users yet</p>
              </div>
              `}
            </div>
          </div>
        </div>

        <!-- DOMAINS TAB -->
        <div id="domains-tab" class="tab-content">
          <div class="tab-header">
            <div></div>
            <button class="btn-add" onclick="openAddDomainModal()">+ Add Domain</button>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${totalDomains}</div>
              <div class="stat-label">Total Domains</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${activeDomains}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${hostingerDomains}</div>
              <div class="stat-label">From Hostinger</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">All Domains</h2>
            </div>
            <div class="table-content">
              ${domains.length > 0 ? `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Renewal Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${domains.map(domain => `
                    <tr>
                      <td class="domain-name">${domain.name}</td>
                      <td><span class="badge ${domain.status === 'active' ? 'active' : domain.status === 'pending' ? 'pending' : 'expired'}">${domain.status || 'active'}</span></td>
                      <td><span class="badge hostinger">${domain.provider || 'hostinger'}</span></td>
                      <td>${domain.renewal_date ? new Date(domain.renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                      <td class="action-cell">
                        <button class="action-btn" onclick="openEditDomainModal(${domain.id}, '${domain.name}', '${domain.status}', '${domain.provider}', '${domain.renewal_date || ''}', '${(domain.notes || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="action-btn danger" onclick="openDeleteDomainModal(${domain.id}, '${domain.name}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : `
              <div class="no-data">
                <p>No domains yet. Add your first domain to get started.</p>
              </div>
              `}
            </div>
          </div>
        </div>

        <!-- SERVERS TAB -->
        <div id="servers-tab" class="tab-content">
          <div class="tab-header">
            <div></div>
            <button class="btn-add" onclick="openAddServerModal()">+ Add Server</button>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${totalServers}</div>
              <div class="stat-label">Total Servers</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${runningServers}</div>
              <div class="stat-label">Running</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${provisioningServers}</div>
              <div class="stat-label">Provisioning</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">All Servers</h2>
            </div>
            <div class="table-content">
              ${servers.length > 0 ? `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Domain</th>
                    <th>SSL</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${servers.map(server => `
                    <tr>
                      <td class="domain-name">#${server.id}</td>
                      <td>${server.owner_email || 'N/A'}</td>
                      <td><span class="badge ${server.plan === 'premium' ? 'admin' : server.plan === 'priority' ? 'hostinger' : 'user'}">${server.plan}</span></td>
                      <td><span class="badge ${server.status === 'running' ? 'active' : server.status === 'provisioning' ? 'pending' : 'expired'}">${server.status}</span></td>
                      <td>${server.ip_address || 'Pending'}</td>
                      <td>${server.domain || '<span style="color: #8892a0;">Not set</span>'}</td>
                      <td><span class="badge ${server.ssl_status === 'active' ? 'active' : server.ssl_status === 'pending' ? 'pending' : server.ssl_status === 'failed' ? 'expired' : 'expired'}">${server.ssl_status}</span></td>
                      <td>${new Date(server.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td class="action-cell">
                        <button class="action-btn" onclick="openEditServerModal(${server.id}, '${server.owner_email}', '${server.plan}', '${server.status}', '${server.ip_address || ''}', '${server.domain || ''}')">Edit</button>
                        <button class="action-btn" onclick="openAssignDomainModal(${server.id}, '${server.domain || ''}')">Domain</button>
                        <button class="action-btn warning" onclick="openServerActionModal('restart', ${server.id}, '${server.owner_email}')">Restart</button>
                        <button class="action-btn danger" onclick="openDeleteServerModal(${server.id}, '${server.owner_email}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : `
              <div class="no-data">
                <p>No servers yet. Add your first server to get started.</p>
              </div>
              `}
            </div>
          </div>
        </div>

        <!-- SUPPORT TICKETS TAB -->
        <div id="tickets-tab" class="tab-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalTickets}</div>
              <div class="stat-label">Total Tickets</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${openTickets}</div>
              <div class="stat-label">Open</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${inProgressTickets}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">Support Tickets</h2>
            </div>
            <div class="table-content">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${tickets.length === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #8892a0;">No support tickets</td></tr>' : 
                    tickets.map(t => `
                      <tr>
                        <td>#${t.id}</td>
                        <td>${t.customer_email || 'Unknown'}</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${t.subject}">${t.subject}</td>
                        <td>
                          <span class="status-badge ${
                            t.priority === 'urgent' ? 'expired' :
                            t.priority === 'high' ? 'pending' : 'active'
                          }">${t.priority}</span>
                        </td>
                        <td>
                          <span class="status-badge ${
                            t.status === 'resolved' ? 'active' :
                            t.status === 'in-progress' ? 'pending' :
                            t.status === 'closed' ? 'expired' : 'pending'
                          }">${t.status}</span>
                        </td>
                        <td>${new Date(t.created_at).toLocaleString()}</td>
                        <td>
                          <button class="action-btn" onclick="viewTicketDetail(${t.id})">View</button>
                        </td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ANALYTICS TAB -->
        <div id="analytics-tab" class="tab-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalUsers}</div>
              <div class="stat-label">Total Customers</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totalServers}</div>
              <div class="stat-label">Active Servers</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totalDeployments}</div>
              <div class="stat-label">Total Deployments</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">$${totalRevenue.toFixed(2)}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-top: 24px;">
            <!-- Revenue by Plan -->
            <div class="table-card">
              <div class="table-header">
                <h3 class="table-header-title">Revenue by Plan</h3>
              </div>
              <div style="padding: 16px;">
                ${revenueByPlan.length === 0 ? '<p style="color: #8892a0; text-align: center;">No data available</p>' : 
                  revenueByPlan.map(r => `
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                      <span style="color: var(--text-secondary);">${r.plan || 'Unknown'}</span>
                      <div style="text-align: right;">
                        <div style="color: var(--glow); font-weight: 600;">$${parseFloat(r.total || 0).toFixed(2)}</div>
                        <div style="color: #8892a0; font-size: 12px;">${r.count} transactions</div>
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            </div>

            <!-- Recent Revenue (Last 7 Days) -->
            <div class="table-card">
              <div class="table-header">
                <h3 class="table-header-title">Last 7 Days Revenue</h3>
              </div>
              <div style="padding: 16px;">
                ${recentRevenue.length === 0 ? '<p style="color: #8892a0; text-align: center;">No data available</p>' : 
                  recentRevenue.map(r => `
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                      <span style="color: var(--text-secondary);">${new Date(r.date).toLocaleDateString()}</span>
                      <span style="color: var(--glow); font-weight: 600;">$${parseFloat(r.revenue || 0).toFixed(2)}</span>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          </div>

          <!-- Server Distribution by Plan -->
          <div class="table-card" style="margin-top: 24px;">
            <div class="table-header">
              <h3 class="table-header-title">Server Distribution by Plan</h3>
            </div>
            <div style="padding: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                ${['basic', 'priority', 'premium'].map(plan => {
                  const count = servers.filter(s => s.plan === plan).length;
                  const pct = totalServers > 0 ? ((count / totalServers) * 100).toFixed(1) : 0;
                  return `
                    <div style="background: rgba(136, 254, 0, 0.05); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; text-align: center;">
                      <div style="color: var(--glow); font-size: 24px; font-weight: 600; margin-bottom: 8px;">${count}</div>
                      <div style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">${plan}</div>
                      <div style="color: #8892a0; font-size: 11px;">${pct}%</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- New Customers (Last 30 Days) -->
          <div class="table-card" style="margin-top: 24px;">
            <div class="table-header">
              <h3 class="table-header-title">New Customers (Last 30 Days)</h3>
            </div>
            <div style="padding: 16px;">
              ${customerGrowth.length === 0 ? '<p style="color: #8892a0; text-align: center;">No new customers this month</p>' : 
                customerGrowth.map(g => `
                  <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                    <span style="color: var(--text-secondary);">${new Date(g.date).toLocaleDateString()}</span>
                    <span style="color: var(--glow); font-weight: 600;">+${g.new_users}</span>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>

        <!-- BILLING TAB -->
        <div id="billing-tab" class="tab-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">$${totalRevenue.toFixed(2)}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${succeededPayments}</div>
              <div class="stat-label">Successful Payments</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${failedPayments}</div>
              <div class="stat-label">Failed Payments</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totalPayments}</div>
              <div class="stat-label">Total Transactions</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">Payment History</h2>
            </div>
            <div class="table-content">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #8892a0;">No payments found</td></tr>' : 
                    payments.map(p => `
                      <tr>
                        <td>#${p.id}</td>
                        <td>${p.customer_email || 'Unknown'}</td>
                        <td>$${parseFloat(p.amount).toFixed(2)}</td>
                        <td>${p.plan || 'N/A'}</td>
                        <td>
                          <span class="status-badge ${
                            p.status === 'succeeded' ? 'active' : 
                            p.status === 'failed' ? 'expired' :
                            p.status === 'refunded' ? 'expired' : 'pending'
                          }">${p.status}</span>
                        </td>
                        <td>${new Date(p.created_at).toLocaleString()}</td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- DEPLOYMENTS TAB -->
        <div id="deployments-tab" class="tab-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalDeployments}</div>
              <div class="stat-label">Total Deployments</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${successfulDeployments}</div>
              <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${failedDeployments}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">Deployments</h2>
            </div>
            <div class="table-content">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Owner</th>
                    <th>Server</th>
                    <th>Git URL</th>
                    <th>Status</th>
                    <th>Deployed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${deployments.length === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #8892a0;">No deployments found</td></tr>' : 
                    deployments.map(d => `
                      <tr>
                        <td>#${d.id}</td>
                        <td>${d.owner_email || 'Unknown'}</td>
                        <td>Server #${d.server_id} (${d.plan})</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${d.git_url}">${d.git_url}</td>
                        <td>
                          <span class="status-badge ${
                            d.status === 'success' ? 'active' : 
                            d.status === 'failed' ? 'expired' :
                            d.status === 'deploying' ? 'pending' : 'pending'
                          }">${d.status}</span>
                        </td>
                        <td>${new Date(d.deployed_at).toLocaleString()}</td>
                        <td>
                          <button class="action-btn" onclick="viewDeploymentOutput(${d.id}, '${d.status}')">View Output</button>
                        </td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- AUDIT LOG TAB -->
        <div id="audit-tab" class="tab-content">
          <div class="table-card">
            <div class="table-header">
              <h2 class="table-header-title">Recent Actions</h2>
            </div>
            <div class="table-content">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody id="auditLogBody">
                  <tr><td colspan="4" style="text-align: center; padding: 40px;">Loading audit log...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- User Modals -->
    <div id="promoteModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Promote to Admin?</h3>
        <p class="modal-warning">
          <strong id="promoteEmail"></strong> will have full admin access. Are you sure?
        </p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('promoteModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executePromote()">Confirm</button>
        </div>
      </div>
    </div>

    <div id="demoteModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title" style="color: #ff6b6b;">Demote from Admin?</h3>
        <p class="modal-warning">
          <strong id="demoteEmail"></strong> will lose admin access and become a regular user.
        </p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('demoteModal')">Cancel</button>
          <button class="modal-btn confirm" style="background: #ff6b6b; color: #fff;" onclick="executeDemote()">Demote</button>
        </div>
      </div>
    </div>

    <!-- Domain Modals -->
    <div id="addDomainModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Add Domain</h3>
        <div class="form-group">
          <label>Domain Name</label>
          <input type="text" id="addDomainName" placeholder="example.com" required>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="addDomainStatus">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div class="form-group">
          <label>Provider</label>
          <select id="addDomainProvider">
            <option value="hostinger">Hostinger</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Renewal Date (Optional)</label>
          <input type="date" id="addDomainRenewalDate">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="addDomainNotes" placeholder="Add notes about this domain..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('addDomainModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executeAddDomain()">Add Domain</button>
        </div>
      </div>
    </div>

    <div id="editDomainModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Edit Domain</h3>
        <div class="form-group">
          <label>Domain Name</label>
          <input type="text" id="editDomainName" disabled>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="editDomainStatus">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div class="form-group">
          <label>Provider</label>
          <select id="editDomainProvider">
            <option value="hostinger">Hostinger</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Renewal Date (Optional)</label>
          <input type="date" id="editDomainRenewalDate">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="editDomainNotes" placeholder="Add notes about this domain..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('editDomainModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executeEditDomain()">Save Changes</button>
        </div>
      </div>
    </div>

    <div id="deleteDomainModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title" style="color: #ff6b6b;">Delete Domain?</h3>
        <p style="color: #8892a0; margin: 14px 0 24px 0; line-height: 1.7;">
          Are you sure you want to delete <strong id="deleteDomainName"></strong>? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('deleteDomainModal')">Cancel</button>
          <button class="modal-btn confirm" style="background: #ff6b6b; color: #fff;" onclick="executeDeleteDomain()">Delete</button>
        </div>
      </div>
    </div>

    <!-- Server Modals -->
    <div id="addServerModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Add Server</h3>
        <div class="form-group">
          <label>Customer Email</label>
          <select id="addServerUserId">
            ${users.map(u => `<option value="${u.id}">${u.email}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Plan</label>
          <select id="addServerPlan">
            <option value="basic">Basic</option>
            <option value="priority">Priority</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="addServerStatus">
            <option value="provisioning">Provisioning</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="form-group">
          <label>IP Address (Optional)</label>
          <input type="text" id="addServerIP" placeholder="e.g., 192.168.1.1">
        </div>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('addServerModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executeAddServer()">Add Server</button>
        </div>
      </div>
    </div>

    <div id="editServerModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Edit Server</h3>
        <div class="form-group">
          <label>Owner Email</label>
          <input type="text" id="editServerOwner" disabled>
        </div>
        <div class="form-group">
          <label>Plan</label>
          <select id="editServerPlan">
            <option value="basic">Basic</option>
            <option value="priority">Priority</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="editServerStatus">
            <option value="provisioning">Provisioning</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="form-group">
          <label>IP Address</label>
          <input type="text" id="editServerIP" placeholder="e.g., 192.168.1.1">
        </div>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('editServerModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executeEditServer()">Save Changes</button>
        </div>
      </div>
    </div>

    <div id="deleteServerModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title" style="color: #ff6b6b;">Delete Server?</h3>
        <p style="color: #8892a0; margin: 14px 0 24px 0; line-height: 1.7;">
          Are you sure you want to delete the server owned by <strong id="deleteServerOwner"></strong>? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('deleteServerModal')">Cancel</button>
          <button class="modal-btn confirm" style="background: #ff6b6b; color: #fff;" onclick="executeDeleteServer()">Delete</button>
        </div>
      </div>
    </div>

    <!-- Deployment Output Modal -->
    <div id="deploymentOutputModal" class="modal">
      <div class="modal-content" style="max-width: 900px;">
        <h3 class="modal-title">Deployment Output</h3>
        <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; margin: 16px 0; max-height: 500px; overflow-y: auto;">
          <pre id="deploymentOutputContent" style="color: #e0e6f0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; margin: 0;"></pre>
        </div>
        <div class="modal-actions">
          <button class="modal-btn confirm" onclick="closeModal('deploymentOutputModal')">Close</button>
        </div>
      </div>
    </div>

    <!-- Assign Domain to Server Modal -->
    <div id="assignDomainModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Assign Domain to Server</h3>
        <div style="margin: 16px 0;">
          <label style="color: var(--glow); font-size: 12px;">Domain Name</label>
          <input type="text" id="assignDomainInput" placeholder="example.com" style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(136, 254, 0, 0.05); border: 1px solid var(--border-light); color: #e0e6f0; border-radius: 6px; font-family: monospace;">
          <p style="color: #8892a0; font-size: 11px; margin-top: 12px; line-height: 1.6;">
            After assigning, SSL certificate will be automatically generated. Make sure your domain's A record points to this server's IP address.
          </p>
        </div>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('assignDomainModal')">Cancel</button>
          <button class="modal-btn confirm" onclick="executeAssignDomain()">Assign & Activate SSL</button>
        </div>
      </div>
    </div>

    <!-- Server Action Modal (Restart/Stop/Reboot) -->
    <div id="serverActionModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title" id="serverActionTitle">Confirm Server Action</h3>
        <p id="serverActionMessage" style="color: #8892a0; margin: 16px 0; line-height: 1.6;"></p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('serverActionModal')">Cancel</button>
          <button class="modal-btn confirm" id="serverActionConfirmBtn" style="background: #ff8c00;" onclick="executeServerAction()">Continue</button>
        </div>
      </div>
    </div>

    <!-- Ticket Detail Modal -->
    <div id="ticketDetailModal" class="modal">
      <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
        <h3 class="modal-title" id="ticketSubject"></h3>
        <div style="margin: 16px 0; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
          <span class="status-badge" id="ticketPriorityBadge"></span>
          <span class="status-badge" id="ticketStatusBadge" style="margin-left: 8px;"></span>
          <span style="color: #8892a0; font-size: 12px; margin-left: 16px;" id="ticketMeta"></span>
        </div>
        <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 6px; margin: 16px 0; min-height: 100px;">
          <p id="ticketDescription" style="color: #e0e6f0; line-height: 1.6; white-space: pre-wrap;"></p>
        </div>
        <div id="ticketReplies" style="margin: 16px 0;">
          <!-- Replies will be inserted here -->
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light);">
          <label style="color: var(--glow); font-size: 12px;">Reply</label>
          <textarea id="ticketReplyText" placeholder="Type your reply..." style="width: 100%; height: 100px; padding: 12px; margin-top: 8px; background: rgba(136, 254, 0, 0.05); border: 1px solid var(--border-light); color: #e0e6f0; border-radius: 6px; font-family: monospace; resize: vertical;"></textarea>
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="modal-btn confirm" onclick="submitTicketReply()">Send Reply</button>
            <select id="ticketStatusSelect" style="padding: 8px; background: rgba(136, 254, 0, 0.05); border: 1px solid var(--border-light); color: #e0e6f0; border-radius: 6px;">
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button class="modal-btn" onclick="updateTicketStatus()">Update Status</button>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 16px;">
          <button class="modal-btn confirm" onclick="closeModal('ticketDetailModal')">Close</button>
        </div>
      </div>
    </div>

    ${getFooter()}
    
    <script>
      let currentUserAction = null;
      let currentUserEmail = null;
      let currentDomainId = null;

      function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');
        
        if (tabName === 'audit') {
          loadAuditLog();
        }
      }

      // User Management
      function openModal(action, email) {
        currentUserAction = action;
        currentUserEmail = email;
        if (action === 'promote') {
          document.getElementById('promoteEmail').textContent = email;
          document.getElementById('promoteModal').classList.add('active');
        } else if (action === 'demote') {
          document.getElementById('demoteEmail').textContent = email;
          document.getElementById('demoteModal').classList.add('active');
        }
      }

      function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        currentUserAction = null;
        currentUserEmail = null;
        currentDomainId = null;
      }

      async function executePromote() {
        const res = await fetch('/admin/promote-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUserEmail })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
        closeModal('promoteModal');
      }

      async function executeDemote() {
        const res = await fetch('/admin/demote-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUserEmail })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
        closeModal('demoteModal');
      }

      // Domain Management
      function openAddDomainModal() {
        document.getElementById('addDomainModal').classList.add('active');
      }

      function openEditDomainModal(id, name, status, provider, renewal_date, notes) {
        currentDomainId = id;
        document.getElementById('editDomainName').value = name;
        document.getElementById('editDomainStatus').value = status;
        document.getElementById('editDomainProvider').value = provider;
        document.getElementById('editDomainRenewalDate').value = renewal_date;
        document.getElementById('editDomainNotes').value = notes;
        document.getElementById('editDomainModal').classList.add('active');
      }

      function openDeleteDomainModal(id, name) {
        currentDomainId = id;
        document.getElementById('deleteDomainName').textContent = name;
        document.getElementById('deleteDomainModal').classList.add('active');
      }

      async function executeAddDomain() {
        const name = document.getElementById('addDomainName').value;
        const status = document.getElementById('addDomainStatus').value;
        const provider = document.getElementById('addDomainProvider').value;
        const renewal_date = document.getElementById('addDomainRenewalDate').value || null;
        const notes = document.getElementById('addDomainNotes').value;

        const res = await fetch('/admin/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, status, provider, renewal_date, notes })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      async function executeEditDomain() {
        const status = document.getElementById('editDomainStatus').value;
        const provider = document.getElementById('editDomainProvider').value;
        const renewal_date = document.getElementById('editDomainRenewalDate').value || null;
        const notes = document.getElementById('editDomainNotes').value;

        const res = await fetch('/admin/domains/' + currentDomainId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, provider, renewal_date, notes })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      async function executeDeleteDomain() {
        const res = await fetch('/admin/domains/' + currentDomainId, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      // Server Management
      let currentServerId = null;

      function openAddServerModal() {
        document.getElementById('addServerModal').classList.add('active');
      }

      function openEditServerModal(id, owner, plan, status, ip) {
        currentServerId = id;
        document.getElementById('editServerOwner').value = owner;
        document.getElementById('editServerPlan').value = plan;
        document.getElementById('editServerStatus').value = status;
        document.getElementById('editServerIP').value = ip || '';
        document.getElementById('editServerModal').classList.add('active');
      }

      function openDeleteServerModal(id, owner) {
        currentServerId = id;
        document.getElementById('deleteServerOwner').textContent = owner;
        document.getElementById('deleteServerModal').classList.add('active');
      }

      async function executeAddServer() {
        const user_id = document.getElementById('addServerUserId').value;
        const plan = document.getElementById('addServerPlan').value;
        const status = document.getElementById('addServerStatus').value;
        const ip_address = document.getElementById('addServerIP').value || null;

        const res = await fetch('/admin/servers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id, plan, status, ip_address })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      async function executeEditServer() {
        const plan = document.getElementById('editServerPlan').value;
        const status = document.getElementById('editServerStatus').value;
        const ip_address = document.getElementById('editServerIP').value || null;

        const res = await fetch('/admin/servers/' + currentServerId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, status, ip_address })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      async function executeDeleteServer() {
        const res = await fetch('/admin/servers/' + currentServerId, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      // Deployment Output Viewer
      function viewDeploymentOutput(id, status) {
        // Fetch deployment from server to get output
        fetch('/admin/deployment/' + id)
          .then(res => res.json())
          .then(data => {
            if (data.deployment) {
              const deployment = data.deployment;
              const outputContent = document.getElementById('deploymentOutputContent');
              if (deployment.output) {
                outputContent.textContent = deployment.output;
              } else if (status === 'pending') {
                outputContent.textContent = 'Deployment is pending. No output yet.';
              } else if (status === 'deploying') {
                outputContent.textContent = 'Deployment in progress...';
              } else {
                outputContent.textContent = 'No output available for this deployment.';
              }
              document.getElementById('deploymentOutputModal').classList.add('active');
            }
          })
          .catch(err => alert('Error loading deployment'));
      }

      // Domain Assignment
      let currentServerDomainId = null;

      function openAssignDomainModal(serverId, currentDomain) {
        currentServerDomainId = serverId;
        document.getElementById('assignDomainInput').value = currentDomain || '';
        document.getElementById('assignDomainModal').classList.add('active');
      }

      async function executeAssignDomain() {
        const domain = document.getElementById('assignDomainInput').value.trim();
        
        if (!domain) {
          alert('Please enter a domain name');
          return;
        }

        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
          alert('Invalid domain format (example: domain.com)');
          return;
        }

        const res = await fetch('/admin/servers/' + currentServerDomainId + '/assign-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          closeModal('assignDomainModal');
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      // Server Actions (Restart/Stop/Reboot)
      let currentServerActionId = null;
      let currentServerAction = null;

      function openServerActionModal(action, serverId, ownerEmail) {
        currentServerActionId = serverId;
        currentServerAction = action;

        const title = document.getElementById('serverActionTitle');
        const message = document.getElementById('serverActionMessage');
        const confirmBtn = document.getElementById('serverActionConfirmBtn');

        if (action === 'restart') {
          title.textContent = 'Restart Server?';
          message.textContent = \`This will restart the server for \${ownerEmail}. The server will be offline for a few seconds. Continue?\`;
          confirmBtn.textContent = 'Restart';
          confirmBtn.style.background = '#ff8c00';
        } else if (action === 'stop') {
          title.textContent = 'Stop Server?';
          message.textContent = \`This will stop the server for \${ownerEmail}. Customers will not be able to access their services. Continue?\`;
          confirmBtn.textContent = 'Stop';
          confirmBtn.style.background = '#ff4444';
        } else if (action === 'reboot') {
          title.textContent = 'Reboot Server?';
          message.textContent = \`This will reboot the server for \${ownerEmail}. The server will be offline briefly. Continue?\`;
          confirmBtn.textContent = 'Reboot';
          confirmBtn.style.background = '#ff8c00';
        }

        document.getElementById('serverActionModal').classList.add('active');
      }

      async function executeServerAction() {
        if (!currentServerActionId || !currentServerAction) return;

        const res = await fetch('/admin/servers/' + currentServerActionId + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: currentServerAction })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          closeModal('serverActionModal');
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      }

      // Support Tickets
      let currentTicketId = null;

      function viewTicketDetail(ticketId) {
        currentTicketId = ticketId;
        fetch('/admin/tickets/' + ticketId)
          .then(res => res.json())
          .then(data => {
            if (data.ticket) {
              const ticket = data.ticket;
              document.getElementById('ticketSubject').textContent = ticket.subject;
              document.getElementById('ticketDescription').textContent = ticket.description;
              document.getElementById('ticketMeta').textContent = \`From: \${data.customer_email} • Created: \${new Date(ticket.created_at).toLocaleString()}\`;
              document.getElementById('ticketStatusSelect').value = ticket.status;
              
              const priorityBadge = document.getElementById('ticketPriorityBadge');
              priorityBadge.textContent = ticket.priority;
              priorityBadge.className = 'status-badge ' + (ticket.priority === 'urgent' ? 'expired' : ticket.priority === 'high' ? 'pending' : 'active');
              
              const statusBadge = document.getElementById('ticketStatusBadge');
              statusBadge.textContent = ticket.status;
              statusBadge.className = 'status-badge ' + (ticket.status === 'resolved' ? 'active' : ticket.status === 'in-progress' ? 'pending' : ticket.status === 'closed' ? 'expired' : 'pending');
              
              // Load replies
              const repliesDiv = document.getElementById('ticketReplies');
              repliesDiv.innerHTML = data.replies.map(r => \`
                <div style="background: rgba(136, 254, 0, 0.05); padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid \${r.is_admin ? '#ff8c00' : 'var(--glow)'};">
                  <div style="color: #8892a0; font-size: 11px; margin-bottom: 4px;">\${r.is_admin ? '🔧 ADMIN' : 'CUSTOMER'} • \${new Date(r.created_at).toLocaleString()}</div>
                  <p style="color: #e0e6f0; margin: 0; white-space: pre-wrap;">\${r.message}</p>
                </div>
              \`).join('');
              \`).join('');
              
              document.getElementById('ticketDetailModal').classList.add('active');
            }
          })
          .catch(err => alert('Error loading ticket'));
      }

      async function submitTicketReply() {
        const message = document.getElementById('ticketReplyText').value.trim();
        if (!message) {
          alert('Please enter a reply');
          return;
        }

        const res = await fetch('/admin/tickets/' + currentTicketId + '/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('ticketReplyText').value = '';
          viewTicketDetail(currentTicketId);
        } else {
          alert('Error: ' + data.error);
        }
      }

      async function updateTicketStatus() {
        const status = document.getElementById('ticketStatusSelect').value;
        const res = await fetch('/admin/tickets/' + currentTicketId + '/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
          alert('Ticket status updated');
          viewTicketDetail(currentTicketId);
        } else {
          alert('Error: ' + data.error);
        }
      }

      // Audit Log
      async function loadAuditLog() {
        // TODO: Implement audit log fetch
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
      });
    </script>
    ${getScripts('nav.js')}
    `);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).send('Failed to load users');
  }
};
const promoteUser = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    
    // Only allow this specific admin
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { email } = req.body;
    const adminId = req.session.userId;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const oldRole = userResult.rows[0].role || 'user';
    if (oldRole === 'admin') {
      return res.status(400).json({ success: false, error: 'User already admin' });
    }

    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
    await logAdminAction(adminId, adminEmail, 'promote_user', email, oldRole, 'admin');

    res.json({ success: true, message: `${email} promoted to admin` });
  } catch (error) {
    console.error('[ADMIN] Promote user error:', error);
    res.status(500).json({ success: false, error: 'Failed to promote user' });
  }
};

// POST /admin/demote-user
const demoteUser = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    
    // Only allow this specific admin
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { email } = req.body;
    const adminId = req.session.userId;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    if (email === adminEmail) {
      return res.status(400).json({ success: false, error: 'Cannot demote yourself' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentRole = userResult.rows[0].role;
    if (currentRole !== 'admin') {
      return res.status(400).json({ success: false, error: 'User is not an admin' });
    }

    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['user', email]);
    await logAdminAction(adminId, adminEmail, 'demote_user', email, 'admin', 'user');

    res.json({ success: true, message: `${email} demoted to user` });
  } catch (error) {
    console.error('[ADMIN] Demote user error:', error);
    res.status(500).json({ success: false, error: 'Failed to demote user' });
  }
};

// GET /admin/audit-log
const viewAuditLog = async (req, res) => {
  try {
    const logs = await getAuditLog(100);
    
    res.send(`
${getHTMLHead('Audit Log - Admin')}
    <link rel="stylesheet" href="/css/dashboard.css">
    <style>
      main.dashboard { flex: 1; padding: 40px 20px; max-width: 1400px; margin: 0 auto; width: 100%; }
      .admin-header { margin-bottom: 40px; }
      .admin-title { font-size: 32px; color: var(--glow); margin: 0 0 8px 0; font-weight: 700; }
      .admin-subtitle { color: #8892a0; font-size: 14px; margin: 0; }
      
      .table-card { background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 6px; overflow: hidden; }
      .table-header { background: rgba(136, 254, 0, 0.05); border-bottom: 1px solid rgba(136, 254, 0, 0.15); padding: 20px; }
      .table-header-title { font-size: 18px; color: #e0e6f0; margin: 0; font-weight: 600; }
      
      .table-content { overflow-x: auto; }
      .audit-table { width: 100%; border-collapse: collapse; }
      .audit-table th { background: rgba(0, 0, 0, 0.2); padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #8892a0; border-bottom: 1px solid rgba(136, 254, 0, 0.15); }
      .audit-table td { padding: 12px 16px; border-bottom: 1px solid rgba(136, 254, 0, 0.05); color: #c8d2e0; font-size: 13px; }
      .audit-table tbody tr:hover { background: rgba(136, 254, 0, 0.02); }
      
      .action-badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; background: rgba(136, 254, 0, 0.1); color: var(--glow); }
      .timestamp { color: #8892a0; font-size: 12px; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}

    <main class="dashboard">
      <div class="admin-header">
        <h1 class="admin-title">Audit Log</h1>
        <p class="admin-subtitle">Admin actions history</p>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2 class="table-header-title">Recent Actions</h2>
        </div>
        <div class="table-content">
          ${logs.length > 0 ? `
          <table class="audit-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Change</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td>${log.admin_email || 'System'}</td>
                  <td><span class="action-badge">${log.action.replace(/_/g, ' ')}</span></td>
                  <td>${log.target_email}</td>
                  <td><span class="timestamp">${log.old_value ? log.old_value + ' → ' + log.new_value : log.new_value}</span></td>
                  <td class="timestamp">${new Date(log.created_at).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<div style="padding: 40px; text-align: center; color: #8892a0;">No audit log entries</div>'}
        </div>
      </div>
    </main>

    ${getFooter()}
    ${getScripts('nav.js')}
</body>
</html>
    `);
  } catch (error) {
    console.error('[ADMIN] View audit log error:', error);
    res.status(500).send('Failed to load audit log');
  }
};

// POST /admin/servers - Add new server
const addServer = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { user_id, plan, status, ip_address } = req.body;
    const adminId = req.session.userId;

    if (!user_id || !plan) {
      return res.status(400).json({ success: false, error: 'User and plan required' });
    }

    const result = await pool.query(
      'INSERT INTO servers (user_id, plan, status, ip_address) VALUES ($1, $2, $3, $4) RETURNING id, plan, status',
      [user_id, plan, status || 'provisioning', ip_address]
    );

    const server = result.rows[0];
    await logAdminAction(adminId, adminEmail, 'add_server', `Server #${server.id}`, null, JSON.stringify({ plan, status }));

    res.json({ success: true, message: `Server #${server.id} added`, server });
  } catch (error) {
    console.error('[ADMIN] Add server error:', error);
    res.status(500).json({ success: false, error: 'Failed to add server' });
  }
};

// PUT /admin/servers/:id - Update server
const updateServer = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { plan, status, ip_address } = req.body;
    const adminId = req.session.userId;

    const oldResult = await pool.query('SELECT plan, status FROM servers WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const oldServer = oldResult.rows[0];
    const result = await pool.query(
      'UPDATE servers SET plan = COALESCE($1, plan), status = COALESCE($2, status), ip_address = COALESCE($3, ip_address) WHERE id = $4 RETURNING id, plan, status',
      [plan, status, ip_address, id]
    );

    const server = result.rows[0];
    await logAdminAction(adminId, adminEmail, 'update_server', `Server #${id}`, JSON.stringify(oldServer), JSON.stringify({ plan: server.plan, status: server.status }));

    res.json({ success: true, message: `Server #${id} updated`, server });
  } catch (error) {
    console.error('[ADMIN] Update server error:', error);
    res.status(500).json({ success: false, error: 'Failed to update server' });
  }
};

// DELETE /admin/servers/:id - Delete server
const deleteServer = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const adminId = req.session.userId;

    const result = await pool.query('SELECT id FROM servers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    await pool.query('DELETE FROM servers WHERE id = $1', [id]);
    await logAdminAction(adminId, adminEmail, 'delete_server', `Server #${id}`, JSON.stringify({ deleted: true }), null);

    res.json({ success: true, message: `Server #${id} deleted` });
  } catch (error) {
    console.error('[ADMIN] Delete server error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete server' });
  }
};

// POST /admin/servers/:id/assign-domain - Assign domain and trigger SSL
const assignDomain = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { domain } = req.body;
    const adminId = req.session.userId;

    if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ success: false, error: 'Invalid domain format' });
    }

    // Get server details
    const serverResult = await pool.query('SELECT * FROM servers WHERE id = $1', [id]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const server = serverResult.rows[0];

    // Update domain and set SSL status to pending
    await pool.query(
      'UPDATE servers SET domain = $1, ssl_status = $2 WHERE id = $3',
      [domain, 'pending', id]
    );

    // Trigger Certbot on the server via SSH in background
    // Send response immediately, process SSL in background
    res.json({ success: true, message: `Domain ${domain} assigned. SSL certificate generation started in background.` });

    // Background process - trigger SSL certificate generation
    triggerSSLCertificate(id, domain, server).catch(err => {
      console.error('[SSL] Failed to trigger certificate for server', id, ':', err);
      // Update ssl_status to failed if something went wrong
      pool.query('UPDATE servers SET ssl_status = $1 WHERE id = $2', ['failed', id]).catch(e => console.error(e));
    });

    await logAdminAction(adminId, adminEmail, 'assign_domain', `Server #${id}`, null, JSON.stringify({ domain, ssl_status: 'pending' }));

  } catch (error) {
    console.error('[ADMIN] Assign domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign domain' });
  }
};

// Background function to trigger SSL via SSH
async function triggerSSLCertificate(serverId, domain, server) {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Generate Certbot command - runs on the server
    const certbotCmd = `certbot certonly --standalone -d ${domain} --email admin@${domain} --non-interactive --agree-tos`;

    // SSH command to run on server
    const sshCmd = `sshpass -p '${server.ssh_password}' ssh -o StrictHostKeyChecking=no ${server.ssh_username}@${server.ip_address} "${certbotCmd}"`;

    console.log(`[SSL] Running Certbot on server ${serverId} for domain ${domain}...`);
    
    // Execute the command with timeout
    const { stdout, stderr } = await execPromise(sshCmd, { timeout: 60000 });

    if (stdout.includes('Congratulations') || stderr.includes('Congratulations')) {
      // Certificate generated successfully
      await pool.query(
        'UPDATE servers SET ssl_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', serverId]
      );
      console.log(`[SSL] Certificate activated for ${domain} on server ${serverId}`);
    } else {
      throw new Error('Certbot command did not complete successfully');
    }
  } catch (error) {
    console.error(`[SSL] Error generating certificate for server ${serverId}:`, error.message);
    await pool.query(
      'UPDATE servers SET ssl_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['failed', serverId]
    );
  }
}

// POST /admin/servers/:id/action - Execute server action (restart/stop/reboot)
const executeServerAction = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { action } = req.body;
    const adminId = req.session.userId;

    if (!['restart', 'stop', 'reboot'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    // Get server details
    const serverResult = await pool.query('SELECT * FROM servers WHERE id = $1', [id]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const server = serverResult.rows[0];

    // Execute action via SSH in background
    res.json({ success: true, message: `Server ${action} command sent. Processing...` });

    // Background process - execute server action
    executeServerActionSSH(id, action, server, adminId, adminEmail).catch(err => {
      console.error('[SERVER_ACTION] Failed for server', id, ':', err);
    });

  } catch (error) {
    console.error('[ADMIN] Execute server action error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute server action' });
  }
};

// Background function to execute server action via SSH
async function executeServerActionSSH(serverId, action, server, adminId, adminEmail) {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    let command;
    if (action === 'restart') {
      command = 'sudo systemctl restart nginx';
    } else if (action === 'stop') {
      command = 'sudo systemctl stop nginx';
    } else if (action === 'reboot') {
      command = 'sudo reboot';
    }

    const sshCmd = `sshpass -p '${server.ssh_password}' ssh -o StrictHostKeyChecking=no ${server.ssh_username}@${server.ip_address} "${command}"`;

    console.log(`[SERVER_ACTION] Executing ${action} on server ${serverId}...`);
    
    await execPromise(sshCmd, { timeout: 30000 });

    await logAdminAction(adminId, adminEmail, `server_${action}`, `Server #${serverId}`, null, JSON.stringify({ action, ip: server.ip_address }));

    console.log(`[SERVER_ACTION] ${action} completed for server ${serverId}`);
  } catch (error) {
    console.error(`[SERVER_ACTION] Error executing ${action} for server ${serverId}:`, error.message);
    await logAdminAction(adminId, adminEmail, `server_${action}_failed`, `Server #${serverId}`, null, JSON.stringify({ action, error: error.message }));
  }
}

// GET /admin/tickets/:id - Get ticket detail with all replies
const viewTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      'SELECT t.id, t.subject, t.description, t.priority, t.status, t.created_at, u.email FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    const repliesResult = await pool.query(
      'SELECT r.id, r.message, r.is_admin, r.created_at, u.email FROM ticket_replies r LEFT JOIN users u ON r.user_id = u.id WHERE r.ticket_id = $1 ORDER BY r.created_at ASC',
      [id]
    );

    const replies = repliesResult.rows;

    res.json({ 
      success: true, 
      ticket, 
      customer_email: ticket.email,
      replies 
    });
  } catch (error) {
    console.error('[ADMIN] View ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to load ticket' });
  }
};

// POST /admin/tickets/:id/reply - Add admin reply to ticket
const submitTicketReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.session.userId;
    const adminEmail = req.session.email;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Reply message required' });
    }

    // Verify ticket exists
    const ticketResult = await pool.query('SELECT id, user_id FROM support_tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Insert reply
    await pool.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, is_admin, message, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [id, adminId, true, message.trim()]
    );

    // Log admin action
    await logAdminAction(adminId, adminEmail, 'ticket_reply', `Ticket #${id}`, null, message.substring(0, 100));

    res.json({ success: true, message: 'Reply added' });
  } catch (error) {
    console.error('[ADMIN] Submit ticket reply error:', error);
    res.status(500).json({ success: false, error: 'Failed to add reply' });
  }
};

// PUT /admin/tickets/:id/status - Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.session.userId;
    const adminEmail = req.session.email;

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Verify ticket exists
    const ticketResult = await pool.query('SELECT id FROM support_tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Update status
    await pool.query('UPDATE support_tickets SET status = $1 WHERE id = $2', [status, id]);

    // Log admin action
    await logAdminAction(adminId, adminEmail, 'ticket_status_change', `Ticket #${id}`, null, `Status: ${status}`);

    res.json({ success: true, message: 'Ticket status updated' });
  } catch (error) {
    console.error('[ADMIN] Update ticket status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

module.exports = { listUsers, promoteUser, demoteUser, viewAuditLog, addServer, updateServer, deleteServer, assignDomain, executeServerAction, viewTicket, submitTicketReply, updateTicketStatus };
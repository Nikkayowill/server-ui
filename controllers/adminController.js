const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav, escapeHtml } = require('../helpers');

// GET /admin - Simple scrollable admin dashboard
const listUsers = async (req, res) => {
  try {
    // Optimized: Single query with parallel fetching instead of 6 sequential queries
    const [usersResult, serversResult, domainsResult, deploymentsResult, paymentsResult, pendingRequestsResult] = await Promise.all([
      pool.query('SELECT id, email, role, email_confirmed, created_at FROM users ORDER BY created_at DESC'),
      pool.query('SELECT s.id, s.plan, s.status, s.ip_address, s.ipv6_address, s.created_at, u.email as owner_email FROM servers s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC'),
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
    ${getResponsiveNav(req)}

    <div class="dashboard-grid">
    <!-- Admin Sidebar -->
    <aside class="dashboard-sidebar hidden md:block">
        <!-- Admin Badge -->
        <div class="sidebar-user">
            <div class="sidebar-user-avatar bg-gradient-to-br from-red-500 to-orange-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            </div>
            <div class="sidebar-user-info">
                <div class="sidebar-user-name">Admin Panel</div>
                <div class="sidebar-user-plan text-red-400">Full Access</div>
            </div>
        </div>
        
        <!-- Overview Section -->
        <nav class="sidebar-section">
            <h3 class="sidebar-section-title">Overview</h3>
            <ul class="sidebar-nav-list">
                <li>
                    <a href="#stats" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        Stats
                    </a>
                </li>
                ${pendingRequests.length > 0 ? `
                <li>
                    <a href="#pending" class="sidebar-nav-link text-orange-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Pending (${pendingRequests.length})
                    </a>
                </li>
                ` : ''}
            </ul>
        </nav>
        
        <!-- Data Section -->
        <nav class="sidebar-section">
            <h3 class="sidebar-section-title">Data</h3>
            <ul class="sidebar-nav-list">
                <li>
                    <a href="#users" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                        Users (${users.length})
                    </a>
                </li>
                <li>
                    <a href="#servers" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>
                        Servers (${servers.length})
                    </a>
                </li>
                <li>
                    <a href="#domains" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                        Domains (${domains.length})
                    </a>
                </li>
            </ul>
        </nav>
        
        <!-- Activity Section -->
        <nav class="sidebar-section">
            <h3 class="sidebar-section-title">Activity</h3>
            <ul class="sidebar-nav-list">
                <li>
                    <a href="#deployments" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Deployments
                    </a>
                </li>
                <li>
                    <a href="#payments" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                        Payments
                    </a>
                </li>
            </ul>
        </nav>
        
        <!-- Quick Links -->
        <nav class="sidebar-section">
            <h3 class="sidebar-section-title">Quick Links</h3>
            <ul class="sidebar-nav-list">
                <li>
                    <a href="/admin/updates" class="sidebar-nav-link text-orange-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Server Updates
                    </a>
                </li>
                <li>
                    <a href="https://cloud.digitalocean.com/droplets" target="_blank" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        DigitalOcean
                    </a>
                </li>
                <li>
                    <a href="https://dashboard.stripe.com" target="_blank" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        Stripe
                    </a>
                </li>
                <li>
                    <a href="/dashboard" class="sidebar-nav-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
                        User Dashboard
                    </a>
                </li>
            </ul>
        </nav>
    </aside>

    <!-- Mobile Sidebar Overlay -->
    <div id="sidebar-overlay" class="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 hidden"></div>

    <!-- Main Content Area -->
    <main class="dashboard-content">
        <!-- Admin Header -->
        <header class="flex flex-col gap-4 mb-8">
            <div class="flex items-center gap-4">
                <!-- Mobile sidebar toggle -->
                <button id="mobile-sidebar-toggle" class="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <div>
                    <h1 class="text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
                    <p class="text-gray-500 text-xs">Manage users, servers, and payments</p>
                </div>
            </div>
        </header>

        <!-- Content Sections -->
        <div class="space-y-8">
        
            <!-- STATS SECTION -->
            <div id="stats" class="scroll-mt-24">
                <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Stats</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Users</p>
                        <p class="text-2xl font-bold text-brand">${users.length}</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Servers</p>
                        <p class="text-2xl font-bold text-green-400">${servers.filter(s => s.status === 'running').length}/${servers.length}</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Domains</p>
                        <p class="text-2xl font-bold text-purple-400">${domains.length}</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Revenue</p>
                        <p class="text-2xl font-bold text-yellow-400">$${(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(0)}</p>
                    </div>
                </div>
            </div>

            ${pendingRequests.length > 0 ? `
            <!-- PENDING SECTION -->
            <div id="pending" class="bg-gray-800 rounded-lg p-6 scroll-mt-24 border-2 border-orange-500">
                <h4 class="text-sm font-bold uppercase tracking-wide text-orange-400 mb-4">⚡ Pending Requests (${pendingRequests.length})</h4>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-black bg-opacity-30">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Customer</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Details</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
                            ${pendingRequests.map(r => {
                              const details = r.description.split('\\n').reduce((acc, line) => {
                                const [key, val] = line.split(': ');
                                acc[key] = val;
                                return acc;
                              }, {});
                              return `
                              <tr class="hover:bg-gray-700 transition-colors">
                                <td class="px-4 py-3 text-sm text-white">${escapeHtml(r.customer_email)}</td>
                                <td class="px-4 py-3 text-xs text-gray-400">
                                    <span class="text-brand">${escapeHtml(details.Region || 'N/A')}</span> · ${escapeHtml(details['Server Name'] || 'Default')}
                                </td>
                                <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-bold uppercase rounded bg-orange-900 text-orange-300">${escapeHtml(r.status)}</span></td>
                                <td class="px-4 py-3 text-xs text-gray-400">${new Date(r.created_at).toLocaleDateString()}</td>
                                <td class="px-4 py-3">
                                    <a href="https://cloud.digitalocean.com/droplets/new" target="_blank" class="text-brand hover:text-cyan-400 text-xs font-bold">Provision →</a>
                                </td>
                              </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}

      <!-- USERS SECTION -->
      <div id="users" class="bg-gray-800 rounded-lg p-6 scroll-mt-24">
        <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Users (${users.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black bg-opacity-30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Email</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Role</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Confirmed</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Created</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${users.map(u => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 text-sm text-white">${escapeHtml(u.email)}</td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded ${u.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'}">${u.role}</span></td>
                  <td class="px-4 py-3 text-xs">${u.email_confirmed ? '<span class="text-green-400">✓</span>' : '<span class="text-red-400">✗</span>'}</td>
                  <td class="px-4 py-3 text-xs text-gray-400">${new Date(u.created_at).toLocaleDateString()}</td>
                  <td class="px-4 py-3">
                    <form method="POST" action="/admin/delete-user/${u.id}" class="inline" onsubmit="return confirm('Delete ${escapeHtml(u.email)}?');">
                      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                      <button type="submit" class="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Delete</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SERVERS SECTION -->
      <div id="servers" class="bg-gray-800 rounded-lg p-6 scroll-mt-24">
        <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Servers (${servers.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black bg-opacity-30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">ID</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Owner</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Plan</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">IP</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Created</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${servers.map(s => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">#${s.id}</td>
                  <td class="px-4 py-3 text-sm text-white">${escapeHtml(s.owner_email || '-')}</td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded bg-blue-900 text-blue-300">${escapeHtml(s.plan)}</span></td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded ${s.status === 'running' ? 'bg-green-900 text-green-300' : s.status === 'provisioning' ? 'bg-yellow-900 text-yellow-300' : s.status === 'deleted' ? 'bg-gray-900 text-gray-500' : 'bg-red-900 text-red-300'}">${escapeHtml(s.status)}</span></td>
                  <td class="px-4 py-3 text-xs font-mono text-brand">${escapeHtml(s.ip_address || '-')}</td>
                  <td class="px-4 py-3 text-xs text-gray-400">${new Date(s.created_at).toLocaleDateString()}</td>
                  <td class="px-4 py-3">
                    <div class="flex gap-1">
                      ${s.status === 'provisioning' ? `
                      <form method="POST" action="/admin/cancel-provisioning/${s.id}" class="inline" onsubmit="return confirm('Cancel provisioning?');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">Cancel</button>
                      </form>
                      ` : ''}
                      ${s.status === 'deleted' ? `
                      <form method="POST" action="/admin/delete-server/${s.id}" class="inline" onsubmit="return confirm('Remove server record #${s.id}?');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">Remove Record</button>
                      </form>
                      ` : `
                      <form method="POST" action="/admin/destroy-droplet/${s.id}" class="inline" onsubmit="return confirm('DESTROY droplet for server #${s.id}? This will delete the droplet from DigitalOcean and remove the server record. Cannot be undone!');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-2 py-1 bg-red-800 text-white text-xs rounded hover:bg-red-900">Destroy</button>
                      </form>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DOMAINS SECTION -->
      <div id="domains" class="bg-gray-800 rounded-lg p-6 scroll-mt-24">
        <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Domains (${domains.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black bg-opacity-30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Domain</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">SSL</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Expires</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${domains.map(d => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 text-sm text-white font-mono">${escapeHtml(d.domain)}</td>
                  <td class="px-4 py-3 text-xs">${d.ssl_enabled ? '<span class="text-green-400">🔒 Active</span>' : '<span class="text-gray-500">—</span>'}</td>
                  <td class="px-4 py-3 text-xs text-gray-400">${d.ssl_expires_at ? new Date(d.ssl_expires_at).toLocaleDateString() : '-'}</td>
                  <td class="px-4 py-3 text-xs text-gray-400">${new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DEPLOYMENTS SECTION -->
      <div id="deployments" class="bg-gray-800 rounded-lg p-6 scroll-mt-24">
        <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Deployments (${deployments.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black bg-opacity-30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">ID</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Owner</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Git URL</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Deployed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${deployments.map(d => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">#${d.id}</td>
                  <td class="px-4 py-3 text-sm text-white">${escapeHtml(d.owner_email || '-')}</td>
                  <td class="px-4 py-3 text-xs text-gray-300 font-mono truncate max-w-[200px]">${escapeHtml(d.git_url || '-')}</td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded ${d.status === 'success' ? 'bg-green-900 text-green-300' : d.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}">${escapeHtml(d.status)}</span></td>
                  <td class="px-4 py-3 text-xs text-gray-400">${d.deployed_at ? new Date(d.deployed_at).toLocaleDateString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAYMENTS SECTION -->
      <div id="payments" class="bg-gray-800 rounded-lg p-6 scroll-mt-24">
        <h4 class="text-sm font-bold uppercase tracking-wide text-white mb-4">Payments (${payments.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black bg-opacity-30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">ID</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Plan</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${payments.map(p => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">#${p.id}</td>
                  <td class="px-4 py-3 text-sm text-white">${escapeHtml(p.customer_email || '-')}</td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded bg-blue-900 text-blue-300">${escapeHtml(p.plan)}</span></td>
                  <td class="px-4 py-3 text-sm text-brand font-bold">$${(p.amount / 100).toFixed(2)}</td>
                  <td class="px-4 py-3 text-xs"><span class="px-2 py-1 rounded ${p.status === 'succeeded' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">${escapeHtml(p.status)}</span></td>
                  <td class="px-4 py-3 text-xs text-gray-400">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

        </div>
    </main>
    </div>

    ${getFooter()}
    ${getScripts('nav.js', 'dashboard.js')}
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

// POST /admin/cancel-provisioning/:id - Cancel provisioning and mark as failed
const cancelProvisioning = async (req, res) => {
  try {
    const serverId = req.params.id;
    
    // Update server status to failed
    await pool.query(
      'UPDATE servers SET status = $1 WHERE id = $2',
      ['failed', serverId]
    );
    
    console.log(`Admin cancelled provisioning for server ${serverId}`);
    res.redirect('/admin?success=Provisioning cancelled successfully');
  } catch (error) {
    console.error('Cancel provisioning error:', error);
    res.redirect('/admin?error=Failed to cancel provisioning');
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

// POST /admin/destroy-droplet/:id - Destroy actual DigitalOcean droplet and delete server record
const destroyDroplet = async (req, res) => {
  try {
    const serverId = req.params.id;
    const { destroyDropletByServerId } = require('../services/digitalocean');
    
    const result = await destroyDropletByServerId(serverId);
    
    res.redirect('/admin?success=' + encodeURIComponent(result.message || 'Droplet destroyed and server deleted successfully'));
  } catch (error) {
    console.error('Destroy droplet error:', error);
    res.redirect('/admin?error=Failed to destroy droplet: ' + encodeURIComponent(error.message));
  }
};

module.exports = { listUsers, deleteUser, deleteServer, destroyDroplet, cancelProvisioning };

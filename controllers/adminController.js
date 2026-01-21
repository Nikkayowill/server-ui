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
    ${getResponsiveNav(req)}

    <main class="bg-gray-900 min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-3xl md:text-4xl font-bold text-brand text-center mb-12">Admin Dashboard</h1>

      <!-- Pending Server Requests (Priority) -->
      ${pendingRequests.length > 0 ? `
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-brand mb-4 flex items-center gap-2">
          <span>⚡</span>
          <span>Pending Server Requests (${pendingRequests.length})</span>
        </h2>
        <div class="bg-gray-800 border-2 border-brand rounded-lg overflow-hidden glow-brand">
          <table class="w-full">
            <thead class="bg-brand bg-opacity-10">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Requested</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${pendingRequests.map(r => {
                const details = r.description.split('\n').reduce((acc, line) => {
                  const [key, val] = line.split(': ');
                  acc[key] = val;
                  return acc;
                }, {});
                return `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-white font-bold">${r.customer_email}</td>
                  <td class="px-6 py-4">
                    <div class="text-xs text-gray-400 space-y-1">
                      <div>Region: <span class="text-brand font-bold">${details.Region || 'N/A'}</span></div>
                      <div>Name: <span class="text-gray-300">${details['Server Name'] || 'Default'}</span></div>
                      <div>Use: <span class="text-gray-300">${details['Use Case'] || 'Not specified'}</span></div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-500 bg-opacity-20 text-orange-400">
                      ${r.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-400">
                    ${new Date(r.created_at).toLocaleDateString()}<br/>
                    <span class="text-xs">${new Date(r.created_at).toLocaleTimeString()}</span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <a href="https://cloud.digitalocean.com/droplets/new" 
                       target="_blank" 
                       class="text-brand hover:text-cyan-400 font-medium underline transition-colors">
                      Provision →
                    </a>
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Users Section -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-4">Users (${users.length})</h2>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-white bg-opacity-5">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Confirmed</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${users.map(u => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-white">${u.email}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${u.role}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${u.email_confirmed ? 'Yes' : 'No'}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${new Date(u.created_at).toLocaleDateString()}</td>
                  <td class="px-6 py-4 text-sm">
                    <form method="POST" action="/admin/delete-user/${u.id}" class="inline" onsubmit="return confirm('Delete user ${u.email}? This will also delete all their servers, deployments, and payments.');">
                      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                      <button type="submit" class="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded hover:bg-red-700 transition-colors">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Servers Section -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-4">Servers (${servers.length})</h2>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-white bg-opacity-5">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Owner</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">IP Address</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${servers.map(s => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-400 font-mono">#${s.id}</td>
                  <td class="px-6 py-4 text-sm text-white">${s.owner_email || '-'}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${s.plan}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${s.status}</td>
                  <td class="px-6 py-4 text-sm text-gray-300 font-mono">${s.ip_address || '-'}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${new Date(s.created_at).toLocaleDateString()}</td>
                  <td class="px-6 py-4 text-sm">
                    <div class="flex flex-col sm:flex-row gap-2">
                      ${s.status === 'provisioning' ? `
                      <form method="POST" action="/admin/cancel-provisioning/${s.id}" class="inline" onsubmit="return confirm('Cancel provisioning for server #${s.id}? This will mark it as failed.');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-3 py-1.5 bg-orange-600 text-white font-bold text-xs rounded hover:bg-orange-700 transition-colors whitespace-nowrap">
                          Cancel
                        </button>
                      </form>
                      ` : ''}
                      <form method="POST" action="/admin/destroy-droplet/${s.id}" class="inline" onsubmit="return confirm('DESTROY droplet for server #${s.id}? This will permanently delete the DigitalOcean droplet AND the database record. This cannot be undone!');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-3 py-1.5 bg-red-800 text-white font-bold text-xs rounded hover:bg-red-900 transition-colors whitespace-nowrap">
                          Destroy
                        </button>
                      </form>
                      <form method="POST" action="/admin/delete-server/${s.id}" class="inline" onsubmit="return confirm('Delete server record #${s.id}? This will remove it from the database but NOT destroy the actual droplet.');">
                        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                        <button type="submit" class="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors whitespace-nowrap">
                          Delete DB
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Domains Section -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-4">Domains (${domains.length})</h2>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-white bg-opacity-5">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Domain</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">SSL Enabled</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">SSL Expires</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${domains.map(d => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-white font-mono">${d.domain}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${d.ssl_enabled ? 'Yes' : 'No'}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${d.ssl_expires_at ? new Date(d.ssl_expires_at).toLocaleDateString() : '-'}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Deployments Section -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-4">Recent Deployments (${deployments.length})</h2>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-white bg-opacity-5">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Owner</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Git URL</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Deployed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${deployments.map(d => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-400 font-mono">#${d.id}</td>
                  <td class="px-6 py-4 text-sm text-white">${d.owner_email || '-'}</td>
                  <td class="px-6 py-4 text-xs text-gray-300 font-mono">${d.git_url || '-'}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${d.status}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${d.deployed_at ? new Date(d.deployed_at).toLocaleDateString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payments Section -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-4">Recent Payments (${payments.length})</h2>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-white bg-opacity-5">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${payments.map(p => `
                <tr class="hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-400 font-mono">#${p.id}</td>
                  <td class="px-6 py-4 text-sm text-white">${p.customer_email || '-'}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${p.plan}</td>
                  <td class="px-6 py-4 text-sm text-brand font-bold">$${(p.amount / 100).toFixed(2)}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">${p.status}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </main>

    ${getFooter()}
    ${getScripts('nav.js')}
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

module.exports = { listUsers, deleteUser, deleteServer, destroyDroplet, cancelProvisioning };

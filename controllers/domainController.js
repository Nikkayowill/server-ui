const pool = require('../db');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');
const { logAdminAction } = require('../services/auditLog');

// GET /admin/domains - Render domain management page
const showDomainManagement = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, status, provider, renewal_date, notes, created_at FROM domains ORDER BY created_at DESC'
    );

    const domains = result.rows;
    const totalDomains = domains.length;
    const activeDomains = domains.filter(d => d.status === 'active').length;
    const hostingerDomains = domains.filter(d => d.provider === 'hostinger').length;

    res.send(`
${getHTMLHead('Domain Management - Admin')}
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
      
      .admin-header { margin-bottom: 48px; display: flex; justify-content: space-between; align-items: flex-start; }
      .admin-title { font-size: 36px; color: var(--glow); margin: 0 0 12px 0; font-weight: 700; letter-spacing: -0.5px; }
      .admin-subtitle { color: #8892a0; font-size: 15px; margin: 0; }
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
      
      .domain-name { color: #e0e6f0; font-weight: 500; }
      .badge { display: inline-block; padding: 5px 11px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge.active { background: rgba(123, 255, 123, 0.15); color: #7BFF7B; }
      .badge.pending { background: rgba(255, 196, 107, 0.15); color: #ffc46b; }
      .badge.expired { background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }
      .badge.hostinger { background: rgba(136, 254, 0, 0.15); color: var(--glow); }
      
      .action-cell { display: flex; gap: 10px; align-items: center; }
      .action-btn { padding: 7px 12px; font-size: 11px; border: 1px solid rgba(136, 254, 0, 0.25); background: transparent; color: var(--glow); border-radius: 3px; cursor: pointer; transition: .2s; font-weight: 500; }
      .action-btn:hover { background: rgba(136, 254, 0, 0.1); border-color: var(--glow); }
      .action-btn.danger { color: #ff6b6b; border-color: rgba(255, 107, 107, 0.25); }
      .action-btn.danger:hover { background: rgba(255, 107, 107, 0.1); border-color: #ff6b6b; }
      
      .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 20px; }
      .modal.active { display: flex; }
      .modal-content { background: rgba(2, 8, 20, 0.98); border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 8px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; }
      .modal-title { font-size: 20px; color: var(--glow); margin: 0 0 20px 0; font-weight: 600; }
      .form-group { margin-bottom: 18px; }
      .form-group label { display: block; color: #8892a0; font-size: 12px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.2); color: #e0e6f0; border-radius: 4px; font-family: inherit; font-size: 13px; }
      .form-group textarea { resize: vertical; min-height: 80px; }
      .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
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
          <div>
            <h1 class="admin-title">Domain Management</h1>
            <p class="admin-subtitle">View and manage your domains</p>
          </div>
          <button class="btn-add" onclick="openAddModal()">+ Add Domain</button>
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
                      <button class="action-btn" onclick="openEditModal(${domain.id}, '${domain.name}', '${domain.status}', '${domain.provider}', '${domain.renewal_date || ''}', '${(domain.notes || '').replace(/'/g, "\\'")}')">Edit</button>
                      <button class="action-btn danger" onclick="openDeleteModal(${domain.id}, '${domain.name}')">Delete</button>
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
      </main>
    </div>

    <div id="addModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Add Domain</h3>
        <form id="addForm">
          <div class="form-group">
            <label>Domain Name</label>
            <input type="text" id="addName" placeholder="example.com" required>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="addStatus">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div class="form-group">
            <label>Provider</label>
            <select id="addProvider">
              <option value="hostinger">Hostinger</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Renewal Date (Optional)</label>
            <input type="date" id="addRenewalDate">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="addNotes" placeholder="Add notes about this domain..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn" onclick="closeModal('addModal')">Cancel</button>
            <button type="button" class="modal-btn confirm" onclick="executeAdd()">Add Domain</button>
          </div>
        </form>
      </div>
    </div>

    <div id="editModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Edit Domain</h3>
        <form id="editForm">
          <div class="form-group">
            <label>Domain Name</label>
            <input type="text" id="editName" disabled>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="editStatus">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div class="form-group">
            <label>Provider</label>
            <select id="editProvider">
              <option value="hostinger">Hostinger</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Renewal Date (Optional)</label>
            <input type="date" id="editRenewalDate">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="editNotes" placeholder="Add notes about this domain..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn" onclick="closeModal('editModal')">Cancel</button>
            <button type="button" class="modal-btn confirm" onclick="executeEdit()">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <div id="deleteModal" class="modal">
      <div class="modal-content">
        <h3 class="modal-title" style="color: #ff6b6b;">Delete Domain?</h3>
        <p style="color: #8892a0; margin: 14px 0 24px 0; line-height: 1.7;">
          Are you sure you want to delete <strong id="deleteName"></strong>? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="modal-btn" onclick="closeModal('deleteModal')">Cancel</button>
          <button class="modal-btn confirm" style="background: #ff6b6b; color: #fff;" onclick="executeDelete()">Delete</button>
        </div>
      </div>
    </div>

    ${getFooter()}
    ${getScripts('nav.js')}
    
    <script>
      let currentAction = null;
      let currentDomainId = null;

      function openAddModal() {
        document.getElementById('addModal').classList.add('active');
        document.getElementById('addForm').reset();
      }

      function openEditModal(id, name, status, provider, renewal_date, notes) {
        currentDomainId = id;
        document.getElementById('editName').value = name;
        document.getElementById('editStatus').value = status;
        document.getElementById('editProvider').value = provider;
        document.getElementById('editRenewalDate').value = renewal_date;
        document.getElementById('editNotes').value = notes;
        document.getElementById('editModal').classList.add('active');
      }

      function openDeleteModal(id, name) {
        currentDomainId = id;
        document.getElementById('deleteName').textContent = name;
        document.getElementById('deleteModal').classList.add('active');
      }

      function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        currentDomainId = null;
      }

      async function executeAdd() {
        const name = document.getElementById('addName').value;
        const status = document.getElementById('addStatus').value;
        const provider = document.getElementById('addProvider').value;
        const renewal_date = document.getElementById('addRenewalDate').value || null;
        const notes = document.getElementById('addNotes').value;

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

      async function executeEdit() {
        const status = document.getElementById('editStatus').value;
        const provider = document.getElementById('editProvider').value;
        const renewal_date = document.getElementById('editRenewalDate').value || null;
        const notes = document.getElementById('editNotes').value;

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

      async function executeDelete() {
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

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
      });
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('[ADMIN] Domain management error:', error);
    res.status(500).send('Failed to load domain management');
  }
};

// GET /admin/domains/list - JSON API for domains
const listDomains = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, status, provider, renewal_date, notes, created_at FROM domains ORDER BY created_at DESC'
    );

    const domains = result.rows;
    const totalDomains = domains.length;
    const activeDomains = domains.filter(d => d.status === 'active').length;
    const hostingerDomains = domains.filter(d => d.provider === 'hostinger').length;

    res.json({
      success: true,
      domains,
      stats: {
        total: totalDomains,
        active: activeDomains,
        hostinger: hostingerDomains
      }
    });
  } catch (error) {
    console.error('[ADMIN] List domains error:', error);
    res.status(500).json({ success: false, error: 'Failed to load domains' });
  }
};

// POST /admin/domains - Add new domain
const addDomain = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { name, status, provider, renewal_date, notes } = req.body;
    const adminId = req.session.userId;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Domain name required' });
    }

    const result = await pool.query(
      'INSERT INTO domains (name, status, provider, renewal_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, status, provider, renewal_date, created_at',
      [name, status || 'active', provider || 'hostinger', renewal_date || null, notes || null]
    );

    const domain = result.rows[0];
    await logAdminAction(adminId, adminEmail, 'add_domain', name, null, JSON.stringify({ status, provider }));

    res.json({ success: true, message: `Domain ${name} added`, domain });
  } catch (error) {
    console.error('[ADMIN] Add domain error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Domain already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to add domain' });
  }
};

// PUT /admin/domains/:id - Update domain
const updateDomain = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name, status, provider, renewal_date, notes } = req.body;
    const adminId = req.session.userId;

    const oldResult = await pool.query('SELECT status, provider FROM domains WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    const oldDomain = oldResult.rows[0];
    const result = await pool.query(
      'UPDATE domains SET name = COALESCE($1, name), status = COALESCE($2, status), provider = COALESCE($3, provider), renewal_date = COALESCE($4, renewal_date), notes = COALESCE($5, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING id, name, status, provider, renewal_date',
      [name, status, provider, renewal_date, notes, id]
    );

    const domain = result.rows[0];
    await logAdminAction(adminId, adminEmail, 'update_domain', name || domain.name, JSON.stringify(oldDomain), JSON.stringify({ status: domain.status, provider: domain.provider }));

    res.json({ success: true, message: `Domain ${domain.name} updated`, domain });
  } catch (error) {
    console.error('[ADMIN] Update domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to update domain' });
  }
};

// DELETE /admin/domains/:id - Delete domain
const deleteDomain = async (req, res) => {
  try {
    const adminEmail = req.session.userEmail;
    if (adminEmail !== 'nikkayowillpbiz@gmail.com') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const adminId = req.session.userId;

    const result = await pool.query('SELECT name FROM domains WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    const domain = result.rows[0];
    await pool.query('DELETE FROM domains WHERE id = $1', [id]);
    await logAdminAction(adminId, adminEmail, 'delete_domain', domain.name, JSON.stringify({ deleted: true }), null);

    res.json({ success: true, message: `Domain ${domain.name} deleted` });
  } catch (error) {
    console.error('[ADMIN] Delete domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete domain' });
  }
};

module.exports = { showDomainManagement, listDomains, addDomain, updateDomain, deleteDomain };

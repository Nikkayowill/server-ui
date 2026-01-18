const pool = require('../db');

async function logAdminAction(adminId, adminEmail, action, targetEmail, oldValue, newValue) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_email, old_value, new_value) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, adminEmail, action, targetEmail, oldValue || null, newValue || null]
    );
  } catch (error) {
    console.error('[AUDIT] Error logging admin action:', error.message);
  }
}

async function getAuditLog(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT id, admin_email, action, target_email, old_value, new_value, created_at 
       FROM admin_audit_log 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('[AUDIT] Error fetching audit log:', error.message);
    return [];
  }
}

module.exports = {
  logAdminAction,
  getAuditLog
};

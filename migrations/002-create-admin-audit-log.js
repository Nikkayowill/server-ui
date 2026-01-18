const pool = require('../db');

async function createAdminAuditLog() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id SERIAL PRIMARY KEY,
        admin_id INT REFERENCES users(id) ON DELETE SET NULL,
        admin_email VARCHAR(255),
        action VARCHAR(100),
        target_email VARCHAR(255),
        target_id INT,
        old_value VARCHAR(500),
        new_value VARCHAR(500),
        details TEXT,
        status VARCHAR(50),
        error_message TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_target_email ON admin_audit_log(target_email);
    `);
    console.log('[MIGRATION] admin_audit_log table created or already exists');
  } catch (error) {
    console.error('[MIGRATION] Error creating admin_audit_log:', error.message);
    throw error;
  }
}

createAdminAuditLog().then(() => {
  console.log('[MIGRATION] Migration complete');
  process.exit(0);
}).catch(err => {
  console.error('[MIGRATION] Migration failed:', err);
  process.exit(1);
});

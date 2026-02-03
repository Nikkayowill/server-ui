require('dotenv').config();
const pool = require('../db');

async function addSSLVerificationColumns() {
  try {
    // Add columns for proper SSL state tracking
    await pool.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS ssl_status VARCHAR(20) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS ssl_last_verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ssl_dns_valid BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ssl_cert_exists BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ssl_reachable BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS expected_ip VARCHAR(45)
    `);
    
    // ssl_status values:
    // 'none' - no SSL configured
    // 'pending' - SSL requested but not yet issued
    // 'active' - DNS valid + cert exists + reachable
    // 'orphaned' - cert exists but DNS doesn't point to us
    // 'expired' - cert expired
    // 'unreachable' - DNS valid but TLS handshake fails
    
    console.log('✅ Added SSL verification columns to domains table');
    
    // Migrate existing ssl_enabled = true to ssl_status = 'active' (will be re-verified by job)
    await pool.query(`
      UPDATE domains 
      SET ssl_status = 'active', ssl_cert_exists = true 
      WHERE ssl_enabled = true
    `);
    
    console.log('✅ Migrated existing SSL states');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addSSLVerificationColumns();

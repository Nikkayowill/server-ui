// Migration: Add subdomain and dns_record_id to deployments table
// For Vercel-style auto-subdomain feature

const pool = require('../db');

async function up() {
  console.log('[Migration 018] Adding subdomain columns to deployments...');
  
  await pool.query(`
    ALTER TABLE deployments 
    ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dns_record_id BIGINT
  `);
  
  // Add unique constraint on subdomain (only one active deployment per subdomain)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deployments_subdomain 
    ON deployments(subdomain) 
    WHERE subdomain IS NOT NULL
  `);
  
  console.log('[Migration 018] ✓ Added subdomain and dns_record_id columns');
}

async function down() {
  console.log('[Migration 018] Removing subdomain columns from deployments...');
  
  await pool.query(`DROP INDEX IF EXISTS idx_deployments_subdomain`);
  await pool.query(`
    ALTER TABLE deployments 
    DROP COLUMN IF EXISTS subdomain,
    DROP COLUMN IF EXISTS dns_record_id
  `);
  
  console.log('[Migration 018] ✓ Removed subdomain columns');
}

module.exports = { up, down };

// Run directly
if (require.main === module) {
  require('dotenv').config();
  up()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

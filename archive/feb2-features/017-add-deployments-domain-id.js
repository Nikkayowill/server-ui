// Migration: Add domain_id column to deployments table
// Links deployments to specific domains for multi-site support

const pool = require('../db');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add domain_id column - links deployment to a specific domain (nullable for legacy server-wide deployments)
    await client.query(`
      ALTER TABLE deployments 
      ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL
    `);
    
    // Add index for faster domain-specific deployment queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deployments_domain_id ON deployments(domain_id)
    `);
    
    await client.query('COMMIT');
    console.log('[MIGRATION] Added domain_id column to deployments table');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove index
    await client.query(`
      DROP INDEX IF EXISTS idx_deployments_domain_id
    `);
    
    // Remove column
    await client.query(`
      ALTER TABLE deployments 
      DROP COLUMN IF EXISTS domain_id
    `);
    
    await client.query('COMMIT');
    console.log('[MIGRATION] Removed domain_id column from deployments table');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };

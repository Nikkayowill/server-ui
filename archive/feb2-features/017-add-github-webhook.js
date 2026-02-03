/**
 * Migration 017: Add GitHub webhook columns to servers table
 * Enables auto-deploy on git push
 */

const pool = require('../db');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add webhook secret column (for signature verification)
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS github_webhook_secret VARCHAR(64)
    `);
    
    // Add auto-deploy enabled flag
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS auto_deploy_enabled BOOLEAN DEFAULT false
    `);
    
    await client.query('COMMIT');
    console.log('✓ Migration 017: Added GitHub webhook columns to servers table');
  } catch (error) {
    await client.query('ROLLBACK');
    // Check if columns already exist
    if (error.code === '42701') {
      console.log('Migration 017: Columns already exist, skipping');
    } else {
      throw error;
    }
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE servers DROP COLUMN IF EXISTS github_webhook_secret');
    await client.query('ALTER TABLE servers DROP COLUMN IF EXISTS auto_deploy_enabled');
    await client.query('COMMIT');
    console.log('✓ Migration 017 rolled back');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };

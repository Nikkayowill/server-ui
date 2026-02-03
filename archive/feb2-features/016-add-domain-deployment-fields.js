// Migration: Add deployment-related fields to domains table
// Each domain can now have its own git repo and auto-deploy settings

const pool = require('../db');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add git_url column - the repo to deploy for this domain
    await client.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS git_url VARCHAR(500)
    `);
    
    // Add auto_deploy_enabled - whether webhook triggers deploy
    await client.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS auto_deploy_enabled BOOLEAN DEFAULT false
    `);
    
    // Add webhook_secret - unique secret for this domain's webhook
    await client.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(100)
    `);
    
    // Add last_deployed_at - track when this domain was last deployed
    await client.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMP
    `);
    
    // Add deployment_status - current status of this domain's deployment
    await client.query(`
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(50) DEFAULT 'pending'
    `);
    
    await client.query('COMMIT');
    console.log('[MIGRATION] Added deployment fields to domains table');
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
    
    await client.query('ALTER TABLE domains DROP COLUMN IF EXISTS git_url');
    await client.query('ALTER TABLE domains DROP COLUMN IF EXISTS auto_deploy_enabled');
    await client.query('ALTER TABLE domains DROP COLUMN IF EXISTS webhook_secret');
    await client.query('ALTER TABLE domains DROP COLUMN IF EXISTS last_deployed_at');
    await client.query('ALTER TABLE domains DROP COLUMN IF EXISTS deployment_status');
    
    await client.query('COMMIT');
    console.log('[MIGRATION] Removed deployment fields from domains table');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };

// Run directly if called as script
if (require.main === module) {
  up().then(() => {
    console.log('Migration complete');
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

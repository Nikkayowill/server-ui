require('dotenv').config();
const pool = require('../db');

async function updateServerConstraints() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Updating servers table constraints...');
    
    // Clean up any invalid status values before adding constraint
    const invalidStatusResult = await client.query(`
      UPDATE servers
      SET status = 'error'
      WHERE status NOT IN ('provisioning', 'running', 'stopped', 'error', 'failed', 'deleted');
    `);
    console.log(`Fixed ${invalidStatusResult.rowCount} servers with invalid status`);
    
    // Drop old status constraint
    await client.query(`
      ALTER TABLE servers
      DROP CONSTRAINT IF EXISTS servers_status_check;
    `);
    
    // Add new status constraint with 'failed' and 'deleted'
    await client.query(`
      ALTER TABLE servers
      ADD CONSTRAINT servers_status_check
      CHECK (status IN ('provisioning', 'running', 'stopped', 'error', 'failed', 'deleted'));
    `);
    
    console.log('✓ Status constraint updated');
    
    // Clean up any invalid plan values before adding constraint
    const invalidPlanResult = await client.query(`
      UPDATE servers
      SET plan = 'basic'
      WHERE plan NOT IN ('basic', 'priority', 'premium', 'founder');
    `);
    console.log(`Fixed ${invalidPlanResult.rowCount} servers with invalid plan`);
    
    // Drop old plan constraint
    await client.query(`
      ALTER TABLE servers
      DROP CONSTRAINT IF EXISTS servers_plan_check;
    `);
    
    // Add new plan constraint with 'founder'
    await client.query(`
      ALTER TABLE servers
      ADD CONSTRAINT servers_plan_check
      CHECK (plan IN ('basic', 'priority', 'premium', 'founder'));
    `);
    
    console.log('✓ Plan constraint updated');
    
    await client.query('COMMIT');
    console.log('Migration 007 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 007 failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

updateServerConstraints()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });

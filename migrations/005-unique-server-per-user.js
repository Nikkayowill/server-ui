require('dotenv').config();
const pool = require('../db');

async function addUniqueServerConstraint() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding UNIQUE constraint to prevent duplicate active servers per user...');
    
    // Create partial unique index - allows multiple deleted/failed servers but only one active per user
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS servers_user_plan_active 
      ON servers(user_id, plan) 
      WHERE status NOT IN ('deleted', 'failed')
    `);
    
    console.log('✓ Unique constraint added successfully');
    
    await client.query('COMMIT');
    console.log('Migration 005 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 005 failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

addUniqueServerConstraint()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });

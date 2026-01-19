require('dotenv').config();
const pool = require('../db');

async function addDomainsUserId() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding user_id column to domains table...');
    
    // Add user_id column if it doesn't exist (nullable to allow existing rows)
    await client.query(`
      ALTER TABLE domains
      ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);
    
    // Clean up any orphaned domains without user_id
    const orphanedResult = await client.query(`
      DELETE FROM domains WHERE user_id IS NULL;
    `);
    console.log(`Cleaned up ${orphanedResult.rowCount} orphaned domains without user_id`);
    
    // Add NOT NULL constraint after cleanup
    await client.query(`
      ALTER TABLE domains
      ALTER COLUMN user_id SET NOT NULL;
    `);
    
    // Add foreign key constraint
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'domains_user_id_fkey'
        ) THEN
          ALTER TABLE domains
          ADD CONSTRAINT domains_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
    `);
    
    console.log('✓ user_id column added to domains table');
    
    await client.query('COMMIT');
    console.log('Migration 006 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 006 failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

addDomainsUserId()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });

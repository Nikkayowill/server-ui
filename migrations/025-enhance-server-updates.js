require('dotenv').config();
const pool = require('../db');

/**
 * Migration 025: Enhance Server Updates for Secure Workflow
 * 
 * Adds:
 * - status workflow: draft → tested → released → archived
 * - script_hash for immutability verification
 * - test tracking fields
 * - global kill switch
 * - enhanced logging
 */

exports.up = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add status workflow and script hash to server_updates
    // Using ON DELETE SET NULL so user/server deletions don't cascade
    await client.query(`
      ALTER TABLE server_updates 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS script_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS tested_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS tested_on_server_id INTEGER REFERENCES servers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS released_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS released_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    
    // Create index on status for faster filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_server_updates_status ON server_updates(status)
    `);
    
    // Table for test execution results (before mass rollout)
    await client.query(`
      CREATE TABLE IF NOT EXISTS server_update_tests (
        id SERIAL PRIMARY KEY,
        update_id INTEGER NOT NULL REFERENCES server_updates(id) ON DELETE CASCADE,
        server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        tested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        exit_code INTEGER,
        execution_time_ms INTEGER,
        stdout TEXT,
        stderr TEXT,
        success BOOLEAN DEFAULT FALSE,
        tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Indexes for server_update_tests
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_update_tests_update_id ON server_update_tests(update_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_update_tests_server_id ON server_update_tests(server_id)
    `);
    
    // Enhanced server_update_log with more details
    await client.query(`
      ALTER TABLE server_update_log
      ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS exit_code INTEGER,
      ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
      ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS error_category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(20) DEFAULT 'manual'
    `);
    
    // Global system settings for kill switch
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Initialize kill switch as OFF
    await client.query(`
      INSERT INTO system_settings (key, value) 
      VALUES ('updates_kill_switch', 'false')
      ON CONFLICT (key) DO NOTHING
    `);
    
    // Rate limit tracking
    await client.query(`
      INSERT INTO system_settings (key, value) 
      VALUES ('updates_rate_limit', '5')
      ON CONFLICT (key) DO NOTHING
    `);
    
    await client.query('COMMIT');
    console.log('✓ Enhanced server_updates schema with workflow and security features');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Migration 025 failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

exports.down = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Remove added columns from server_updates
    await client.query(`
      ALTER TABLE server_updates 
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS script_hash,
      DROP COLUMN IF EXISTS tested_at,
      DROP COLUMN IF EXISTS tested_on_server_id,
      DROP COLUMN IF EXISTS released_at,
      DROP COLUMN IF EXISTS released_by
    `);
    
    // Remove added columns from server_update_log
    await client.query(`
      ALTER TABLE server_update_log
      DROP COLUMN IF EXISTS start_time,
      DROP COLUMN IF EXISTS end_time,
      DROP COLUMN IF EXISTS exit_code,
      DROP COLUMN IF EXISTS execution_time_ms,
      DROP COLUMN IF EXISTS retry_count,
      DROP COLUMN IF EXISTS error_category,
      DROP COLUMN IF EXISTS triggered_by,
      DROP COLUMN IF EXISTS trigger_type
    `);
    
    await client.query('DROP TABLE IF EXISTS server_update_tests CASCADE');
    await client.query('DROP TABLE IF EXISTS system_settings CASCADE');
    
    await client.query('COMMIT');
    console.log('✓ Reverted server_updates schema enhancements');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Migration 025 rollback failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const pool = require('../db');

/**
 * Add database credentials columns to servers table
 * These store the auto-generated credentials from one-click database setup
 */
exports.up = async () => {
  await pool.query(`
    ALTER TABLE servers
    ADD COLUMN IF NOT EXISTS postgres_db_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS postgres_db_user VARCHAR(255),
    ADD COLUMN IF NOT EXISTS postgres_db_password VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mongodb_db_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mongodb_db_user VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mongodb_db_password VARCHAR(255)
  `);
  
  console.log('✓ Added database credentials columns to servers table');
};

exports.down = async () => {
  await pool.query(`
    ALTER TABLE servers
    DROP COLUMN IF EXISTS postgres_db_name,
    DROP COLUMN IF EXISTS postgres_db_user,
    DROP COLUMN IF EXISTS postgres_db_password,
    DROP COLUMN IF EXISTS mongodb_db_name,
    DROP COLUMN IF EXISTS mongodb_db_user,
    DROP COLUMN IF EXISTS mongodb_db_password
  `);
  
  console.log('✓ Removed database credentials columns from servers table');
};

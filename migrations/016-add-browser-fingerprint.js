const pool = require('../db');

async function run() {
  try {
    // Add browser_fingerprint column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS browser_fingerprint VARCHAR(64);
    `);
    console.log('Added browser_fingerprint column to users table');
    
    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_browser_fingerprint 
      ON users(browser_fingerprint) 
      WHERE browser_fingerprint IS NOT NULL;
    `);
    console.log('Created index on browser_fingerprint');
    
  } catch (error) {
    // Ignore if column already exists
    if (error.code === '42701') {
      console.log('browser_fingerprint column already exists');
    } else {
      throw error;
    }
  }
}

module.exports = { run };

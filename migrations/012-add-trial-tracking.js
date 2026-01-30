require('dotenv').config();
const pool = require('../db');

async function addTrialTracking() {
  try {
    // Add trial tracking to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(45),
      ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMP;
    `);
    console.log('Added trial tracking columns to users table');
    
    // Add trial flag to servers table
    await pool.query(`
      ALTER TABLE servers
      ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
    `);
    console.log('Added is_trial column to servers table');
    
    // Create index for IP-based trial abuse prevention
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_signup_ip ON users(signup_ip);
    `);
    console.log('Created index on signup_ip');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding trial tracking:', error);
    process.exit(1);
  }
}

addTrialTracking();

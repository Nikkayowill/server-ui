/**
 * Migration: Add Stripe subscription tracking
 * - stripe_subscription_id on servers table
 * - refund_used on users table  
 * - subscription_start_date on servers table
 */

const pool = require('../db');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add stripe_subscription_id to servers
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
    `);
    
    // Add subscription_start_date to servers (for 30-day refund window)
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    // Add refund_used to users (one refund per lifetime)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS refund_used BOOLEAN DEFAULT FALSE
    `);
    
    // Add cancelled_at to servers (when they cancelled)
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP
    `);
    
    await client.query('COMMIT');
    console.log('[Migration 016] Added Stripe subscription tracking columns');
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
    await client.query('ALTER TABLE servers DROP COLUMN IF EXISTS stripe_subscription_id');
    await client.query('ALTER TABLE servers DROP COLUMN IF EXISTS subscription_start_date');
    await client.query('ALTER TABLE servers DROP COLUMN IF EXISTS cancelled_at');
    await client.query('ALTER TABLE users DROP COLUMN IF EXISTS refund_used');
    await client.query('COMMIT');
    console.log('[Migration 016] Removed Stripe subscription tracking columns');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };

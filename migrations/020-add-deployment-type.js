/**
 * Migration 020: Add deployment_type column to deployments table
 * 
 * This column explicitly stores what type of deployment it is:
 * - 'static': React, Vue, plain HTML - served directly from disk
 * - 'node': Node.js backend apps - proxied to a port
 * 
 * This enables deterministic NGINX config generation without guessing.
 */

const pool = require('../db');

async function run() {
  try {
    // Check if column exists
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'deployments' AND column_name = 'deployment_type'
    `);
    
    if (check.rows.length === 0) {
      // Add deployment_type column with default 'static' (most common)
      await pool.query(`
        ALTER TABLE deployments 
        ADD COLUMN deployment_type VARCHAR(20) DEFAULT 'static' 
        CHECK (deployment_type IN ('static', 'node'))
      `);
      console.log('[MIGRATION 020] Added deployment_type column to deployments table');
      
      // Add port column for node apps (which port they run on)
      await pool.query(`
        ALTER TABLE deployments 
        ADD COLUMN IF NOT EXISTS app_port INTEGER DEFAULT NULL
      `);
      console.log('[MIGRATION 020] Added app_port column for node deployments');
    } else {
      console.log('[MIGRATION 020] deployment_type column already exists');
    }
  } catch (error) {
    console.error('[MIGRATION 020] Error:', error.message);
  }
}

module.exports = { run };

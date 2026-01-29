const pool = require('../db');

/**
 * Auto-run migrations on application startup
 * Checks if columns exist before adding them (idempotent)
 */
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('[MIGRATION] Checking database schema...');
    
    // Check if postgres_installed and mongodb_installed columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'servers' 
      AND column_name IN ('postgres_installed', 'mongodb_installed')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const needsPostgres = !existingColumns.includes('postgres_installed');
    const needsMongodb = !existingColumns.includes('mongodb_installed');
    
    if (needsPostgres || needsMongodb) {
      console.log('[MIGRATION] Adding missing database columns...');
      
      await client.query('BEGIN');
      
      if (needsPostgres) {
        await client.query(`
          ALTER TABLE servers 
          ADD COLUMN postgres_installed BOOLEAN DEFAULT FALSE
        `);
        console.log('[MIGRATION] ✓ Added postgres_installed column');
      }
      
      if (needsMongodb) {
        await client.query(`
          ALTER TABLE servers 
          ADD COLUMN mongodb_installed BOOLEAN DEFAULT FALSE
        `);
        console.log('[MIGRATION] ✓ Added mongodb_installed column');
      }
      
      await client.query('COMMIT');
      console.log('[MIGRATION] Database schema updated successfully');
    } else {
      console.log('[MIGRATION] Database schema is up to date');
    }

    // Run additional migrations
    const { addPasswordResetTokens } = require('./009-add-password-reset-tokens');
    await addPasswordResetTokens();
    
    const { up: addDatabaseCredentials } = require('./011-add-database-credentials');
    await addDatabaseCredentials();
    
  } catch (error) {
    // Safely rollback transaction (may not have started if error was early)
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Transaction not started - safe to ignore
    }
    console.error('[MIGRATION] Error running migrations:', error.message);
    // Don't crash the app - log error and continue
    // Worst case: database features won't work until manual fix
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };

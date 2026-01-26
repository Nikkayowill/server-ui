const pool = require('../db');

async function addPasswordResetTokens() {
  try {
    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('reset_token', 'reset_token_expires')
    `);

    if (checkColumns.rows.length === 0) {
      console.log('[MIGRATION 009] Adding password reset token columns...');
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token VARCHAR(255),
        ADD COLUMN reset_token_expires TIMESTAMP
      `);
      
      console.log('[MIGRATION 009] ✅ Password reset columns added successfully');
    } else {
      console.log('[MIGRATION 009] Password reset columns already exist');
    }
  } catch (error) {
    console.error('[MIGRATION 009] Failed to add password reset columns:', error.message);
    throw error;
  }
}

module.exports = { addPasswordResetTokens };

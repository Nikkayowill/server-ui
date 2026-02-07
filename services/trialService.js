/**
 * Trial Service
 * Handles trial status checks for users
 */

const pool = require('../db');

/**
 * Get trial status for a user
 * @param {number|null} userId - User ID from session, or null if not logged in
 * @returns {Promise<{isLoggedIn: boolean, trialUsed: boolean}>}
 */
async function getTrialStatus(userId) {
  if (!userId) {
    return { isLoggedIn: false, trialUsed: false };
  }
  
  try {
    const result = await pool.query(
      'SELECT trial_used FROM users WHERE id = $1', 
      [userId]
    );
    return {
      isLoggedIn: true,
      trialUsed: result.rows[0]?.trial_used ?? false
    };
  } catch (err) {
    console.error('Error checking trial status:', err);
    return { isLoggedIn: true, trialUsed: false };
  }
}

module.exports = { getTrialStatus };

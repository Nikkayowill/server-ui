require('dotenv').config();
const pool = require('../db');

async function addTermsAcceptance() {
  const query = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
  `;

  try {
    await pool.query(query);
    console.log('Terms acceptance column added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding terms acceptance column:', error);
    process.exit(1);
  }
}

addTermsAcceptance();

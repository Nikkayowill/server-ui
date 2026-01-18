require('dotenv').config();
const pool = require('../db');

async function addUserColumns() {
  const queries = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_token VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;`
  ];

  try {
    for (const query of queries) {
      await pool.query(query);
    }
    console.log('User table columns added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding user columns:', error);
    process.exit(1);
  }
}

addUserColumns();

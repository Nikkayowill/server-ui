require('dotenv').config();
const pool = require('./db');

async function createSessionTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      PRIMARY KEY (sid)
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);
  `;
  
  try {
    await pool.query(query);
    console.log('Session table created successfully');
  } catch (error) {
    console.error('Error creating session table:', error);
  } finally {
    pool.end();
  }
}

createSessionTable();

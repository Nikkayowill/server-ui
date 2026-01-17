require('dotenv').config();
const pool = require('./db');

async function createUsersTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error);
  } finally {
    pool.end();
  }
}

createUsersTable();

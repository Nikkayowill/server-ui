require('dotenv').config();
const pool = require('../db');

async function createDomainsTable() {
  try {
    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        provider VARCHAR(100) DEFAULT 'hostinger',
        renewal_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_domains_provider ON domains(provider);`);
    
    console.log('Domains table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating domains table:', error);
    process.exit(1);
  }
}

createDomainsTable();

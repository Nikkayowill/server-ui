require('dotenv').config();
const pool = require('../db');

exports.up = async () => {
  // Table for available updates/patches that can be pushed to servers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_updates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        script TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'config',
        version VARCHAR(50),
        is_critical BOOLEAN DEFAULT FALSE,
        auto_apply BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
    )
  `);
  
  // Track which servers have received which updates
  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_update_log (
        id SERIAL PRIMARY KEY,
        server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        update_id INTEGER NOT NULL REFERENCES server_updates(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        output TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        applied_by VARCHAR(50) DEFAULT 'user',
        UNIQUE(server_id, update_id)
    )
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_update_log_server_id ON server_update_log(server_id)
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_update_log_update_id ON server_update_log(update_id)
  `);
  
  console.log('✓ Created server_updates and server_update_log tables');
};

exports.down = async () => {
  await pool.query('DROP TABLE IF EXISTS server_update_log CASCADE');
  await pool.query('DROP TABLE IF EXISTS server_updates CASCADE');
  console.log('✓ Dropped server_updates and server_update_log tables');
};

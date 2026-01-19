const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool settings for reliability
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
});

// Global error handler for pool errors (prevents crashes)
pool.on('error', (err, client) => {
  console.error('Unexpected database pool error:', err);
  console.error('Client info:', {
    processID: client?.processID,
    database: client?.database
  });
  // Don't exit process - let connection pool handle recovery
});

// Connection event for monitoring
pool.on('connect', (client) => {
  console.log('New database client connected');
});

// Log when clients are removed
pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

module.exports = pool;

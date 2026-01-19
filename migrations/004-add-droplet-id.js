require('dotenv').config();
const pool = require('../db');

async function addDropletIdColumn() {
  try {
    await pool.query(`
      ALTER TABLE servers
      ADD COLUMN IF NOT EXISTS droplet_id VARCHAR(50);
    `);
    console.log('Added droplet_id column to servers table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding droplet_id column:', error);
    process.exit(1);
  }
}

addDropletIdColumn();

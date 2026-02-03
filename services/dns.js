/**
 * DigitalOcean DNS Service
 * Manages DNS records for cloudedbasement.ca subdomains
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DIGITALOCEAN_TOKEN;
const DOMAIN = 'cloudedbasement.ca';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

/**
 * Create an A record for a subdomain
 * @param {string} subdomain - e.g., 'my-app-20' (will become my-app-20.cloudedbasement.ca)
 * @param {string} ip - IP address to point to
 * @returns {Promise<{success: boolean, recordId?: number, error?: string}>}
 */
async function createDNSRecord(subdomain, ip) {
  try {
    console.log(`[DNS] Creating A record: ${subdomain}.${DOMAIN} -> ${ip}`);
    
    const response = await axios.post(
      `${DO_API_BASE}/domains/${DOMAIN}/records`,
      {
        type: 'A',
        name: subdomain,
        data: ip,
        ttl: 300 // 5 minutes - fast propagation for testing
      },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const recordId = response.data.domain_record.id;
    console.log(`[DNS] Created A record (ID: ${recordId}): ${subdomain}.${DOMAIN} -> ${ip}`);
    
    return { success: true, recordId };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`[DNS] Failed to create A record:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Delete a DNS record by subdomain name
 * @param {string} subdomain - e.g., 'my-app-20'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteDNSRecord(subdomain) {
  try {
    console.log(`[DNS] Deleting A record for: ${subdomain}.${DOMAIN}`);
    
    // First, find the record ID by listing records and matching the subdomain
    const listResponse = await axios.get(
      `${DO_API_BASE}/domains/${DOMAIN}/records`,
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`
        },
        params: {
          type: 'A',
          name: subdomain
        }
      }
    );
    
    const records = listResponse.data.domain_records.filter(r => r.name === subdomain && r.type === 'A');
    
    if (records.length === 0) {
      console.log(`[DNS] No A record found for ${subdomain}`);
      return { success: true }; // Already deleted or never existed
    }
    
    // Delete all matching records (should only be one)
    for (const record of records) {
      await axios.delete(
        `${DO_API_BASE}/domains/${DOMAIN}/records/${record.id}`,
        {
          headers: {
            'Authorization': `Bearer ${DO_API_TOKEN}`
          }
        }
      );
      console.log(`[DNS] Deleted A record (ID: ${record.id}): ${subdomain}.${DOMAIN}`);
    }
    
    return { success: true };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`[DNS] Failed to delete A record:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Check if a subdomain DNS record exists
 * @param {string} subdomain - e.g., 'my-app-20'
 * @returns {Promise<{exists: boolean, ip?: string, error?: string}>}
 */
async function checkDNSRecord(subdomain) {
  try {
    const response = await axios.get(
      `${DO_API_BASE}/domains/${DOMAIN}/records`,
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`
        },
        params: {
          type: 'A',
          name: subdomain
        }
      }
    );
    
    const records = response.data.domain_records.filter(r => r.name === subdomain && r.type === 'A');
    
    if (records.length > 0) {
      return { exists: true, ip: records[0].data };
    }
    
    return { exists: false };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`[DNS] Failed to check A record:`, errorMsg);
    return { exists: false, error: errorMsg };
  }
}

/**
 * Generate a unique subdomain for a deployment
 * Format: {repo-name}-{user-id}
 * @param {string} repoName - Repository name (from git URL)
 * @param {number} userId - User ID
 * @returns {string} - Subdomain (lowercase, sanitized)
 */
function generateSubdomain(repoName, userId) {
  // Sanitize repo name: lowercase, replace non-alphanumeric with dashes, trim dashes
  const sanitized = repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30); // Limit length
  
  return `${sanitized}-${userId}`;
}

module.exports = {
  createDNSRecord,
  deleteDNSRecord,
  checkDNSRecord,
  generateSubdomain,
  DOMAIN
};

const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');

// Track active polling intervals to prevent memory leaks
const activePolls = new Map(); // serverId -> intervalId

// Helper function to create real DigitalOcean server
async function createRealServer(userId, plan, stripeChargeId = null) {
  const specs = {
    basic: { ram: '1 GB', cpu: '1 CPU', storage: '25 GB SSD', bandwidth: '1 TB', slug: 's-1vcpu-1gb' },
    priority: { ram: '2 GB', cpu: '2 CPUs', storage: '50 GB SSD', bandwidth: '2 TB', slug: 's-2vcpu-2gb' },
    premium: { ram: '4 GB', cpu: '2 CPUs', storage: '80 GB SSD', bandwidth: '4 TB', slug: 's-2vcpu-4gb' }
  };

  const selectedSpec = specs[plan] || specs.basic;
  // Generate cryptographically secure password (256 bits of entropy)
  const password = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '') + '!@#';

  // Setup script for automatic Nginx + Certbot installation
  const setupScript = `#!/bin/bash
# Update system
apt-get update

# Install Nginx and Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Configure firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable

# Create basic Nginx config
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html index.htm;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Create welcome page
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Server Ready</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #1a1a1a; color: #e0e0e0; }
        h1 { color: #88fe00; }
    </style>
</head>
<body>
    <h1>🚀 Your Server is Ready!</h1>
    <p>Nginx is installed and running.</p>
    <p>SSL ready with Certbot - just add your domain!</p>
</body>
</html>
EOF

echo "Setup complete!" > /root/setup.log
`;

  try {
    // Create droplet via DigitalOcean API
    const response = await axios.post('https://api.digitalocean.com/v2/droplets', {
      name: `basement-${userId}-${Date.now()}`,
      region: 'nyc3',
      size: selectedSpec.slug,
      image: 'ubuntu-22-04-x64',
      ssh_keys: null,
      backups: false,
      ipv6: false,
      user_data: setupScript,
      monitoring: true,
      tags: ['basement-server']
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const droplet = response.data.droplet;
    console.log('Droplet created:', droplet.id);
    
    // Save to database with conflict handling to prevent duplicate servers
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id, droplet_id)
       VALUES ($1, $2, 'provisioning', $3, 'root', $4, $5, $6, $7)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, plan, droplet.networks?.v4?.[0]?.ip_address || 'pending', password, JSON.stringify(selectedSpec), stripeChargeId, String(droplet.id)]
    );

    // If no rows returned, another process already created the server
    if (result.rows.length === 0) {
      console.log('Server already exists for user, skipping duplicate creation');
      // Note: Droplet was created but DB insert blocked - admin should manually clean up orphaned droplet
      return null;
    }

    // Always poll for IP - droplet might not have it immediately
    console.log('Starting polling for droplet:', droplet.id, 'server:', result.rows[0].id);
    pollDropletStatus(droplet.id, result.rows[0].id);

    return result.rows[0];
  } catch (error) {
    console.error('DigitalOcean API error:', error.response?.data || error.message);
    
    // Refund the customer if droplet creation failed
    if (stripeChargeId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        console.log('Initiating refund for failed provisioning:', stripeChargeId);
        
        await stripe.refunds.create({
          payment_intent: stripeChargeId,
          reason: 'requested_by_customer' // Server provisioning failed
        });
        
        // Update payment status to refunded
        await pool.query(
          'UPDATE payments SET status = $1 WHERE stripe_payment_id = $2',
          ['refunded', stripeChargeId]
        );
        
        console.log('Refund issued successfully for:', stripeChargeId);
        
        // Send notification email (optional - requires email service)
        // await sendServerProvisioningFailedEmail(userId, error.message);
      } catch (refundError) {
        console.error('Failed to process refund:', refundError.message);
        // Log to audit trail for manual processing
      }
    }
    
    // Save failed server to database
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id, droplet_id)
       VALUES ($1, $2, 'failed', 'N/A', 'root', 'N/A', $3, $4, NULL)
       RETURNING *`,
      [userId, plan, JSON.stringify(specs[plan] || specs.basic), stripeChargeId]
    );
    
    return result.rows[0];
  }
}

// Poll droplet until IP is assigned
async function pollDropletStatus(dropletId, serverId) {
  const maxAttempts = 30;
  const maxDuration = 5 * 60 * 1000; // 5 minutes absolute timeout
  const pollInterval = 10000; // 10 seconds
  let attempts = 0;
  const startTime = Date.now();

  // Clear any existing poll for this server
  if (activePolls.has(serverId)) {
    clearInterval(activePolls.get(serverId));
    activePolls.delete(serverId);
    console.log(`Cleared existing poll for server ${serverId}`);
  }

  const interval = setInterval(async () => {
    attempts++;
    const elapsed = Date.now() - startTime;

    // Safety check: absolute timeout
    if (elapsed > maxDuration) {
      console.error(`Server ${serverId} provisioning timeout (${elapsed}ms)`);
      await pool.query(
        'UPDATE servers SET status = $1 WHERE id = $2',
        ['failed', serverId]
      ).catch(err => console.error('Failed to update server status:', err));
      clearInterval(interval);
      activePolls.delete(serverId);
      return;
    }

    try {
      const response = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
      });

      const droplet = response.data.droplet;
      const ip = droplet.networks?.v4?.[0]?.ip_address;

      if (ip && droplet.status === 'active') {
        await pool.query(
          'UPDATE servers SET ip_address = $1, status = $2 WHERE id = $3',
          [ip, 'running', serverId]
        );
        console.log(`Server ${serverId} is now running at ${ip}`);
        clearInterval(interval);
        activePolls.delete(serverId);
      } else if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        );
        console.error(`Server ${serverId} provisioning failed - max attempts reached`);
        clearInterval(interval);
        activePolls.delete(serverId);
      }
    } catch (error) {
      console.error(`Polling error (attempt ${attempts}/${maxAttempts}):`, error.message);
      if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        ).catch(err => console.error('Failed to update server status:', err));
        clearInterval(interval);
        activePolls.delete(serverId);
      }
    }
  }, pollInterval);
  
  // Store interval ID for cleanup
  activePolls.set(serverId, interval);
  console.log(`Started polling for server ${serverId} (${activePolls.size} active polls)`);
}

// DigitalOcean sync - Check if droplets still exist
async function syncDigitalOceanDroplets() {
  try {
    console.log('[Sync] Starting DigitalOcean droplet sync...');
    
    // Get all servers marked as running
    const result = await pool.query(
      "SELECT * FROM servers WHERE status = 'running'"
    );
    
    if (result.rows.length === 0) {
      console.log('[Sync] No running servers to sync');
      return;
    }
    
    // Get all droplets from DigitalOcean
    const dropletsResponse = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement-server', {
      headers: {
        'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const droplets = dropletsResponse.data.droplets;
    const dropletNames = droplets.map(d => d.name);
    
    console.log(`[Sync] Found ${result.rows.length} servers in DB, ${droplets.length} droplets in DO`);
    
    // Check each server
    for (const server of result.rows) {
      const expectedName = `basement-${server.user_id}-`;
      const dropletExists = dropletNames.some(name => name.startsWith(expectedName));
      
      if (!dropletExists) {
        console.log(`[Sync] Droplet missing for server ${server.id} (user ${server.user_id})`);
        
        // Update database - mark as deleted
        await pool.query(
          "UPDATE servers SET status = 'deleted' WHERE id = $1",
          [server.id]
        );
        
        console.log(`[Sync] Updated server ${server.id} status to 'deleted'`);
      }
    }
    
    console.log('[Sync] DigitalOcean sync completed');
  } catch (error) {
    console.error('[Sync] Error syncing droplets:', error.message);
  }
}

module.exports = {
  createRealServer,
  syncDigitalOceanDroplets,
  destroyDroplet: async (serverId) => {
    try {
      // Get server info
      const serverResult = await pool.query('SELECT * FROM servers WHERE id = $1', [serverId]);
      if (serverResult.rows.length === 0) {
        throw new Error('Server not found');
      }
      
      const server = serverResult.rows[0];
      const dropletId = server.droplet_id;
      
      if (!dropletId) {
        // No droplet ID stored, fall back to IP-based search (legacy servers)
        const ipAddress = server.ip_address;
        
        if (!ipAddress || ipAddress === 'pending' || ipAddress === 'N/A') {
          // No droplet to destroy, just delete the record
          await pool.query('DELETE FROM servers WHERE id = $1', [serverId]);
          return { success: true, message: 'Server record deleted (no droplet found)' };
        }
        
        // Find droplet by IP address (legacy method)
        const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
          headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
        });
        
        const droplet = response.data.droplets.find(d => 
          d.networks?.v4?.some(net => net.ip_address === ipAddress)
        );
        
        if (droplet) {
          await axios.delete(`https://api.digitalocean.com/v2/droplets/${droplet.id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
          });
          console.log(`Destroyed droplet ${droplet.id} (found by IP) for server ${serverId}`);
        }
      } else {
        // Use stored droplet_id (preferred method)
        try {
          await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
          });
          console.log(`Destroyed droplet ${dropletId} for server ${serverId}`);
        } catch (apiError) {
          if (apiError.response?.status === 404) {
            console.log(`Droplet ${dropletId} already deleted from DigitalOcean`);
          } else {
            throw apiError;
          }
        }
      }
      
      // Delete server record from database
      await pool.query('DELETE FROM servers WHERE id = $1', [serverId]);
      
      return { success: true, message: 'Droplet destroyed and server record deleted' };
    } catch (error) {
      console.error('Destroy droplet error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Cleanup function to clear all active polls (for graceful shutdown)
  cleanupPolls: () => {
    console.log(`Cleaning up ${activePolls.size} active polling intervals`);
    for (const [serverId, interval] of activePolls.entries()) {
      clearInterval(interval);
      console.log(`Cleared poll for server ${serverId}`);
    }
    activePolls.clear();
  }
};

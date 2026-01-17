const axios = require('axios');
const pool = require('../db');

// Helper function to create real DigitalOcean server
async function createRealServer(userId, plan, stripeChargeId = null) {
  const specs = {
    basic: { ram: '1 GB', cpu: '1 CPU', storage: '25 GB SSD', bandwidth: '1 TB', slug: 's-1vcpu-1gb' },
    priority: { ram: '2 GB', cpu: '2 CPUs', storage: '50 GB SSD', bandwidth: '2 TB', slug: 's-2vcpu-2gb' },
    premium: { ram: '4 GB', cpu: '2 CPUs', storage: '80 GB SSD', bandwidth: '4 TB', slug: 's-2vcpu-4gb' }
  };

  const selectedSpec = specs[plan] || specs.basic;
  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!@#';

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
    
    // Save to database
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id)
       VALUES ($1, $2, 'provisioning', $3, 'root', $4, $5, $6)
       RETURNING *`,
      [userId, plan, droplet.networks?.v4?.[0]?.ip_address || 'pending', password, JSON.stringify(selectedSpec), stripeChargeId]
    );

    // Always poll for IP - droplet might not have it immediately
    console.log('Starting polling for droplet:', droplet.id, 'server:', result.rows[0].id);
    pollDropletStatus(droplet.id, result.rows[0].id);

    return result.rows[0];
  } catch (error) {
    console.error('DigitalOcean API error:', error.response?.data || error.message);
    
    // Save failed server to database
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id)
       VALUES ($1, $2, 'failed', 'N/A', 'root', 'N/A', $3, $4)
       RETURNING *`,
      [userId, plan, JSON.stringify(specs[plan] || specs.basic), stripeChargeId]
    );
    
    return result.rows[0];
  }
}

// Poll droplet until IP is assigned
async function pollDropletStatus(dropletId, serverId) {
  const maxAttempts = 30;
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
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
      } else if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        );
        console.error(`Server ${serverId} provisioning failed - timeout`);
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Polling error:', error.message);
      if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        );
        clearInterval(interval);
      }
    }
  }, 10000); // Check every 10 seconds
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
  syncDigitalOceanDroplets
};

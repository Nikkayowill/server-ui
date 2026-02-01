const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');
const { sendServerReadyEmail } = require('./email');

// Track active polling intervals to prevent memory leaks
const activePolls = new Map(); // serverId -> intervalId

// Helper function to create real DigitalOcean server
async function createRealServer(userId, plan, stripeChargeId = null, paymentInterval = 'monthly') {
  // Check if user has trial available
  const userResult = await pool.query(
    'SELECT trial_used, email FROM users WHERE id = $1',
    [userId]
  );
  
  const isTrial = !stripeChargeId && !userResult.rows[0].trial_used;
  
  const specs = {
    basic: { ram: '1 GB', cpu: '1 CPU', storage: '25 GB SSD', bandwidth: '1 TB', slug: 's-1vcpu-1gb' },
    priority: { ram: '2 GB', cpu: '2 CPUs', storage: '50 GB SSD', bandwidth: '2 TB', slug: 's-2vcpu-2gb' },
    premium: { ram: '4 GB', cpu: '2 CPUs', storage: '80 GB SSD', bandwidth: '4 TB', slug: 's-2vcpu-4gb' }
  };

  // Site limits based on plan
  const siteLimits = {
    basic: 2,
    pro: 5,
    priority: 5, // legacy plan name
    premium: 10,
    founder: 10 // legacy plan
  };

  const selectedSpec = specs[plan] || specs.basic;
  const siteLimit = siteLimits[plan] || 2;
  // Generate cryptographically secure password (256 bits of entropy)
  const password = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '') + '!@#';

  // Setup script for automatic Nginx + Certbot installation
  const setupScript = `#!/bin/bash
# Set root password
echo "root:${password}" | chpasswd

# Enable password authentication for SSH
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
systemctl restart sshd

# Update system
apt-get update

# Install Node.js 20.x (default)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install nvm (Node Version Manager) for root user
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

# Install Git, Nginx, Certbot, wget, and Python pip
apt-get install -y git nginx certbot python3-certbot-nginx wget python3-pip

# Install Rust (cargo/rustc)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH="/root/.cargo/bin:$PATH"

# Install Go
wget -q https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
export PATH="$PATH:/usr/local/go/bin"
rm go1.21.6.linux-amd64.tar.gz

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
    // CRITICAL: Check if user already has a server BEFORE creating expensive droplet
    const existingServer = await pool.query(
      `SELECT id, status FROM servers WHERE user_id = $1 AND status NOT IN ('deleted', 'failed')`,
      [userId]
    );

    if (existingServer.rows.length > 0) {
      console.log(`User ${userId} already has active server (ID: ${existingServer.rows[0].id}, status: ${existingServer.rows[0].status})`);
      return existingServer.rows[0];
    }

    // Create droplet via DigitalOcean API (only after confirming no existing server)
    const dropletName = `basement-${userId}-${Date.now()}`;
    const enableBackups = plan === 'pro' || plan === 'premium'; // Backups only for Pro and Premium
    const response = await axios.post('https://api.digitalocean.com/v2/droplets', {
      name: dropletName,
      region: 'nyc3',
      size: selectedSpec.slug,
      image: 'ubuntu-22-04-x64',
      ssh_keys: null,
      backups: enableBackups,
      ipv6: true,
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
    console.log('Droplet created:', droplet.id, '(password hidden for security)');
    
    // Save to database - wrapped in try-catch to handle race condition
    try {
      const result = await pool.query(
        `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id, droplet_id, droplet_name, is_trial, payment_interval, site_limit)
         VALUES ($1, $2, 'provisioning', $3, 'root', $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [userId, plan, droplet.networks?.v4?.[0]?.ip_address || 'pending', password, JSON.stringify(selectedSpec), stripeChargeId, String(droplet.id), dropletName, isTrial, paymentInterval, siteLimit]
      );
      
      // If this is a trial server, mark trial as used
      if (isTrial) {
        await pool.query(
          'UPDATE users SET trial_used = true, trial_used_at = NOW() WHERE id = $1',
          [userId]
        );
        console.log(`Trial marked as used for user ${userId}`);
      }

      // Always poll for IP - droplet might not have it immediately
      console.log('Starting polling for droplet:', droplet.id, 'server:', result.rows[0].id);
      pollDropletStatus(droplet.id, result.rows[0].id);

      return result.rows[0];
    } catch (insertError) {
      // If INSERT failed due to race condition (unique constraint violation)
      if (insertError.code === '23505') {
        console.log(`Race condition detected: Another process created server for user ${userId}. Destroying orphaned droplet ${droplet.id}`);
        
        // Destroy the orphaned droplet we just created
        try {
          await axios.delete(`https://api.digitalocean.com/v2/droplets/${droplet.id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
          });
          console.log(`Orphaned droplet ${droplet.id} destroyed successfully`);
        } catch (deleteError) {
          console.error(`Failed to destroy orphaned droplet ${droplet.id}:`, deleteError.message);
        }
        
        // Return the existing server that won the race
        const existingServer = await pool.query(
          `SELECT * FROM servers WHERE user_id = $1 AND status NOT IN ('deleted', 'failed') LIMIT 1`,
          [userId]
        );
        return existingServer.rows[0];
      }
      
      // If it's a different error, re-throw it
      throw insertError;
    }
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
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id, droplet_id, is_trial)
       VALUES ($1, $2, 'failed', 'N/A', 'root', 'N/A', $3, $4, NULL, $5)
       RETURNING *`,
      [userId, plan, JSON.stringify(specs[plan] || specs.basic), stripeChargeId, isTrial]
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

  // Thread-safe check: prevent race condition if two polls start simultaneously
  const existingPoll = activePolls.get(serverId);
  if (existingPoll) {
    clearInterval(existingPoll);
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
      const ipv4 = droplet.networks?.v4?.[0]?.ip_address;
      const ipv6 = droplet.networks?.v6?.[0]?.ip_address;

      if (ipv4 && droplet.status === 'active') {
        await pool.query(
          'UPDATE servers SET ip_address = $1, ipv6_address = $2, status = $3 WHERE id = $4',
          [ipv4, ipv6, 'running', serverId]
        );
        console.log(`Server ${serverId} is now running at ${ipv4}${ipv6 ? ` (IPv6: ${ipv6})` : ''}`);
        
        // Send welcome email when server is ready
        try {
          const serverResult = await pool.query('SELECT user_id, hostname FROM servers WHERE id = $1', [serverId]);
          const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [serverResult.rows[0]?.user_id]);
          
          if (userResult.rows[0]?.email) {
            const serverName = serverResult.rows[0]?.hostname || 'cloudedbasement-server';
            await sendServerReadyEmail(userResult.rows[0].email, ipv4, ipv6, serverName);
            console.log(`Welcome email sent to ${userResult.rows[0].email}`);
          }
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError.message);
          // Don't fail provisioning if email fails
        }
        
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

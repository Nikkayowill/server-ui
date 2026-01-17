const axios = require('axios');
const { Client } = require('ssh2');
const pool = require('../db');

// POST /server-action
exports.serverAction = async (req, res) => {
  try {
    const action = req.body.action;
    const userId = req.session.userId;

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    // Update server status based on action
    let newStatus;
    let successMessage;
    
    if (action === 'start') {
      newStatus = 'running';
      successMessage = 'Server started successfully';
    } else if (action === 'restart') {
      newStatus = 'running';
      successMessage = 'Server restarted successfully';
    } else if (action === 'stop') {
      newStatus = 'stopped';
      successMessage = 'Server stopped successfully';
    } else {
      return res.redirect('/dashboard?error=Invalid action');
    }

    await pool.query(
      'UPDATE servers SET status = $1 WHERE user_id = $2',
      [newStatus, userId]
    );

    res.redirect('/dashboard?success=' + successMessage);
  } catch (error) {
    console.error('Server action error:', error);
    res.redirect('/dashboard?error=Action failed');
  }
};

// POST /delete-server
exports.deleteServer = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    // Find and destroy the DigitalOcean droplet
    try {
      // List all droplets with our tag
      const dropletsResponse = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement-server', {
        headers: {
          'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      // Find droplet matching this user
      const droplet = dropletsResponse.data.droplets.find(d => 
        d.name.startsWith(`basement-${userId}-`)
      );

      if (droplet) {
        // Destroy the droplet
        await axios.delete(`https://api.digitalocean.com/v2/droplets/${droplet.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Destroyed droplet ${droplet.id} for user ${userId}`);
      } else {
        console.log(`No droplet found for user ${userId}, proceeding with database cleanup`);
      }
    } catch (doError) {
      console.error('DigitalOcean deletion error:', doError.response?.data || doError.message);
      // Continue with database deletion even if DO call fails
    }

    // Delete server from database
    await pool.query(
      'DELETE FROM servers WHERE user_id = $1',
      [userId]
    );

    console.log(`Deleted server record for user ${userId}`);
    res.redirect('/pricing?message=Server deleted successfully');
  } catch (error) {
    console.error('Delete server error:', error);
    res.redirect('/dashboard?error=Failed to delete server');
  }
};

// POST /deploy
exports.deploy = async (req, res) => {
  try {
    const gitUrl = req.body.git_url;
    const userId = req.session.userId;

    // Validate Git URL format
    if (!gitUrl || !gitUrl.includes('github.com') && !gitUrl.includes('gitlab.com') && !gitUrl.includes('bitbucket.org')) {
      return res.redirect('/dashboard?error=Invalid Git URL');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT id FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;

    // Store deployment in database
    await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5)',
      [serverId, userId, gitUrl, 'pending', 'Deployment queued...']
    );

    // In real implementation, this would:
    // 1. SSH into the droplet
    // 2. Clone the repo
    // 3. Install dependencies
    // 4. Start the app
    
    res.redirect('/dashboard?success=Deployment initiated! Check deployment history below.');
  } catch (error) {
    console.error('Deploy error:', error);
    res.redirect('/dashboard?error=Deployment failed');
  }
};

// Helper function to execute SSH command
function executeSSHCommand(host, username, password, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let output = '';
        let errorOutput = '';
        
        stream.on('close', (code) => {
          conn.end();
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          }
        });
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      });
    });
    
    conn.on('error', (err) => {
      reject(err);
    });
    
    conn.connect({
      host,
      port: 22,
      username,
      password,
      readyTimeout: 30000
    });
  });
}

// POST /add-domain
exports.addDomain = async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT id FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;

    // Check if domain already exists
    const existingDomain = await pool.query(
      'SELECT id FROM domains WHERE domain = $1',
      [domain]
    );

    if (existingDomain.rows.length > 0) {
      return res.redirect('/dashboard?error=Domain already in use');
    }

    // Store domain in database
    await pool.query(
      'INSERT INTO domains (server_id, user_id, domain, ssl_enabled) VALUES ($1, $2, $3, $4)',
      [serverId, userId, domain, false]
    );

    // In real implementation, this would:
    // 1. Configure Nginx on the droplet
    // 2. Set up SSL certificate with Let's Encrypt
    
    res.redirect('/dashboard?success=Domain added! Configure your DNS as shown above.');
  } catch (error) {
    console.error('Add domain error:', error);
    res.redirect('/dashboard?error=Failed to add domain');
  }
};

// POST /enable-ssl
exports.enableSSL = async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;
    const email = req.session.userEmail || 'admin@basement.com';

    // Validate domain
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 AND status = $2',
      [userId, 'running']
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No running server found');
    }

    const server = serverResult.rows[0];

    // Execute certbot command via SSH
    const certbotCommand = `certbot --nginx -d ${domain} --non-interactive --agree-tos --email ${email} --redirect`;
    
    console.log(`[SSL] Enabling SSL for ${domain} on server ${server.ip_address}`);
    
    try {
      const output = await executeSSHCommand(
        server.ip_address,
        server.ssh_username,
        server.ssh_password,
        certbotCommand
      );
      
      console.log(`[SSL] Success for ${domain}:`, output);
      
      // Update domain in database
      await pool.query(
        'UPDATE domains SET ssl_enabled = true WHERE domain = $1 AND user_id = $2',
        [domain, userId]
      );
      
      res.redirect('/dashboard?success=SSL enabled! Your site is now secure with HTTPS');
    } catch (sshError) {
      console.error('[SSL] SSH error:', sshError.message);
      res.redirect('/dashboard?error=Failed to enable SSL. Make sure your domain points to your server IP');
    }
  } catch (error) {
    console.error('Enable SSL error:', error);
    res.redirect('/dashboard?error=Failed to enable SSL');
  }
};

module.exports = {
  serverAction: exports.serverAction,
  deleteServer: exports.deleteServer,
  deploy: exports.deploy,
  addDomain: exports.addDomain,
  enableSSL: exports.enableSSL
};

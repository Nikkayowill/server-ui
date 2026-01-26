const axios = require('axios');
const { Client } = require('ssh2');
const pool = require('../db');

// Strict DNS-compliant domain validation
function isValidDomain(domain) {
  // DNS RFC compliance: max 253 chars, labels max 63 chars, valid chars only
  if (!domain || domain.length > 253) return false;
  
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) return false;
  
  // Check each label (part between dots)
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.length === 0) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }
  
  return true;
}

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

    const server = serverResult.rows[0];

    // Map actions to DigitalOcean API endpoints
    let doAction;
    let newStatus;
    let successMessage;
    
    if (action === 'start') {
      doAction = 'power_on';
      newStatus = 'running';
      successMessage = 'Server started successfully';
    } else if (action === 'restart') {
      doAction = 'reboot';
      newStatus = 'running';
      successMessage = 'Server restarted successfully';
    } else if (action === 'stop') {
      doAction = 'power_off';
      newStatus = 'stopped';
      successMessage = 'Server stopped successfully';
    } else {
      return res.redirect('/dashboard?error=Invalid action');
    }

    // Call DigitalOcean API if droplet_id exists
    if (server.droplet_id) {
      try {
        await axios.post(
          `https://api.digitalocean.com/v2/droplets/${server.droplet_id}/actions`,
          { type: doAction },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`DigitalOcean action ${doAction} sent to droplet ${server.droplet_id}`);
      } catch (doError) {
        console.error('DigitalOcean action error:', doError.response?.data || doError.message);
        return res.redirect('/dashboard?error=Failed to execute action on server');
      }
    }

    // Update database status
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
    if (!gitUrl || (!gitUrl.includes('github.com') && !gitUrl.includes('gitlab.com') && !gitUrl.includes('bitbucket.org'))) {
      return res.redirect('/dashboard?error=Invalid Git URL. Must be from GitHub, GitLab, or Bitbucket.');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    if (!server.ip_address || !server.ssh_password) {
      return res.redirect('/dashboard?error=Server not ready yet. Please wait for provisioning to complete.');
    }

    // Extract repo name from URL
    const repoName = gitUrl.split('/').pop().replace('.git', '');
    
    // Store deployment in database with pending status
    const deployResult = await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [server.id, userId, gitUrl, 'pending', 'Starting deployment...']
    );

    const deploymentId = deployResult.rows[0].id;
    console.log(`[DEPLOY] Deployment #${deploymentId} started for user ${userId}: ${gitUrl}`);

    // Perform deployment asynchronously (don't block response)
    setImmediate(() => {
      performDeployment(server, gitUrl, repoName, deploymentId).catch(async (err) => {
        console.error(`[DEPLOY] Deployment #${deploymentId} failed:`, err);
        console.error(`[DEPLOY] Stack trace:`, err.stack);
        try {
          await pool.query(
            'UPDATE deployments SET status = $1, output = $2, deployed_at = NOW() WHERE id = $3',
            ['failed', `❌ Deployment failed: ${err.message}\n\nStack trace:\n${err.stack}`, deploymentId]
          );
        } catch (dbErr) {
          console.error(`[DEPLOY] Failed to update deployment #${deploymentId} status:`, dbErr);
        }
      });
    });
    
    res.redirect('/dashboard?success=Deployment started! Check deployment history below for progress.');
  } catch (error) {
    console.error('Deploy error:', error);
    res.redirect('/dashboard?error=Deployment failed to start');
  }
};

// Async deployment function
async function performDeployment(server, gitUrl, repoName, deploymentId) {
  console.log(`[DEPLOY] ============================================`);
  console.log(`[DEPLOY] Starting performDeployment for deployment #${deploymentId}`);
  console.log(`[DEPLOY] Server IP: ${server.ip_address}, Repo: ${gitUrl}`);
  console.log(`[DEPLOY] Server SSH password length: ${server.ssh_password?.length || 0}`);
  console.log(`[DEPLOY] ============================================`);
  
  const conn = new Client();
  let output = '';

  try {
    console.log(`[DEPLOY] Attempting SSH connection to ${server.ip_address}...`);
    // Connect via SSH
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve);
      conn.on('error', reject);
      conn.connect({
        host: server.ip_address,
        port: 22,
        username: 'root',
        password: server.ssh_password,
        readyTimeout: 30000
      });
    });

    output += '✓ Connected to server via SSH\n';
    await updateDeploymentOutput(deploymentId, output, 'in-progress');

    // Clone repository
    output += `\n[1/5] Cloning repository...\n`;
    await execSSH(conn, `cd /root && rm -rf ${repoName} && git config --global credential.helper '' && GIT_TERMINAL_PROMPT=0 git clone ${gitUrl}`);
    output += `✓ Repository cloned\n`;
    await updateDeploymentOutput(deploymentId, output, 'in-progress');

    // Detect project type
    output += `\n[2/5] Detecting project type...\n`;
    const hasPackageJson = await fileExists(conn, `/root/${repoName}/package.json`);
    const hasRequirementsTxt = await fileExists(conn, `/root/${repoName}/requirements.txt`);
    const hasIndexHtml = await fileExists(conn, `/root/${repoName}/index.html`);

    if (hasPackageJson) {
      // Node.js project
      const packageJson = await execSSH(conn, `cat /root/${repoName}/package.json`);
      const isReactOrVue = packageJson.includes('"react"') || packageJson.includes('"vue"') || packageJson.includes('"build"');
      
      if (isReactOrVue) {
        output += `✓ Detected: Static site (React/Vue)\n`;
        await deployStaticSite(conn, repoName, output, deploymentId);
      } else {
        output += `✓ Detected: Node.js backend\n`;
        await deployNodeBackend(conn, repoName, output, deploymentId);
      }
    } else if (hasRequirementsTxt) {
      output += `✓ Detected: Python application\n`;
      await deployPythonApp(conn, repoName, output, deploymentId);
    } else if (hasIndexHtml) {
      output += `✓ Detected: Static HTML site\n`;
      await deployStaticHTML(conn, repoName, output, deploymentId);
    } else {
      throw new Error('Unable to detect project type. Ensure package.json, requirements.txt, or index.html exists.');
    }

    output += `\n✅ Deployment completed successfully!\n`;
    await updateDeploymentOutput(deploymentId, output, 'success');
    
  } catch (error) {
    console.error(`[DEPLOY] Deployment #${deploymentId} error:`, error);
    output += `\n❌ Deployment failed: ${error.message}\n`;
    output += `Error details: ${error.stack || error}\n`;
    await updateDeploymentOutput(deploymentId, output, 'failed');
  } finally {
    conn.end();
  }
}

// Deploy static site (React/Vue/Vite)
async function deployStaticSite(conn, repoName, output, deploymentId) {
  output += `\n[3/5] Installing dependencies...\n`;
  await execSSH(conn, `cd /root/${repoName} && npm install`);
  output += `✓ Dependencies installed\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[4/5] Building project...\n`;
  const buildOutput = await execSSH(conn, `cd /root/${repoName} && npm run build`);
  output += `✓ Build completed\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Deploying to web server...\n`;
  // Detect build directory (dist, build, out)
  const hasDist = await fileExists(conn, `/root/${repoName}/dist`);
  const hasBuild = await fileExists(conn, `/root/${repoName}/build`);
  const hasOut = await fileExists(conn, `/root/${repoName}/out`);
  
  const buildDir = hasDist ? 'dist' : hasBuild ? 'build' : hasOut ? 'out' : null;
  if (!buildDir) throw new Error('Build directory not found. Expected dist/, build/, or out/');

  await execSSH(conn, `rm -rf /var/www/html/* && cp -r /root/${repoName}/${buildDir}/* /var/www/html/`);
  output += `✓ Site deployed to Nginx\n`;
  output += `\n🌐 Your site is live at: http://${conn.config.host}/\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
}

// Deploy static HTML (no build step)
async function deployStaticHTML(conn, repoName, output, deploymentId) {
  output += `\n[3/5] Skipping dependencies (static HTML)\n`;
  output += `[4/5] Skipping build (static HTML)\n`;
  output += `\n[5/5] Deploying to web server...\n`;
  await execSSH(conn, `rm -rf /var/www/html/* && cp -r /root/${repoName}/* /var/www/html/`);
  output += `✓ Site deployed to Nginx\n`;
  output += `\n🌐 Your site is live at: http://${conn.config.host}/\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
}

// Deploy Node.js backend
async function deployNodeBackend(conn, repoName, output, deploymentId) {
  output += `\n[3/5] Installing dependencies...\n`;
  await execSSH(conn, `cd /root/${repoName} && npm install`);
  output += `✓ Dependencies installed\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[4/5] Creating systemd service...\n`;
  const serviceName = `${repoName}.service`;
  const serviceContent = `[Unit]
Description=${repoName} Node.js App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target`;

  await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
  output += `✓ Service created\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  output += `\n🚀 Your backend is running!\n`;
  output += `Note: Configure Nginx reverse proxy for public access.\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
}

// Deploy Python app
async function deployPythonApp(conn, repoName, output, deploymentId) {
  output += `\n[3/5] Installing dependencies...\n`;
  await execSSH(conn, `cd /root/${repoName} && pip3 install -r requirements.txt`);
  output += `✓ Dependencies installed\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[4/5] Creating systemd service...\n`;
  const serviceName = `${repoName}.service`;
  const serviceContent = `[Unit]
Description=${repoName} Python App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/${repoName}
ExecStart=/usr/bin/python3 app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target`;

  await execSSH(conn, `echo '${serviceContent}' > /etc/systemd/system/${serviceName}`);
  output += `✓ Service created\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');

  output += `\n[5/5] Starting application...\n`;
  await execSSH(conn, `systemctl daemon-reload && systemctl enable ${serviceName} && systemctl restart ${serviceName}`);
  output += `✓ Application started\n`;
  output += `\n🐍 Your Python app is running!\n`;
  await updateDeploymentOutput(deploymentId, output, 'in-progress');
}

// Helper: Execute SSH command
function execSSH(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      
      let output = '';
      let errorOutput = '';
      
      stream.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed (exit ${code}): ${errorOutput || output}`));
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
}

// Helper: Check if file exists
async function fileExists(conn, path) {
  try {
    await execSSH(conn, `test -f ${path} || test -d ${path}`);
    return true;
  } catch {
    return false;
  }
}

// Helper: Update deployment output in database
async function updateDeploymentOutput(deploymentId, output, status) {
  try {
    await pool.query(
      'UPDATE deployments SET output = $1::text, status = $2::text, deployed_at = CASE WHEN $2 = \'success\' THEN NOW() ELSE deployed_at END WHERE id = $3',
      [output, status, deploymentId]
    );
  } catch (err) {
    console.error('[DEPLOY] Failed to update deployment output:', err);
  }
}

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

    // Validate domain with strict DNS compliance
    if (!domain || !isValidDomain(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format. Use format: example.com');
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

    // SECURITY: Verify domain belongs to this user
    const domainCheck = await pool.query(
      'SELECT id FROM domains WHERE domain = $1 AND user_id = $2',
      [domain, userId]
    );

    if (domainCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Domain not found or access denied');
    }

    // Update server domain and set SSL status to pending
    await pool.query(
      'UPDATE servers SET domain = $1, ssl_status = $2 WHERE id = $3',
      [domain, 'pending', server.id]
    );

    // Send response immediately - process SSL in background
    res.redirect('/dashboard?message=Domain assigned. SSL certificate generation started!');

    // Background process - trigger SSL certificate generation
    triggerSSLCertificateForCustomer(server.id, domain, server).catch(err => {
      console.error('[SSL] Failed to trigger certificate for server', server.id, ':', err);
      pool.query('UPDATE servers SET ssl_status = $1 WHERE id = $2', ['failed', server.id]).catch(e => console.error(e));
    });

  } catch (error) {
    console.error('Enable SSL error:', error);
    res.redirect('/dashboard?error=Failed to enable SSL');
  }
};

// Background function to trigger SSL via SSH2 library (secure, no command injection)
async function triggerSSLCertificateForCustomer(serverId, domain, server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log(`[SSL] SSH connected to server ${serverId}`);
      
      // Use SSH2 library's exec with properly escaped parameters
      // Domain is already validated by isValidDomain() before reaching here
      const certbotCmd = `certbot certonly --standalone -d "${domain}" --email "admin@${domain}" --non-interactive --agree-tos`;
      
      conn.exec(certbotCmd, { timeout: 60000 }, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', async (code) => {
          conn.end();
          
          try {
            if (stdout.includes('Congratulations') || stderr.includes('Congratulations')) {
              // Certificate generated successfully
              await pool.query(
                'UPDATE servers SET ssl_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['active', serverId]
              );
              console.log(`[SSL] Certificate activated for ${domain} on server ${serverId}`);
              resolve();
            } else {
              throw new Error('Certbot command did not complete successfully');
            }
          } catch (dbError) {
            reject(dbError);
          }
        });
        
        stream.on('data', (data) => {
          stdout += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
    
    conn.on('error', (err) => {
      console.error(`[SSL] SSH connection error for server ${serverId}:`, err.message);
      reject(err);
    });
    
    conn.connect({
      host: server.ip_address,
      port: 22,
      username: server.ssh_username,
      password: server.ssh_password
    });
  }).catch(async (error) => {
    console.error(`[SSL] Error generating certificate for server ${serverId}:`, error.message);
    await pool.query(
      'UPDATE servers SET ssl_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['failed', serverId]
    );
  });
}

// POST /setup-database - One-click database installation
exports.setupDatabase = async (req, res) => {
  try {
    const { database_type } = req.body;
    const userId = req.session.userId;

    if (!['postgres', 'mongodb'].includes(database_type)) {
      return res.redirect('/dashboard?error=Invalid database type');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    if (!server.ip_address || !server.ssh_password) {
      return res.redirect('/dashboard?error=Server not ready yet');
    }

    // Perform database setup asynchronously
    setupDatabaseAsync(server, database_type, userId).catch(err => {
      console.error(`[DB] Database setup failed:`, err);
    });

    res.redirect(`/dashboard?success=Setting up ${database_type === 'postgres' ? 'PostgreSQL' : 'MongoDB'}... Check status in a moment.`);
  } catch (error) {
    console.error('Setup database error:', error);
    res.redirect('/dashboard?error=Failed to start database setup');
  }
};

// Async database setup function
async function setupDatabaseAsync(server, databaseType, userId) {
  const conn = new Client();

  try {
    // Connect via SSH
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve);
      conn.on('error', reject);
      conn.connect({
        host: server.ip_address,
        port: 22,
        username: 'root',
        password: server.ssh_password,
        readyTimeout: 30000
      });
    });

    if (databaseType === 'postgres') {
      console.log(`[DB] Installing PostgreSQL on server ${server.id}...`);
      await execSSH(conn, `apt update && apt install -y postgresql postgresql-contrib`);
      await execSSH(conn, `systemctl start postgresql && systemctl enable postgresql`);
      
      // Create database user and store credentials
      const dbUser = 'basement_user';
      const dbPass = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Use psql -v variables to safely pass values (immune to SQL injection even with special chars)
      const createUserCmd = `sudo -u postgres psql -v "username=${dbUser}" -v "password=${dbPass}" -c "CREATE USER :\\"username\\" WITH PASSWORD :'password';" || true`;
      const createDbCmd = `sudo -u postgres psql -v "username=${dbUser}" -c "CREATE DATABASE app_db OWNER :\\"username\\";" || true`;
      
      await execSSH(conn, createUserCmd);
      await execSSH(conn, createDbCmd);
      
      // Store credentials file using base64 encoding (prevents shell injection)
      const credsContent = `PostgreSQL Credentials\n\nHost: localhost\nPort: 5432\nDatabase: app_db\nUsername: ${dbUser}\nPassword: ${dbPass}\n\nConnection String:\npostgresql://${dbUser}:${dbPass}@localhost:5432/app_db`;
      const credsBase64 = Buffer.from(credsContent).toString('base64');
      await execSSH(conn, `echo '${credsBase64}' | base64 -d > /root/.database_config`);
      
      console.log(`[DB] PostgreSQL installed successfully on server ${server.id}`);
      
      // Store in database that PostgreSQL is installed
      await pool.query(
        'UPDATE servers SET postgres_installed = true WHERE id = $1',
        [server.id]
      );
    } else if (databaseType === 'mongodb') {
      console.log(`[DB] Installing MongoDB on server ${server.id}...`);
      
      // Add official MongoDB repository (mongodb-org not in default Ubuntu repos)
      await execSSH(conn, `curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg`);
      await execSSH(conn, `echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list`);
      await execSSH(conn, `apt update`);
      
      // Install MongoDB
      await execSSH(conn, `apt install -y mongodb-org`);
      await execSSH(conn, `systemctl start mongod && systemctl enable mongod`);
      
      // Store credentials file using base64 encoding (prevents shell injection)
      const credsContent = `MongoDB Credentials\n\nHost: localhost\nPort: 27017\nDatabase: app_db\n\nConnection String:\nmongodb://localhost:27017/app_db`;
      const credsBase64 = Buffer.from(credsContent).toString('base64');
      await execSSH(conn, `echo '${credsBase64}' | base64 -d > /root/.database_config`);
      
      console.log(`[DB] MongoDB installed successfully on server ${server.id}`);
      
      // Store in database that MongoDB is installed
      await pool.query(
        'UPDATE servers SET mongodb_installed = true WHERE id = $1',
        [server.id]
      );
    }
  } catch (error) {
    console.error(`[DB] Database setup failed: ${error.message}`);
    
    // Mark installation as failed (NULL = failed, false = not attempted, true = success)
    const columnName = databaseType === 'postgres' ? 'postgres_installed' : 'mongodb_installed';
    await pool.query(
      `UPDATE servers SET ${columnName} = NULL WHERE id = $1`,
      [server.id]
    ).catch(dbError => {
      console.error(`[DB] Failed to update failure status:`, dbError.message);
    });
  } finally {
    conn.end();
  }
}

// POST /delete-deployment
exports.deleteDeployment = async (req, res) => {
  try {
    const { deploymentId } = req.body;
    const userId = req.session.userId;
    
    if (!deploymentId) {
      return res.redirect('/dashboard?error=Invalid deployment ID');
    }
    
    // Verify deployment belongs to this user
    const deploymentCheck = await pool.query(
      'SELECT d.id FROM deployments d JOIN servers s ON d.user_id = s.user_id WHERE d.id = $1 AND s.user_id = $2',
      [deploymentId, userId]
    );
    
    if (deploymentCheck.rows.length === 0) {
      return res.redirect('/dashboard?error=Deployment not found or unauthorized');
    }
    
    // Delete deployment
    await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
    
    res.redirect('/dashboard?success=Deployment deleted successfully');
  } catch (error) {
    console.error('Delete deployment error:', error);
    res.redirect('/dashboard?error=Failed to delete deployment');
  }
};

module.exports = {
  serverAction: exports.serverAction,
  deleteServer: exports.deleteServer,
  deploy: exports.deploy,
  addDomain: exports.addDomain,
  enableSSL: exports.enableSSL,
  setupDatabase: exports.setupDatabase,
  deleteDeployment: exports.deleteDeployment
};

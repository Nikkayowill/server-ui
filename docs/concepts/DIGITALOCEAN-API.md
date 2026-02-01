# DigitalOcean API - Server Provisioning

## What It Is

DigitalOcean API lets you programmatically create, manage, and destroy VPS servers (called "droplets"). Instead of clicking buttons in their dashboard, you send HTTP requests.

## Why We Use It

**Manual provisioning (old way):**
1. Customer pays $15/month
2. You log into DigitalOcean dashboard
3. Click "Create Droplet"
4. Select region, size, OS
5. Wait 2 minutes for creation
6. Copy IP address
7. SSH in and configure Nginx
8. Install SSL certificate
9. Email customer credentials (20 minutes total)

**API provisioning (automated):**
1. Customer subscribes ($15-$75/month)
2. Webhook fires → API call to DigitalOcean
3. Droplet created with cloud-init script (auto-installs Nginx)
4. Poll for IP address (2-5 minutes)
5. Email customer automatically
6. Total: Zero human work

Scale to 100 customers/day = impossible manually, trivial with API.

## How It Works

### 1. Create Droplet (Server)

```javascript
// services/digitalocean.js
async function createRealServer(userId, plan, stripeChargeId) {
  const response = await axios.post('https://api.digitalocean.com/v2/droplets', {
    name: `basement-${userId}-${Date.now()}`,
    region: 'nyc3',
    size: plan === 'basic' ? 's-1vcpu-1gb' : 's-2vcpu-2gb',
    image: 'ubuntu-22-04-x64',
    ssh_keys: [], // Use password auth
    backups: false,
    ipv6: false,
    monitoring: true,
    tags: ['basement', `user-${userId}`],
    user_data: cloudInitScript // Auto-setup script
  }, {
    headers: { 'Authorization': `Bearer ${process.env.DO_API_TOKEN}` }
  });
  
  const dropletId = response.data.droplet.id;
  
  // Save droplet ID to database
  await pool.query('UPDATE servers SET droplet_id = $1 WHERE user_id = $2', [dropletId, userId]);
  
  // Start polling for IP address
  pollDropletStatus(dropletId, serverId);
}
```

**What this creates:**
- Ubuntu 22.04 server
- 1GB RAM, 1 CPU, 25GB SSD (basic plan)
- New York datacenter
- Monitoring enabled
- Tagged with user ID for tracking

### 2. Cloud-Init Script (Auto-Configuration)

```bash
#!/bin/bash
# Runs on first boot, before we even get the IP

# Update packages
apt-get update
apt-get upgrade -y

# Install Nginx
apt-get install -y nginx

# Install Certbot (SSL)
apt-get install -y certbot python3-certbot-nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx

# Set root password (random 32-char)
echo "root:${GENERATED_PASSWORD}" | chpasswd

# Enable password SSH (for remote deployments)
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd
```

By the time we SSH in, server is ready for deployments.

### 3. IP Address Polling

Droplet takes 1-3 minutes to get IP address. We poll DigitalOcean API every 10 seconds:

```javascript
async function pollDropletStatus(dropletId, serverId) {
  const startTime = Date.now();
  const maxTime = 5 * 60 * 1000; // 5 minutes max
  
  const interval = setInterval(async () => {
    // Check if timed out
    if (Date.now() - startTime > maxTime) {
      clearInterval(interval);
      await pool.query('UPDATE servers SET status = $1 WHERE id = $2', ['failed', serverId]);
      // Issue Stripe refund automatically
      return;
    }
    
    // Check droplet status
    const response = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: { 'Authorization': `Bearer ${process.env.DO_API_TOKEN}` }
    });
    
    const droplet = response.data.droplet;
    
    if (droplet.status === 'active' && droplet.networks.v4.length > 0) {
      const ipAddress = droplet.networks.v4[0].ip_address;
      
      // Update database
      await pool.query('UPDATE servers SET status = $1, ip_address = $2 WHERE id = $3', 
        ['running', ipAddress, serverId]);
      
      // Send welcome email
      sendWelcomeEmail(user, ipAddress, sshPassword);
      
      clearInterval(interval);
    }
  }, 10000); // Poll every 10 seconds
}
```

**Why polling:**
- DigitalOcean doesn't have webhooks for droplet creation
- IP assignment is async (not instant)
- Need to wait for `status: 'active'` and IP address

**Why 5-minute timeout:**
- DigitalOcean usually takes 2-3 minutes
- If > 5 minutes, something went wrong
- Auto-refund customer, mark server as failed

### 4. Server Management

**Start server:**
```javascript
await axios.post(`https://api.digitalocean.com/v2/droplets/${dropletId}/actions`, {
  type: 'power_on'
});
```

**Stop server:**
```javascript
await axios.post(`https://api.digitalocean.com/v2/droplets/${dropletId}/actions`, {
  type: 'power_off'
});
```

**Destroy server (delete completely):**
```javascript
await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`);
// Droplet gone, billing stops immediately
```

### 5. Sync Job (Detect Manual Deletions)

User might delete droplet in DigitalOcean dashboard (bypassing our app). We sync hourly:

```javascript
async function syncDigitalOceanDroplets() {
  // Get all "running" servers from our database
  const servers = await pool.query('SELECT * FROM servers WHERE status = $1', ['running']);
  
  // Get all droplets from DigitalOcean
  const response = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement');
  const dropletIds = response.data.droplets.map(d => d.id);
  
  // Find servers in our DB that don't exist in DO anymore
  for (const server of servers.rows) {
    if (!dropletIds.includes(server.droplet_id)) {
      // Droplet deleted manually, mark as deleted in DB
      await pool.query('UPDATE servers SET status = $1 WHERE id = $2', ['deleted', server.id]);
    }
  }
}

// Run every hour
setInterval(syncDigitalOceanDroplets, 3600000);
```

Prevents dashboard showing "Server Running" when it's actually gone.

## API Costs

**Pricing:**
- Basic: $6/month ($0.009/hour) - 1GB RAM, 1 CPU
- Pro: $12/month ($0.018/hour) - 2GB RAM, 2 CPUs
- Premium: $24/month ($0.036/hour) - 4GB RAM, 2 CPUs

We charge $15/$35/$75 → margins of $9/$17/$27 per customer monthly.

**Yearly discounts:** 17% off (10 months for 12)

**Bandwidth:**
- 1TB/month included (enough for most sites)
- Overage: $0.01/GB (rarely happens)

**API rate limits:**
- 5,000 requests/hour
- At 100 servers/hour, you're using ~200 requests/hour (safe)

## Error Handling

**Rate limit hit:**
```javascript
try {
  await axios.post('https://api.digitalocean.com/v2/droplets', data);
} catch (error) {
  if (error.response.status === 429) {
    // Too many requests, wait and retry
    await sleep(60000); // 1 minute
    return createRealServer(userId, plan, stripeChargeId);
  }
  throw error;
}
```

**API down:**
```javascript
catch (error) {
  console.error('DigitalOcean API error:', error);
  
  // Mark server as failed
  await pool.query('UPDATE servers SET status = $1 WHERE id = $2', ['failed', serverId]);
  
  // Issue Stripe refund
  await stripe.refunds.create({ charge: stripeChargeId });
  
  // Alert admin
  sendAdminAlert('DigitalOcean API failure', error);
}
```

Never charge customer if provisioning fails.

## Security

**API token protection:**
- Stored in `.env`, never committed to git
- Has full account access (can delete everything)
- Rotate monthly

**Droplet security:**
- Random 32-character SSH passwords
- Firewall rules (only ports 22, 80, 443 open)
- Automatic security updates enabled
- Tagged with user ID for accountability

**Network isolation:**
- Each customer gets separate droplet
- No shared hosting (unlike cPanel)
- No risk of neighbor attacks

## Customer Value

**Speed:**
- Manual: 20 minutes per server
- Automated: 2-5 minutes (while you sleep)

**Reliability:**
- Manual: Forget to install Nginx → broken server
- Automated: Cloud-init script → always consistent

**Scalability:**
- Manual: Max 10 servers/day (full-time job)
- Automated: 100+ servers/day (no human work)

---

DigitalOcean API = the infrastructure layer that makes one-touch provisioning possible.  
Without it: Manual provisioning service that doesn't scale.  
With it: Fully automated platform that can grow infinitely.

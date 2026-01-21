# SSH - Remote Server Control

## What It Is

SSH (Secure Shell) lets you securely control a remote server through a command-line interface. Think of it like having a terminal window directly on someone else's computer, but encrypted.

## Why We Use It

**1. Automated Deployments**
When a customer clicks "Deploy from Git" in the dashboard, our platform:
- SSHs into their VPS server
- Runs `git clone` to download their code
- Executes `npm install` or `pip install`
- Builds production assets
- Copies files to `/var/www/html`

Without SSH, we'd have to manually FTP files or have customers do it themselves.

**2. SSL Certificate Installation**
When they click "Enable SSL":
- We SSH into their server
- Run `certbot --nginx -d domain.com`
- Let's Encrypt certificate installed automatically
- HTTPS configured in seconds

Without SSH, customers would need terminal access and Linux knowledge.

**3. Server Management**
- Check if Nginx is running
- Restart services when needed
- View deployment logs
- Debug issues remotely

## How We Secure It

**Password-based auth:**
- Auto-generated 32-character passwords
- Stored encrypted in database
- Never shown twice (copy once during provisioning)

**Connection handling:**
- ssh2 library (Node.js)
- 30-second connection timeout
- Graceful error handling
- Commands parameterized to prevent injection

## Customer Value

**Without SSH automation:**
- Customer pays → gets server IP
- Must manually SSH in themselves
- Must configure Nginx manually
- Must install SSL manually
- Must deploy code via SFTP

**With SSH automation:**
- Customer pays → server ready in 2-5 minutes
- Paste Git URL → deployed automatically
- Click button → SSL enabled
- Zero terminal commands required

## Code Example

```javascript
// From services/digitalocean.js
const { Client } = require('ssh2');

async function deployToServer(server, gitUrl) {
  const conn = new Client();
  
  conn.connect({
    host: server.ip_address,
    port: 22,
    username: 'root',
    password: server.ssh_password
  });
  
  conn.exec(`git clone ${gitUrl} /var/www/app`, (err, stream) => {
    // Handle deployment output
  });
}
```

SSH is the invisible automation layer that makes "one-click" features possible.

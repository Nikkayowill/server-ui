# Production Deployment Guide

## Prerequisites
- [ ] DigitalOcean droplet running Ubuntu 20.04+
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed
- [ ] PM2 installed globally: `sudo npm install -g pm2`
- [ ] Domain pointed to server IP (optional but recommended)

## Step-by-Step Deployment

### 1. Server Preparation

```bash
# SSH into your production server
ssh root@your_server_ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL (if not installed)
sudo apt install postgresql postgresql-contrib -y

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE webserver_db;
CREATE USER basement_app WITH ENCRYPTED PASSWORD 'KExFqHy/QmvpiSW1d9Z9gkMcZaK4GFUvvJdOUbKZvO0=';
GRANT ALL PRIVILEGES ON DATABASE webserver_db TO basement_app;
\q

# Run database migrations
cd ~/server-ui
node setup-db.js
```

### 3. Application Setup

```bash
# Clone or upload your code
cd ~
git clone https://github.com/yourusername/server-ui.git
# OR use scp/rsync to upload files

cd server-ui

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs
```

### 4. Environment Configuration

**DO NOT create a .env file on production!** Set environment variables system-wide or through PM2.

**Option A: Set system environment variables (recommended)**
```bash
# Edit /etc/environment
sudo nano /etc/environment

# Add these lines (replace with your actual values):
NODE_ENV="production"
PORT="3000"
SESSION_SECRET="1cf84fb120158df6531c0a5ff49ef2f77ec22e9ae0149dc77a9e8e9570b2a09e51fdd7190df3089e43e0018e75366dcbfea401d0690caa33e18016f2577d426b"
STRIPE_SECRET_KEY="sk_live_YOUR_NEW_ROTATED_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_NEW_WEBHOOK_SECRET"
DIGITALOCEAN_TOKEN="dop_v1_YOUR_NEW_ROTATED_TOKEN"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="webserver_db"
DB_USER="basement_app"
DB_PASSWORD="KExFqHy/QmvpiSW1d9Z9gkMcZaK4GFUvvJdOUbKZvO0="

# Reload environment
source /etc/environment
```

**Option B: Use PM2 ecosystem file (alternative)**
The ecosystem.config.js is already configured. Just set env vars in your shell before starting PM2.

### 5. Firewall Configuration

```bash
# Install UFW if not installed
sudo apt install ufw -y

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your application port (if not using reverse proxy)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 6. SSL Certificate (Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Get SSL certificate (if using domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Set up auto-renewal
sudo certbot renew --dry-run
```

### 7. Start Application with PM2

```bash
cd ~/server-ui

# Start with PM2
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs basement

# Check status
pm2 status

# Save PM2 configuration
pm2 save

# Enable PM2 startup on system reboot
pm2 startup
# Follow the instructions printed (run the sudo command)
```

### 8. Verify Deployment

```bash
# Check if application is running
pm2 status

# View recent logs
pm2 logs basement --lines 50

# Test locally on server
curl http://localhost:3000

# Test from external machine
curl http://your_server_ip:3000
```

### 9. Setup Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/basement

# Add this configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/basement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# If using SSL, update to HTTPS:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 10. Monitoring & Maintenance

```bash
# Monitor in real-time
pm2 monit

# View logs
pm2 logs basement

# Restart application
pm2 restart basement

# Stop application
pm2 stop basement

# Delete from PM2
pm2 delete basement

# View PM2 information
pm2 info basement
```

## Post-Deployment Checklist

- [ ] Application starts successfully
- [ ] Database connections working
- [ ] Stripe payments processing (test mode first!)
- [ ] Contact form submissions working
- [ ] All pages loading correctly
- [ ] SSL certificate installed and working
- [ ] Firewall configured
- [ ] PM2 startup enabled
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Domain DNS configured
- [ ] Rate limiting working
- [ ] CSRF protection enabled
- [ ] Session persistence working

## Rollback Plan

If something goes wrong:

```bash
# Stop application
pm2 stop basement

# Revert to previous code version
cd ~/server-ui
git log  # find previous commit
git checkout <previous-commit-hash>
npm install

# Restart
pm2 restart basement
```

## Regular Maintenance

```bash
# Update code
cd ~/server-ui
git pull origin main
npm install
pm2 restart basement

# View application metrics
pm2 show basement

# Clear logs
pm2 flush basement

# Update PM2
pm2 update

# System updates
sudo apt update && sudo apt upgrade -y
```

## Troubleshooting

**Application won't start:**
```bash
# Check PM2 logs
pm2 logs basement --err

# Try starting manually
cd ~/server-ui
node index.js
```

**Database connection errors:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -c "\l"

# Test connection
sudo -u postgres psql webserver_db -c "SELECT version();"
```

**Port already in use:**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

## Security Reminders

1. **Never commit .env files to git**
2. **Always use HTTPS in production**
3. **Rotate API keys before deployment**
4. **Use strong database passwords**
5. **Keep system packages updated**
6. **Monitor logs for suspicious activity**
7. **Set up automated backups**
8. **Use fail2ban to prevent brute force attacks**

## Support Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Express Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Stripe Production Checklist](https://stripe.com/docs/security/guide)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)

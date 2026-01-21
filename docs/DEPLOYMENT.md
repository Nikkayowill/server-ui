# Deploying to Production

## What You Need

- Ubuntu 20.04+ server (DigitalOcean droplet recommended)
- Node.js 18+
- PostgreSQL 12+
- PM2 process manager
- Domain name (optional but recommended for SSL)

## Quick Setup

### 1. Prep the Server

```bash
ssh root@your_server_ip

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2
sudo npm install -g pm2
```

### 2. Setup Database

```bash
sudo -u postgres psql

CREATE DATABASE basement_db;
CREATE USER basement_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE basement_db TO basement_user;
\q

# Create tables
cd ~/server-ui
node setup-db.js
```

### 3. Upload Code

```bash
cd ~
git clone https://github.com/yourusername/server-ui.git
cd server-ui
npm install --production
mkdir -p logs
```

### 4. Set Environment Variables

**Important:** Don't create a `.env` file in production. Use system-wide variables:

```bash
sudo nano /etc/environment
```

Add these (use your actual values):
```
NODE_ENV="production"
PORT="3000"
SESSION_SECRET="generate_a_long_random_string"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
DIGITALOCEAN_TOKEN="dop_v1_..."
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="basement_db"
DB_USER="basement_user"
DB_PASSWORD="your_password_here"
```

Reload:
```bash
source /etc/environment
```

### 5. Configure Firewall

```bash
sudo apt install ufw -y

# Don't lock yourself out!
sudo ufw allow 22/tcp

# Web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# App port (if not using reverse proxy)
sudo ufw allow 3000/tcp

sudo ufw enable
```

### 6. Get SSL Certificate

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal check
sudo certbot renew --dry-run
```

### 7. Start with PM2

```bash
cd ~/server-ui
pm2 start index.js --name basement
pm2 logs basement
pm2 save
pm2 startup  # Follow the printed command
```
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

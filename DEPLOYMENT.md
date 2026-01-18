# 🚀 Production Deployment Guide

## Quick Start - Deploy to DigitalOcean

### 1. Server Setup
```bash
# SSH into your production server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

### 2. Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE webserver_db;
CREATE USER your_db_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE webserver_db TO your_db_user;
\q
```

### 3. Clone & Configure Project
```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/server-ui.git
cd server-ui

# Install dependencies
npm install --production

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your production values
```

### 4. Initialize Database
```bash
# Create tables
node setup-db.js
node setup-session.js

# Run migrations
node -e "require('dotenv').config(); const pool=require('./db'); const fs=require('fs'); const sql=fs.readFileSync('create_domains_table.sql', 'utf8'); pool.query(sql).then(()=>console.log('✓ Domains table')).catch(console.error);"

node -e "require('dotenv').config(); const pool=require('./db'); const fs=require('fs'); const sql=fs.readFileSync('create_servers_table.sql', 'utf8'); pool.query(sql).then(()=>console.log('✓ Servers table')).catch(console.error);"

node -e "require('dotenv').config(); const pool=require('./db'); const fs=require('fs'); const sql=fs.readFileSync('create_deployments_table.sql', 'utf8'); pool.query(sql).then(()=>console.log('✓ Deployments table')).catch(console.error);"

node -e "require('dotenv').config(); const pool=require('./db'); const fs=require('fs'); const sql=fs.readFileSync('create_support_tickets_table.sql', 'utf8'); pool.query(sql).then(()=>console.log('✓ Support tickets tables')).catch(console.error);"
```

### 5. Configure Nginx
```bash
nano /etc/nginx/sites-available/cloudedbasement
```

Add this configuration:
```nginx
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
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/cloudedbasement /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 6. Install SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Start Application with PM2
```bash
cd /var/www/server-ui
NODE_ENV=production pm2 start index.js --name cloudedbasement
pm2 save
pm2 startup  # Follow the command it outputs
```

### 8. Configure Stripe Webhooks
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `charge.refunded`
4. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`
5. Restart app: `pm2 restart cloudedbasement`

### 9. Test Everything
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs cloudedbasement

# Monitor in real-time
pm2 monit
```

Test these flows:
- [ ] Visit https://yourdomain.com
- [ ] Register new account
- [ ] Confirm email
- [ ] Purchase a plan
- [ ] Verify server provisioning
- [ ] Test domain + SSL setup
- [ ] Submit support ticket
- [ ] Login as admin (nikkayowillpbiz@gmail.com)
- [ ] View admin dashboard

## Common PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs cloudedbasement

# View last 100 lines
pm2 logs cloudedbasement --lines 100

# Restart
pm2 restart cloudedbasement

# Stop
pm2 stop cloudedbasement

# Delete
pm2 delete cloudedbasement

# Save current process list
pm2 save

# Monitor CPU/Memory
pm2 monit
```

## Database Backups

Setup automatic daily backups:
```bash
# Create backup script
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U your_db_user webserver_db > $BACKUP_DIR/backup_$TIMESTAMP.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-db.sh
```

## Monitoring & Maintenance

### Check Application Health
```bash
# CPU and Memory usage
pm2 monit

# System resources
htop

# Disk usage
df -h

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Update Application
```bash
cd /var/www/server-ui
git pull origin main
npm install --production
pm2 restart cloudedbasement
```

## Troubleshooting

### App won't start
```bash
pm2 logs cloudedbasement --lines 50
# Check for errors in environment variables or database connection
```

### Database connection issues
```bash
# Test connection
psql -U your_db_user -d webserver_db -h localhost
# Check PostgreSQL is running
systemctl status postgresql
```

### Nginx issues
```bash
# Test configuration
nginx -t
# Check logs
tail -f /var/log/nginx/error.log
```

### Port 3000 already in use
```bash
# Find process using port
lsof -i :3000
# Kill if needed
kill -9 <PID>
```

## Security Checklist
- [x] Firewall configured (ufw allow 22,80,443)
- [x] SSH key authentication enabled
- [x] Password authentication disabled
- [x] Database password is strong
- [x] Session secret is random and secure
- [x] HTTPS/SSL enabled
- [x] Rate limiting enabled (if implemented)
- [x] All API keys secured in .env

---

**🎉 Your application is now live in production!**

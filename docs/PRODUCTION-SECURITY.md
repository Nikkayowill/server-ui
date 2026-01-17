# Production Deployment Security Checklist

## 🚨 BEFORE DEPLOYING TO PRODUCTION

### 1. Rotate ALL API Keys (CRITICAL)
Since you have live keys in development, you must rotate them:

**Stripe:**
- [ ] Go to Stripe Dashboard → Developers → API Keys
- [ ] Click "Roll" on your Secret Key to generate a new one
- [ ] Update production server with new key
- [ ] Delete/revoke old key

**DigitalOcean:**
- [ ] Go to DigitalOcean → API → Tokens
- [ ] Delete current token
- [ ] Generate new token
- [ ] Update production server with new token

**Why?** Your current keys were in a `.env` file on your local machine. While not committed to git, they should still be rotated as a security best practice.

### 2. Environment Variables

**On your production server (DigitalOcean droplet), set these environment variables:**

```bash
# Generate new session secret
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Set environment variables (use your production values)
export NODE_ENV=production
export PORT=3000
export SESSION_SECRET="your_generated_secret_here"
export STRIPE_SECRET_KEY="sk_live_NEW_KEY_HERE"
export STRIPE_WEBHOOK_SECRET="whsec_NEW_WEBHOOK_SECRET"
export DIGITALOCEAN_TOKEN="NEW_DO_TOKEN_HERE"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="webserver_db"
export DB_USER="postgres"
export DB_PASSWORD="use_strong_password_here"
```

**DO NOT use a .env file on production server!** Use PM2 ecosystem file or server environment variables.

### 3. Database Security

**Create strong PostgreSQL password:**
```bash
# Generate strong password
openssl rand -base64 32
```

**On production server:**
```sql
-- Connect to PostgreSQL
ALTER USER postgres WITH PASSWORD 'your_strong_generated_password';

-- Create dedicated user (better than using postgres superuser)
CREATE USER basement_app WITH PASSWORD 'another_strong_password';
GRANT ALL PRIVILEGES ON DATABASE webserver_db TO basement_app;
```

### 4. PM2 Setup for Production

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'basement',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Configure auto-start on server reboot
```

### 5. Stripe Webhook Configuration

**After deploying:**
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Add endpoint: `https://yourdomain.com/webhook/stripe`
- [ ] Select events: `charge.refunded`, `checkout.session.completed`
- [ ] Copy new webhook secret to production environment

### 6. SSL/HTTPS Setup

Your app expects HTTPS in production (line 72-75 in index.js). Options:

**Option A: Nginx Reverse Proxy (Recommended)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Get SSL certificate:**
```bash
sudo certbot --nginx -d yourdomain.com
```

### 7. Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 8. Database Backups

```bash
# Set up daily backups (add to crontab)
0 2 * * * pg_dump -U basement_app webserver_db > /backups/db_$(date +\%Y\%m\%d).sql
```

### 9. Monitoring & Logging

**PM2 logs:**
```bash
pm2 logs basement
pm2 monit
```

**Set up log rotation:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 10. Final Checks

- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test Stripe checkout with test card (4242 4242 4242 4242)
- [ ] Test server provisioning
- [ ] Test domain addition
- [ ] Test SSL certificate generation
- [ ] Verify Stripe webhook receives events
- [ ] Check PM2 process is running
- [ ] Verify HTTPS redirect works
- [ ] Test rate limiting (try 101 requests in 15 min)
- [ ] Check database connection
- [ ] Monitor server resources

## 🔒 Security Best Practices Implemented

✅ Helmet.js security headers
✅ Rate limiting (general, contact, payment)
✅ CSRF protection on all forms
✅ Password hashing with bcrypt (10 rounds)
✅ HTTP-only session cookies
✅ Secure cookies in production
✅ HTTPS redirect in production
✅ Input validation with express-validator
✅ SQL injection protection (parameterized queries)
✅ Session storage in PostgreSQL

## 📊 Post-Deployment Monitoring

**Watch for:**
- Failed login attempts (potential brute force)
- High rate limit hits
- Stripe webhook failures
- DigitalOcean API errors
- Database connection issues
- PM2 restart loops

**Useful commands:**
```bash
pm2 status
pm2 logs basement --lines 100
pm2 monit
tail -f /var/log/nginx/error.log
```

## 🆘 Emergency Procedures

**If keys are compromised:**
1. Immediately rotate all API keys
2. Check Stripe dashboard for unauthorized charges
3. Check DigitalOcean for unauthorized droplets
4. Review access logs
5. Force logout all users: `DELETE FROM session;`

**If server is hacked:**
1. Take server offline immediately
2. Snapshot/backup for forensics
3. Rebuild from clean image
4. Rotate ALL credentials
5. Review code for vulnerabilities

## 📝 Environment Variable Template for Production

Save this securely (use a password manager):

```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=<GENERATED_64_CHAR_HEX>
STRIPE_SECRET_KEY=sk_live_<NEW_LIVE_KEY>
STRIPE_WEBHOOK_SECRET=whsec_<NEW_WEBHOOK_SECRET>
DIGITALOCEAN_TOKEN=dop_v1_<NEW_TOKEN>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webserver_db
DB_USER=basement_app
DB_PASSWORD=<STRONG_GENERATED_PASSWORD>
```

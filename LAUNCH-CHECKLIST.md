# Pre-Launch Checklist

## ✅ Environment & Configuration
- [x] Database tables created (users, servers, domains, deployments, payments, admin_audit_log, support_tickets, ticket_replies)
- [ ] **NODE_ENV** changed to `production` in .env
- [ ] **APP_URL** updated to production domain in .env
- [ ] Session secret is cryptographically secure (✅ already set)
- [ ] All API keys verified (Stripe, DigitalOcean)
- [ ] SMTP credentials verified and working

## ✅ Security
- [x] Password hashing with bcrypt (10 rounds)
- [x] Session management with express-session + PostgreSQL store
- [x] CSRF protection not needed (no forms submitting to external domains)
- [x] SQL injection protection (using parameterized queries)
- [x] Admin routes protected with `requireAdmin` middleware
- [x] Super-admin actions gated to specific email: `nikkayowillpbiz@gmail.com`
- [ ] **IMPORTANT**: Change PORT to 80 or use reverse proxy (nginx) in production
- [ ] SSL/HTTPS certificate installed (Let's Encrypt recommended)
- [ ] Rate limiting configured (optional but recommended)

## ✅ Database
- [x] All migrations applied
- [x] Indexes created on foreign keys
- [ ] Database backups configured
- [ ] Connection pooling configured (already using pg pool)

## ✅ Payment Integration
- [x] Stripe webhook endpoint: `/stripe-webhook`
- [x] Stripe webhook secret configured
- [x] Payment tracking in `payments` table
- [x] Auto-provisioning on successful payment
- [ ] Test payments in production mode
- [ ] Refund handling tested

## ✅ Features Completed
- [x] User authentication (register, login, logout)
- [x] Email confirmation system
- [x] Password reset (if implemented)
- [x] Admin dashboard (users, domains, servers, deployments, billing, analytics, support tickets)
- [x] Customer dashboard (server status, deployments, domains, SSL, support tickets, settings)
- [x] Automated DigitalOcean server provisioning
- [x] Automated SSL certificate generation with Certbot
- [x] Server control actions (restart, stop, reboot)
- [x] Support ticket system (admin + customer)
- [x] Payment webhook integration
- [x] Audit logging for admin actions

## 📝 Pre-Launch Tasks

### 1. Update Environment Variables
```bash
# Update .env for production:
NODE_ENV=production
APP_URL=https://yourdomain.com
PORT=3000  # Or use nginx reverse proxy on port 80/443
```

### 2. Database Optimization
```bash
# Run all SQL migrations to ensure schema is up-to-date
node -e "require('dotenv').config(); const pool=require('./db'); const fs=require('fs'); ['create_domains_table.sql', 'create_servers_table.sql', 'create_deployments_table.sql', 'create_support_tickets_table.sql'].forEach(f => pool.query(fs.readFileSync(f, 'utf8')));"
```

### 3. PM2 Production Setup
```bash
# On production server:
pm2 start index.js --name "localbiz-demo"
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

### 4. Nginx Reverse Proxy (Recommended)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
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

### 5. SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com
```

### 6. Verify Stripe Webhooks
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add production endpoint: `https://yourdomain.com/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `charge.refunded`
4. Copy webhook signing secret to `.env`

### 7. Test Critical Flows
- [ ] User registration + email confirmation
- [ ] Login/logout
- [ ] Password change
- [ ] Purchase flow (Starter, Growth, Pro plans)
- [ ] Server provisioning after payment
- [ ] Domain assignment + SSL generation
- [ ] Support ticket submission + admin reply
- [ ] Admin actions (promote/demote, server management)

### 8. Monitoring & Logs
```bash
# View logs in production:
pm2 logs localbiz-demo

# Monitor server health:
pm2 monit
```

### 9. Backup Strategy
- [ ] Database backups: Daily automated backups to external storage
- [ ] Code backups: Git repository (already using GitHub)
- [ ] Server backups: DigitalOcean snapshots enabled

### 10. DNS Configuration
- [ ] A record: `@` → Server IP
- [ ] A record: `www` → Server IP
- [ ] MX records configured for email (if using custom domain email)

## 🚨 Critical Reminders

1. **Change NODE_ENV to `production`** - Disables verbose error messages
2. **Use HTTPS** - Required for Stripe payments and security
3. **Test Stripe webhooks** - Ensure payments trigger server provisioning
4. **Monitor logs** - First 24 hours are critical for catching issues
5. **Backup database** - Before launch and daily thereafter

## 🚀 Launch Command

```bash
# On production server:
cd /path/to/server-ui
npm install --production
NODE_ENV=production pm2 start index.js --name "cloudedbasement"
pm2 save
```

## 📊 Post-Launch Monitoring

- [ ] Check PM2 status: `pm2 status`
- [ ] Monitor logs: `pm2 logs cloudedbasement`
- [ ] Test all user flows
- [ ] Monitor Stripe webhook deliveries
- [ ] Check DigitalOcean server provisioning
- [ ] Verify email delivery (SMTP)
- [ ] Test support ticket system

## 🔧 Rollback Plan

If issues arise:
```bash
pm2 stop cloudedbasement
pm2 delete cloudedbasement
# Fix issues, then restart
pm2 start index.js --name cloudedbasement
```

---

**Ready to launch when all checkboxes are completed!** 🎉

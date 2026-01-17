# Database Setup Guide

## Initial PostgreSQL Setup

### 1. Install PostgreSQL (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

### 2. Access PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql
```

### 3. Create Production Database and User
```sql
-- Create database
CREATE DATABASE webserver_db;

-- Create user with strong password (use the generated one from .env.production.template)
CREATE USER basement_app WITH ENCRYPTED PASSWORD 'KExFqHy/QmvpiSW1d9Z9gkMcZaK4GFUvvJdOUbKZvO0=';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE webserver_db TO basement_app;

-- Connect to the database
\c webserver_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO basement_app;

-- Exit
\q
```

### 4. Run Database Migrations
```bash
cd ~/server-ui

# Make sure environment variables are set
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=webserver_db
export DB_USER=basement_app
export DB_PASSWORD='KExFqHy/QmvpiSW1d9Z9gkMcZaK4GFUvvJdOUbKZvO0='

# Run setup scripts
node setup-db.js

# Verify tables were created
sudo -u postgres psql webserver_db -c "\dt"
```

## Database Schema

The application creates these tables:

1. **users** - User authentication
2. **sessions** - Session storage (connect-pg-simple)
3. **servers** - VPS server records
4. **domains** - Domain management
5. **deployments** - Deployment tracking

## Security Configuration

### Configure PostgreSQL for Local Access
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Add this line for local connections (if not present):
# local   all   basement_app   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Verify Connection
```bash
# Test connection with new user
psql -h localhost -U basement_app -d webserver_db
# Enter password when prompted: KExFqHy/QmvpiSW1d9Z9gkMcZaK4GFUvvJdOUbKZvO0=
```

## Backup and Restore

### Create Backup
```bash
# Full database backup
sudo -u postgres pg_dump webserver_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
sudo -u postgres pg_dump webserver_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup specific table
sudo -u postgres pg_dump -t users webserver_db > users_backup.sql
```

### Restore from Backup
```bash
# Restore full database
sudo -u postgres psql webserver_db < backup_20260117_120000.sql

# Restore compressed backup
gunzip -c backup_20260117_120000.sql.gz | sudo -u postgres psql webserver_db

# Drop and recreate database (careful!)
sudo -u postgres dropdb webserver_db
sudo -u postgres createdb webserver_db
sudo -u postgres psql webserver_db < backup.sql
```

### Automated Backups
```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh

# Add this content:
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump webserver_db | gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

## Database Maintenance

### Check Database Size
```sql
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database;
```

### Check Table Sizes
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum and Analyze
```bash
# Analyze database (update statistics)
sudo -u postgres psql webserver_db -c "ANALYZE;"

# Vacuum database (reclaim space)
sudo -u postgres psql webserver_db -c "VACUUM;"

# Full vacuum (more thorough, locks tables)
sudo -u postgres psql webserver_db -c "VACUUM FULL;"
```

### Clear Old Sessions
```sql
-- Delete sessions older than 7 days
DELETE FROM sessions WHERE expire < NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if stopped
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql

# Check port
sudo netstat -plunt | grep 5432
```

### Authentication Failed
```bash
# Check pg_hba.conf
sudo cat /etc/postgresql/13/main/pg_hba.conf

# Restart after changes
sudo systemctl restart postgresql

# Check user exists
sudo -u postgres psql -c "\du"
```

### Permission Denied
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE webserver_db TO basement_app;
\c webserver_db
GRANT ALL ON SCHEMA public TO basement_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO basement_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO basement_app;
```

### Too Many Connections
```bash
# Check current connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
sudo -u postgres psql -c "SHOW max_connections;"

# Increase max connections
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: max_connections = 200

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Performance Tuning

### Basic Configuration
```bash
sudo nano /etc/postgresql/13/main/postgresql.conf

# Recommended settings for small VPS (2GB RAM):
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 5MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Create Indexes for Performance
```sql
-- Index on user emails (for login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on server user_id (for queries)
CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);

-- Index on domains user_id
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);

-- Index on sessions expire time
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
```

## Security Best Practices

1. **Use strong passwords** - The generated password is already strong
2. **Limit user privileges** - basement_app only has access to webserver_db
3. **Regular backups** - Set up automated daily backups
4. **Monitor logs** - Check for suspicious activity
5. **Update regularly** - Keep PostgreSQL updated
6. **Use SSL** - For remote connections (not needed for localhost)
7. **Firewall** - Block external PostgreSQL access (port 5432)

## Monitoring

### View Active Connections
```sql
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'webserver_db';
```

### Kill Idle Connections
```sql
-- Find idle connections
SELECT pid, usename, state, state_change
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '1 hour';

-- Kill specific connection
SELECT pg_terminate_backend(pid);
```

### Check Slow Queries
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- 1 second
SELECT pg_reload_conf();
```

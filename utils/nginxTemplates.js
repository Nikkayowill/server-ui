/**
 * ============================================================================
 * NGINX Configuration Templates
 * ============================================================================
 * 
 * This module provides deterministic, type-safe NGINX config generation.
 * 
 * ARCHITECTURE:
 * - Static sites: served directly from disk (root + try_files)
 * - Node apps: proxied to localhost:PORT (proxy_pass)
 * 
 * IMPORTANT: These templates are the ONLY source of truth for NGINX configs.
 * Never generate NGINX configs inline elsewhere in the codebase.
 * 
 * Each function validates its inputs and throws on invalid state.
 * No silent fallbacks. No guessing.
 * 
 * ============================================================================
 */

/**
 * Validates a domain name strictly (RFC 1123)
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
function isValidDomainName(domain) {
  if (!domain || typeof domain !== 'string') return false;
  // RFC 1123: alphanumeric, hyphens, dots. Max 253 chars total.
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i.test(domain) 
    && domain.length <= 253;
}

/**
 * Converts domain to safe filename (dots to hyphens)
 * @param {string} domain 
 * @returns {string}
 */
function domainToFilename(domain) {
  return domain.replace(/\./g, '-');
}

/**
 * ============================================================================
 * STATIC SITE CONFIG
 * ============================================================================
 * 
 * Use this for: React, Vue, Vite, plain HTML, any pre-built static assets.
 * 
 * How it works:
 * 1. NGINX serves files directly from the specified directory
 * 2. try_files handles SPA routing (falls back to index.html)
 * 3. Static assets get long cache headers
 * 
 * This config NEVER uses proxy_pass.
 */
function generateStaticSiteConfig({ domain, siteDirectory }) {
  // === VALIDATION ===
  if (!isValidDomainName(domain)) {
    throw new Error(`[NGINX] Invalid domain format: ${domain}`);
  }
  if (!siteDirectory || typeof siteDirectory !== 'string') {
    throw new Error(`[NGINX] Missing site directory for static site: ${domain}`);
  }
  if (!siteDirectory.startsWith('/var/www/')) {
    throw new Error(`[NGINX] Site directory must be under /var/www/: ${siteDirectory}`);
  }

  // === TEMPLATE ===
  // No conditional logic inside - just string interpolation
  return `# ============================================================================
# NGINX Config: ${domain}
# Type: STATIC SITE
# Directory: ${siteDirectory}
# Generated: ${new Date().toISOString()}
# ============================================================================
# 
# This is a STATIC site. Files are served directly from disk.
# DO NOT add proxy_pass to this config - it will cause 502 errors.
#
# To convert this to a Node app, delete this file and use nginx-node-app template.
# ============================================================================

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    
    # Redirect HTTP to HTTPS (will be handled by certbot)
    # Uncomment after SSL is configured:
    # return 301 https://$host$request_uri;
    
    root ${siteDirectory};
    index index.html index.htm;

    # SPA routing: try file, then directory, then fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching (1 year, immutable)
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
`;
}

/**
 * ============================================================================
 * NODE APP CONFIG
 * ============================================================================
 * 
 * Use this for: Express, Fastify, Next.js (SSR), any Node.js server.
 * 
 * How it works:
 * 1. NGINX proxies all requests to localhost:PORT
 * 2. Headers are preserved for proper client IP detection
 * 3. WebSocket upgrade is supported
 * 
 * IMPORTANT: The Node app MUST be running on the specified port.
 * If the app is not running, this config will cause 502 errors.
 */
function generateNodeAppConfig({ domain, port, siteDirectory = null }) {
  // === VALIDATION ===
  if (!isValidDomainName(domain)) {
    throw new Error(`[NGINX] Invalid domain format: ${domain}`);
  }
  if (!port || typeof port !== 'number' || port < 1024 || port > 65535) {
    throw new Error(`[NGINX] Invalid port for Node app: ${port}. Must be 1024-65535.`);
  }

  // Optional: siteDirectory for serving static files alongside the app
  const staticFilesBlock = siteDirectory ? `
    # Static files (served directly, bypassing Node for performance)
    location /static/ {
        alias ${siteDirectory}/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
` : '';

  // === TEMPLATE ===
  return `# ============================================================================
# NGINX Config: ${domain}
# Type: NODE APP (Reverse Proxy)
# Upstream: http://127.0.0.1:${port}
# Generated: ${new Date().toISOString()}
# ============================================================================
#
# This is a NODE APP. Requests are proxied to the backend.
# The Node.js process MUST be running on port ${port}.
#
# If you see 502 errors, check:
# 1. Is the Node app running? (pm2 status / systemctl status)
# 2. Is it listening on port ${port}? (ss -tlnp | grep ${port})
# 3. Is it binding to 127.0.0.1 or 0.0.0.0? (not just localhost)
# ============================================================================

upstream ${domainToFilename(domain)}_backend {
    server 127.0.0.1:${port};
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    # Redirect HTTP to HTTPS (will be handled by certbot)
    # Uncomment after SSL is configured:
    # return 301 https://$host$request_uri;

    # Proxy to Node.js application
    location / {
        proxy_pass http://${domainToFilename(domain)}_backend;
        proxy_http_version 1.1;
        
        # Required headers for proper client detection
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts (adjust based on your app's needs)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
${staticFilesBlock}
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
`;
}

/**
 * ============================================================================
 * PRE-FLIGHT CHECKS
 * ============================================================================
 * 
 * These functions validate that prerequisites are met BEFORE generating config.
 * They should be run via SSH on the target server.
 */

/**
 * Returns SSH command to verify static site directory exists and has files
 * @param {string} siteDirectory 
 * @returns {string} Shell command
 */
function getStaticSitePreflightCommand(siteDirectory) {
  return `
# Check directory exists
if [ ! -d "${siteDirectory}" ]; then
  echo "ERROR: Directory does not exist: ${siteDirectory}"
  exit 1
fi

# Check for index.html
if [ ! -f "${siteDirectory}/index.html" ]; then
  echo "ERROR: No index.html found in ${siteDirectory}"
  exit 1
fi

echo "OK: Static site ready at ${siteDirectory}"
ls -la "${siteDirectory}" | head -10
exit 0
`;
}

/**
 * Returns SSH command to verify Node app is running on specified port
 * @param {number} port 
 * @returns {string} Shell command
 */
function getNodeAppPreflightCommand(port) {
  return `
# Check if something is listening on the port
if ! ss -tlnp | grep -q ":${port} "; then
  echo "ERROR: Nothing listening on port ${port}"
  echo "Start your Node app first: pm2 start app.js / node app.js"
  exit 1
fi

# Verify it responds to HTTP
if ! curl -sf --max-time 5 http://127.0.0.1:${port}/ > /dev/null 2>&1; then
  echo "WARNING: Port ${port} is open but HTTP request failed"
  echo "This might be okay if your app requires specific routes"
fi

echo "OK: Service running on port ${port}"
ss -tlnp | grep ":${port} "
exit 0
`;
}

/**
 * ============================================================================
 * DECISION TREE
 * ============================================================================
 * 
 * Main entry point for generating NGINX configs.
 * This function decides which template to use based on deployment type.
 */

/**
 * Generate the appropriate NGINX config based on deployment type
 * @param {Object} options
 * @param {string} options.domain - The custom domain
 * @param {string} options.deploymentType - 'static' or 'node'
 * @param {string} options.siteDirectory - Directory for static sites (required for static)
 * @param {number} options.port - Port for Node apps (required for node)
 * @returns {{config: string, preflightCommand: string, type: string}}
 */
function generateNginxConfig(options) {
  const { domain, deploymentType, siteDirectory, port } = options;

  console.log(`[NGINX] Generating config for ${domain}`);
  console.log(`[NGINX]   Type: ${deploymentType}`);
  console.log(`[NGINX]   Directory: ${siteDirectory || 'N/A'}`);
  console.log(`[NGINX]   Port: ${port || 'N/A'}`);

  // === DECISION TREE (explicit, no fallbacks) ===
  
  if (deploymentType === 'static') {
    // Static site: MUST have a directory, MUST NOT have proxy_pass
    if (!siteDirectory) {
      throw new Error(`[NGINX] Static deployment requires siteDirectory. Got: ${siteDirectory}`);
    }
    return {
      config: generateStaticSiteConfig({ domain, siteDirectory }),
      preflightCommand: getStaticSitePreflightCommand(siteDirectory),
      type: 'static',
      filename: domainToFilename(domain)
    };
  }
  
  if (deploymentType === 'node') {
    // Node app: MUST have a port, MUST use proxy_pass
    if (!port) {
      throw new Error(`[NGINX] Node deployment requires port. Got: ${port}`);
    }
    return {
      config: generateNodeAppConfig({ domain, port, siteDirectory }),
      preflightCommand: getNodeAppPreflightCommand(port),
      type: 'node',
      filename: domainToFilename(domain)
    };
  }

  // Unknown type - FAIL LOUDLY
  throw new Error(`[NGINX] Unknown deployment type: ${deploymentType}. Must be 'static' or 'node'.`);
}

module.exports = {
  generateNginxConfig,
  generateStaticSiteConfig,
  generateNodeAppConfig,
  getStaticSitePreflightCommand,
  getNodeAppPreflightCommand,
  isValidDomainName,
  domainToFilename
};

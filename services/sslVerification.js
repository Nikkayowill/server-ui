/**
 * SSL Verification Service
 * 
 * Determines accurate SSL status by checking:
 * 1. DNS resolution - does domain resolve to our server IP?
 * 2. Certificate existence - does cert file exist on server?
 * 3. TLS reachability - can we complete a TLS handshake?
 * 
 * SSL Status States:
 * - 'none': No SSL configured
 * - 'pending': SSL requested, awaiting issuance
 * - 'active': DNS valid + cert exists + TLS reachable
 * - 'orphaned': Cert exists but DNS doesn't point to us
 * - 'expired': Certificate has expired
 * - 'unreachable': DNS valid but TLS handshake fails
 */

const dns = require('dns').promises;
const https = require('https');
const { Client } = require('ssh2');
const pool = require('../db');

/**
 * Resolve domain to IP addresses
 */
async function resolveDomain(domain) {
  try {
    const addresses = await dns.resolve4(domain);
    return { success: true, ips: addresses };
  } catch (err) {
    return { success: false, ips: [], error: err.code };
  }
}

/**
 * Check if domain resolves to expected server IP
 */
async function checkDNSPointsToUs(domain, expectedIp) {
  const result = await resolveDomain(domain);
  if (!result.success) {
    return { valid: false, reason: `DNS lookup failed: ${result.error}` };
  }
  
  const pointsToUs = result.ips.includes(expectedIp);
  return {
    valid: pointsToUs,
    resolvedIps: result.ips,
    expectedIp,
    reason: pointsToUs ? 'DNS points to our server' : `DNS points to ${result.ips.join(', ')} instead of ${expectedIp}`
  };
}

/**
 * Perform live TLS handshake test
 */
async function checkTLSReachable(domain) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ reachable: false, reason: 'Connection timeout' });
    }, 10000);
    
    const req = https.request({
      hostname: domain,
      port: 443,
      method: 'HEAD',
      timeout: 10000,
      rejectUnauthorized: false // We want to check if TLS works, not if cert is trusted
    }, (res) => {
      clearTimeout(timeout);
      resolve({
        reachable: true,
        statusCode: res.statusCode,
        reason: 'TLS handshake successful'
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        reachable: false,
        reason: `TLS error: ${err.message}`
      });
    });
    
    req.end();
  });
}

/**
 * Check if certificate exists on server via SSH
 */
async function checkCertExistsOnServer(server, domain) {
  return new Promise((resolve) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      resolve({ exists: false, reason: 'SSH timeout' });
    }, 15000);
    
    conn.on('ready', () => {
      // Check for Let's Encrypt certificate
      const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
      conn.exec(`test -f ${certPath} && echo "EXISTS" || echo "MISSING"`, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve({ exists: false, reason: `SSH exec error: ${err.message}` });
          return;
        }
        
        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          resolve({
            exists: output.trim() === 'EXISTS',
            certPath,
            reason: output.trim() === 'EXISTS' ? 'Certificate file found' : 'Certificate file not found'
          });
        });
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ exists: false, reason: `SSH connection error: ${err.message}` });
    });
    
    conn.connect({
      host: server.ip_address,
      port: 22,
      username: server.ssh_username,
      password: server.ssh_password
    });
  });
}

/**
 * Determine SSL status based on all checks
 */
function determineSSLStatus(dnsCheck, certCheck, tlsCheck, currentStatus) {
  // If DNS doesn't point to us
  if (!dnsCheck.valid) {
    if (certCheck.exists) {
      return 'orphaned'; // Cert exists but DNS moved away
    }
    return 'none'; // No SSL possible without DNS
  }
  
  // DNS points to us
  if (!certCheck.exists) {
    return currentStatus === 'pending' ? 'pending' : 'none';
  }
  
  // DNS valid + cert exists
  if (!tlsCheck.reachable) {
    return 'unreachable'; // Something wrong with nginx config or cert
  }
  
  // All checks pass
  return 'active';
}

/**
 * Verify single domain's SSL status
 */
async function verifyDomainSSL(domain, server) {
  console.log(`[SSL-VERIFY] Checking ${domain.domain}...`);
  
  const expectedIp = server.ip_address;
  
  // Run all checks
  const dnsCheck = await checkDNSPointsToUs(domain.domain, expectedIp);
  const certCheck = await checkCertExistsOnServer(server, domain.domain);
  const tlsCheck = dnsCheck.valid ? await checkTLSReachable(domain.domain) : { reachable: false, reason: 'Skipped (DNS invalid)' };
  
  // Determine new status
  const newStatus = determineSSLStatus(dnsCheck, certCheck, tlsCheck, domain.ssl_status);
  
  console.log(`[SSL-VERIFY] ${domain.domain}: DNS=${dnsCheck.valid}, Cert=${certCheck.exists}, TLS=${tlsCheck.reachable} → ${newStatus}`);
  
  // Update database
  await pool.query(`
    UPDATE domains SET
      ssl_status = $1,
      ssl_dns_valid = $2,
      ssl_cert_exists = $3,
      ssl_reachable = $4,
      ssl_last_verified_at = NOW(),
      expected_ip = $5,
      ssl_enabled = $6
    WHERE id = $7
  `, [
    newStatus,
    dnsCheck.valid,
    certCheck.exists,
    tlsCheck.reachable,
    expectedIp,
    newStatus === 'active', // ssl_enabled stays true only if truly active
    domain.id
  ]);
  
  return {
    domain: domain.domain,
    previousStatus: domain.ssl_status,
    newStatus,
    dnsCheck,
    certCheck,
    tlsCheck
  };
}

/**
 * Background job: Verify all domains with SSL enabled
 * Run every 30 minutes
 */
async function reconcileAllSSLStates() {
  console.log('[SSL-RECONCILE] Starting SSL state reconciliation...');
  
  try {
    // Get all domains that have SSL configured (status not 'none')
    const domainsResult = await pool.query(`
      SELECT d.*, s.ip_address, s.ssh_username, s.ssh_password
      FROM domains d
      JOIN servers s ON d.server_id = s.id
      WHERE d.ssl_status != 'none' OR d.ssl_enabled = true
      AND s.status = 'running'
    `);
    
    console.log(`[SSL-RECONCILE] Found ${domainsResult.rows.length} domains to verify`);
    
    const results = [];
    for (const domain of domainsResult.rows) {
      const server = {
        ip_address: domain.ip_address,
        ssh_username: domain.ssh_username,
        ssh_password: domain.ssh_password
      };
      
      const result = await verifyDomainSSL(domain, server);
      results.push(result);
      
      // Rate limit: wait 2 seconds between domains
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    const statusCounts = results.reduce((acc, r) => {
      acc[r.newStatus] = (acc[r.newStatus] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`[SSL-RECONCILE] Completed. Status summary:`, statusCounts);
    
    return results;
  } catch (error) {
    console.error('[SSL-RECONCILE] Error:', error);
    throw error;
  }
}

/**
 * Quick DNS check (for dashboard - doesn't update DB)
 */
async function quickDNSCheck(domain, expectedIp) {
  return checkDNSPointsToUs(domain, expectedIp);
}

module.exports = {
  verifyDomainSSL,
  reconcileAllSSLStates,
  checkDNSPointsToUs,
  checkTLSReachable,
  checkCertExistsOnServer,
  quickDNSCheck
};

/**
 * Server Updates Service - Secure Update Orchestration
 * 
 * Features:
 * - Centralized admin-created updates with workflow (draft → tested → released → archived)
 * - Script validation and immutable hashing
 * - Test on single server before mass rollout (MANDATORY)
 * - Global kill switch
 * - Rate-limited parallel execution
 * - Full audit logging
 * - Customer transparency
 */

const pool = require('../db');
const { Client } = require('ssh2');
const { validateScript, hashScript, verifyScriptHash, ensureSafetyHeaders } = require('./scriptValidator');

// Execution constants
const SSH_CONNECT_TIMEOUT = 30000;  // 30s to establish connection
const SSH_EXEC_TIMEOUT = 300000;    // 5min max execution time
const MAX_OUTPUT_LENGTH = 50000;    // 50KB output limit
const DEFAULT_RATE_LIMIT = 5;       // Max concurrent executions

// Update status workflow
const UPDATE_STATUS = {
  DRAFT: 'draft',       // Just created, not validated
  TESTED: 'tested',     // Successfully tested on at least one server
  RELEASED: 'released', // Available for customer updates / mass push
  ARCHIVED: 'archived'  // No longer active
};

// ============================================================
// KILL SWITCH & SYSTEM SETTINGS
// ============================================================

/**
 * Check if the global kill switch is active
 */
async function isKillSwitchActive() {
  try {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'updates_kill_switch'`
    );
    return result.rows[0]?.value === 'true';
  } catch (err) {
    // If table doesn't exist yet, assume kill switch is OFF
    console.error('[Updates] Kill switch check failed:', err.message);
    return false;
  }
}

/**
 * Toggle the global kill switch
 */
async function setKillSwitch(active, userId) {
  await pool.query(`
    INSERT INTO system_settings (key, value, updated_at, updated_by)
    VALUES ('updates_kill_switch', $1, NOW(), $2)
    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW(), updated_by = $2
  `, [active ? 'true' : 'false', userId]);
  
  console.log(`[Updates] Kill switch ${active ? 'ACTIVATED' : 'deactivated'} by user ${userId}`);
}

/**
 * Get current rate limit setting
 */
async function getRateLimit() {
  try {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'updates_rate_limit'`
    );
    return parseInt(result.rows[0]?.value || DEFAULT_RATE_LIMIT, 10);
  } catch {
    return DEFAULT_RATE_LIMIT;
  }
}

// ============================================================
// UPDATE CRUD OPERATIONS
// ============================================================

/**
 * Get all updates with aggregated stats
 */
async function getAllUpdates() {
  const result = await pool.query(`
    SELECT 
      su.*,
      u.email as created_by_email,
      (SELECT COUNT(*) FROM server_update_log sul WHERE sul.update_id = su.id AND sul.status = 'success') as success_count,
      (SELECT COUNT(*) FROM server_update_log sul WHERE sul.update_id = su.id AND sul.status = 'failed') as failure_count,
      (SELECT COUNT(*) FROM servers s 
       WHERE s.status = 'running' 
         AND s.ip_address IS NOT NULL 
         AND s.ssh_password IS NOT NULL
         AND s.id NOT IN (
           SELECT server_id FROM server_update_log WHERE update_id = su.id AND status = 'success'
         )
      ) as missing_count
    FROM server_updates su
    LEFT JOIN users u ON su.created_by = u.id
    ORDER BY su.created_at DESC
  `);
  return result.rows;
}

/**
 * Get a single update by ID
 */
async function getUpdateById(updateId) {
  const result = await pool.query(`
    SELECT su.*, u.email as created_by_email
    FROM server_updates su
    LEFT JOIN users u ON su.created_by = u.id
    WHERE su.id = $1
  `, [updateId]);
  return result.rows[0];
}

/**
 * Get pending updates for a specific server (only released updates)
 */
async function getPendingUpdates(serverId) {
  const result = await pool.query(`
    SELECT su.* 
    FROM server_updates su
    WHERE su.status = $1
      AND su.id NOT IN (
        SELECT update_id FROM server_update_log 
        WHERE server_id = $2 AND status = 'success'
      )
    ORDER BY su.is_critical DESC, su.created_at DESC
  `, [UPDATE_STATUS.RELEASED, serverId]);
  return result.rows;
}

/**
 * Get update history for a server
 */
async function getUpdateHistory(serverId) {
  const result = await pool.query(`
    SELECT 
      sul.*,
      su.title, 
      su.type, 
      su.is_critical,
      su.version
    FROM server_update_log sul
    JOIN server_updates su ON sul.update_id = su.id
    WHERE sul.server_id = $1
    ORDER BY sul.applied_at DESC
    LIMIT 50
  `, [serverId]);
  return result.rows;
}

/**
 * Create a new update (starts in DRAFT status)
 */
async function createUpdate({ title, description, script, type, version, isCritical, createdBy, whitelist = [] }) {
  // Validate script
  const validation = validateScript(script, whitelist);
  
  if (!validation.valid) {
    throw new Error(`Script validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Ensure safety headers
  const safeScript = ensureSafetyHeaders(script);
  const scriptHash = hashScript(safeScript);
  
  const result = await pool.query(`
    INSERT INTO server_updates 
      (title, description, script, script_hash, type, version, is_critical, status, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `, [
    title, 
    description, 
    safeScript, 
    scriptHash, 
    type || 'config', 
    version, 
    isCritical || false, 
    UPDATE_STATUS.DRAFT,
    createdBy
  ]);
  
  console.log(`[Updates] Created update ${result.rows[0].id}: "${title}" (hash: ${scriptHash.substring(0, 12)}...)`);
  
  return { 
    update: result.rows[0], 
    warnings: validation.warnings 
  };
}

/**
 * Delete an update (only drafts or archived) - atomic to prevent TOCTOU
 */
async function deleteUpdate(updateId, userId) {
  // Atomic delete with status check - prevents race condition
  const result = await pool.query(
    `DELETE FROM server_updates 
     WHERE id = $1 AND status != $2 
     RETURNING id, title, status`,
    [updateId, UPDATE_STATUS.RELEASED]
  );
  
  if (result.rowCount === 0) {
    // Check why it failed
    const existing = await pool.query('SELECT id, status FROM server_updates WHERE id = $1', [updateId]);
    if (existing.rowCount === 0) {
      throw new Error('Update not found');
    }
    if (existing.rows[0].status === UPDATE_STATUS.RELEASED) {
      throw new Error('Cannot delete a released update. Archive it first.');
    }
    throw new Error('Delete failed - concurrent modification detected');
  }
  
  console.log(`[Updates] Deleted update ${updateId} ("${result.rows[0].title}") by user ${userId}`);
}

/**
 * Archive an update (no longer applied but kept for audit)
 * Only tested or released updates can be archived
 */
async function archiveUpdate(updateId, userId) {
  const result = await pool.query(`
    UPDATE server_updates 
    SET status = $1
    WHERE id = $2 AND status IN ($3, $4)
    RETURNING id, title
  `, [UPDATE_STATUS.ARCHIVED, updateId, UPDATE_STATUS.TESTED, UPDATE_STATUS.RELEASED]);
  
  if (result.rowCount === 0) {
    const existing = await pool.query('SELECT id, status FROM server_updates WHERE id = $1', [updateId]);
    if (existing.rowCount === 0) {
      throw new Error('Update not found');
    }
    const status = existing.rows[0].status;
    if (status === UPDATE_STATUS.DRAFT) {
      throw new Error('Cannot archive a draft update - test it first or delete it');
    }
    if (status === UPDATE_STATUS.ARCHIVED) {
      throw new Error('Update is already archived');
    }
    throw new Error(`Cannot archive update with status: ${status}`);
  }
  
  console.log(`[Updates] Archived update ${updateId} ("${result.rows[0].title}") by user ${userId}`);
}

// ============================================================
// TEST ON SINGLE SERVER (MANDATORY BEFORE RELEASE)
// ============================================================

/**
 * Test an update on a single server
 * Required before the update can be released for mass rollout
 * Uses database transaction to ensure atomicity
 */
async function testUpdateOnServer(updateId, serverId, adminId) {
  // Check kill switch
  if (await isKillSwitchActive()) {
    throw new Error('Update execution is currently disabled (kill switch active)');
  }
  
  const update = await getUpdateById(updateId);
  if (!update) {
    throw new Error('Update not found');
  }
  
  // Verify script hash (immutability check)
  if (update.script_hash && !verifyScriptHash(update.script, update.script_hash)) {
    throw new Error('Script integrity check failed - hash mismatch');
  }
  
  // Get server
  const serverResult = await pool.query('SELECT * FROM servers WHERE id = $1', [serverId]);
  const server = serverResult.rows[0];
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  if (!server.ip_address || !server.ssh_password) {
    throw new Error('Server missing SSH credentials');
  }
  
  if (server.status !== 'running') {
    throw new Error(`Server is not running (status: ${server.status})`);
  }
  
  console.log(`[Updates] Testing update ${updateId} on server ${serverId}...`);
  const startTime = Date.now();
  
  // Get a client for transaction
  const client = await pool.connect();
  
  try {
    const result = await executeUpdateOnServer(server, update);
    const executionTime = Date.now() - startTime;
    
    // Use transaction for atomicity
    await client.query('BEGIN');
    
    // Log test result
    await client.query(`
      INSERT INTO server_update_tests 
        (update_id, server_id, tested_by, exit_code, execution_time_ms, stdout, stderr, success, tested_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      updateId, 
      serverId, 
      adminId, 
      result.exitCode, 
      executionTime, 
      result.stdout, 
      result.stderr, 
      result.success
    ]);
    
    // If successful, mark update as tested (with verification)
    if (result.success) {
      const updateResult = await client.query(`
        UPDATE server_updates 
        SET status = $1, tested_at = NOW(), tested_on_server_id = $2
        WHERE id = $3 AND status = $4
        RETURNING id
      `, [UPDATE_STATUS.TESTED, serverId, updateId, UPDATE_STATUS.DRAFT]);
      
      if (updateResult.rowCount === 0) {
        // Status didn't change - maybe concurrent modification
        console.warn(`[Updates] Update ${updateId} status not changed (may have been modified concurrently)`);
      } else {
        console.log(`[Updates] Update ${updateId} tested successfully on server ${serverId} (${executionTime}ms)`);
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: result.success,
      exitCode: result.exitCode,
      executionTime,
      stdout: result.stdout,
      stderr: result.stderr
    };
    
  } catch (err) {
    await client.query('ROLLBACK');
    const executionTime = Date.now() - startTime;
    
    // Log failed test (outside transaction - we want this to persist even on error)
    try {
      await pool.query(`
        INSERT INTO server_update_tests 
          (update_id, server_id, tested_by, exit_code, execution_time_ms, stderr, success, tested_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [updateId, serverId, adminId, -1, executionTime, err.message, false]);
    } catch (logErr) {
      console.error('[Updates] Failed to log test failure:', logErr.message);
    }
    
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get test results for an update
 */
async function getTestResults(updateId) {
  const result = await pool.query(`
    SELECT 
      t.*,
      s.hostname,
      s.ip_address,
      u.email as tested_by_email
    FROM server_update_tests t
    JOIN servers s ON t.server_id = s.id
    LEFT JOIN users u ON t.tested_by = u.id
    WHERE t.update_id = $1
    ORDER BY t.tested_at DESC
  `, [updateId]);
  return result.rows;
}

/**
 * Check if an update has been successfully tested
 */
async function hasSuccessfulTest(updateId) {
  const result = await pool.query(`
    SELECT COUNT(*) FROM server_update_tests
    WHERE update_id = $1 AND success = true
  `, [updateId]);
  return parseInt(result.rows[0].count, 10) > 0;
}

// ============================================================
// RELEASE & EXECUTION
// ============================================================

/**
 * Release an update for customer updates / mass rollout
 * REQUIRES: at least one successful test
 */
async function releaseUpdate(updateId, adminId) {
  const update = await getUpdateById(updateId);
  
  if (!update) {
    throw new Error('Update not found');
  }
  
  if (update.status !== UPDATE_STATUS.TESTED) {
    throw new Error(`Update must be in "${UPDATE_STATUS.TESTED}" status to release. Current: ${update.status}`);
  }
  
  // Verify at least one successful test
  const hasTest = await hasSuccessfulTest(updateId);
  if (!hasTest) {
    throw new Error('Update must have at least one successful test before release');
  }
  
  await pool.query(`
    UPDATE server_updates 
    SET status = $1, released_at = NOW(), released_by = $2
    WHERE id = $3
  `, [UPDATE_STATUS.RELEASED, adminId, updateId]);
  
  console.log(`[Updates] Update ${updateId} released by admin ${adminId}`);
}

/**
 * Execute an update on a single server (internal execution engine)
 */
function executeUpdateOnServer(server, update) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let connectionTimeout = null;
    let executionTimeout = null;
    let resolved = false;
    
    const cleanup = () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (executionTimeout) clearTimeout(executionTimeout);
    };
    
    const safeResolve = (value) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      conn.end();
      resolve(value);
    };
    
    const safeReject = (err) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      conn.end();
      reject(err);
    };
    
    connectionTimeout = setTimeout(() => {
      safeReject(new Error('SSH connection timed out'));
    }, SSH_CONNECT_TIMEOUT);
    
    conn.on('ready', () => {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
      
      conn.exec(update.script, (err, stream) => {
        if (err) {
          return safeReject(err);
        }
        
        let stdout = '';
        let stderr = '';
        let truncated = false;
        
        // Set execution timeout (this actually enforces the limit)
        executionTimeout = setTimeout(() => {
          stream.close();
          safeReject(new Error(`Script execution timed out after ${SSH_EXEC_TIMEOUT / 1000}s`));
        }, SSH_EXEC_TIMEOUT);
        
        stream.on('close', (code) => {
          safeResolve({
            success: code === 0,
            exitCode: code,
            stdout: truncated ? stdout + '\n[TRUNCATED]' : stdout,
            stderr: truncated ? stderr + '\n[TRUNCATED]' : stderr,
            truncated
          });
        });
        
        stream.on('error', (err) => {
          safeReject(err);
        });
        
        stream.on('data', (data) => {
          if (stdout.length < MAX_OUTPUT_LENGTH) {
            stdout += data.toString();
          } else {
            truncated = true;
          }
        });
        
        stream.stderr.on('data', (data) => {
          if (stderr.length < MAX_OUTPUT_LENGTH) {
            stderr += data.toString();
          } else {
            truncated = true;
          }
        });
      });
    });
    
    conn.on('error', (err) => {
      safeReject(err);
    });
    
    conn.connect({
      host: server.ip_address,
      port: 22,
      username: server.ssh_username || 'root',
      password: server.ssh_password,
      readyTimeout: SSH_CONNECT_TIMEOUT
    });
  });
}

/**
 * Apply a single update to a server (used for customer-initiated updates)
 */
async function applyUpdate(server, update, triggeredBy, triggerType = 'manual') {
  // Check kill switch
  if (await isKillSwitchActive()) {
    throw new Error('Update execution is currently disabled');
  }
  
  // Verify update is released
  if (update.status !== UPDATE_STATUS.RELEASED) {
    throw new Error('Update is not available for application');
  }
  
  // Verify script hash
  if (update.script_hash && !verifyScriptHash(update.script, update.script_hash)) {
    throw new Error('Script integrity check failed');
  }
  
  // Validate server
  if (!server.ip_address || !server.ssh_password) {
    throw new Error('Server missing SSH credentials');
  }
  if (server.status !== 'running') {
    throw new Error('Server is not running');
  }
  
  const startTime = Date.now();
  
  try {
    const result = await executeUpdateOnServer(server, update);
    const executionTime = Date.now() - startTime;
    
    // Log result
    await logUpdateResult(
      server.id, 
      update.id, 
      result.success ? 'success' : 'failed',
      result.stdout + (result.stderr ? '\n[stderr]\n' + result.stderr : ''),
      triggeredBy,
      triggerType,
      result.exitCode,
      executionTime
    );
    
    return result;
    
  } catch (err) {
    const executionTime = Date.now() - startTime;
    
    await logUpdateResult(
      server.id,
      update.id,
      'failed',
      err.message,
      triggeredBy,
      triggerType,
      -1,
      executionTime
    );
    
    throw err;
  }
}

/**
 * Log update result to database
 * Returns true on success, false on failure (never throws)
 */
async function logUpdateResult(serverId, updateId, status, output, triggeredBy, triggerType, exitCode, executionTimeMs) {
  try {
    // Calculate start_time properly without risky string concatenation
    const startTime = executionTimeMs ? new Date(Date.now() - executionTimeMs) : new Date();
    
    await pool.query(`
      INSERT INTO server_update_log 
        (server_id, update_id, status, output, triggered_by, trigger_type, exit_code, execution_time_ms, start_time, end_time, applied_at, retry_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 0)
      ON CONFLICT (server_id, update_id) 
      DO UPDATE SET 
        status = $3, 
        output = $4, 
        triggered_by = $5, 
        trigger_type = $6,
        exit_code = $7,
        execution_time_ms = $8,
        end_time = NOW(),
        applied_at = NOW(),
        retry_count = COALESCE(server_update_log.retry_count, 0) + 1
    `, [serverId, updateId, status, output, triggeredBy, triggerType, exitCode, executionTimeMs, startTime]);
    return true;
  } catch (err) {
    // CRITICAL: Audit log failure - log to console for emergency tracking
    console.error('[Updates] CRITICAL: Failed to log update result:', {
      serverId,
      updateId,
      status,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Apply all pending updates to a server (customer-initiated)
 */
async function applyAllPendingUpdates(server, userId) {
  const pending = await getPendingUpdates(server.id);
  const results = [];
  
  for (const update of pending) {
    try {
      const result = await applyUpdate(server, update, userId, 'customer');
      results.push({ updateId: update.id, title: update.title, ...result });
    } catch (err) {
      results.push({ updateId: update.id, title: update.title, success: false, error: err.message });
    }
  }
  
  return results;
}

/**
 * Get servers that haven't received a specific update
 */
async function getServersWithoutUpdate(updateId) {
  const result = await pool.query(`
    SELECT s.*, u.email as owner_email
    FROM servers s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'running'
      AND s.ip_address IS NOT NULL
      AND s.ssh_password IS NOT NULL
      AND s.id NOT IN (
        SELECT server_id FROM server_update_log 
        WHERE update_id = $1 AND status = 'success'
      )
  `, [updateId]);
  return result.rows;
}

/**
 * Get servers that failed to receive an update (for retry)
 */
async function getFailedServers(updateId) {
  const result = await pool.query(`
    SELECT s.*, sul.output as last_error, sul.retry_count
    FROM servers s
    JOIN server_update_log sul ON s.id = sul.server_id
    WHERE sul.update_id = $1 
      AND sul.status = 'failed'
      AND s.status = 'running'
      AND s.ip_address IS NOT NULL
      AND s.ssh_password IS NOT NULL
  `, [updateId]);
  return result.rows;
}

/**
 * Push update to all eligible servers (admin-initiated)
 * Rate-limited parallel execution
 */
async function pushUpdateToAll(updateId, adminId) {
  // Check kill switch
  if (await isKillSwitchActive()) {
    throw new Error('Update execution is currently disabled (kill switch active)');
  }
  
  const update = await getUpdateById(updateId);
  if (!update) {
    throw new Error('Update not found');
  }
  
  // Verify update is released
  if (update.status !== UPDATE_STATUS.RELEASED) {
    throw new Error(`Update must be released before mass push. Current status: ${update.status}`);
  }
  
  // Verify script hash
  if (update.script_hash && !verifyScriptHash(update.script, update.script_hash)) {
    throw new Error('Script integrity check failed - possible tampering');
  }
  
  const servers = await getServersWithoutUpdate(updateId);
  
  if (servers.length === 0) {
    return { pushed: 0, results: [] };
  }
  
  const rateLimit = await getRateLimit();
  const results = [];
  
  console.log(`[Updates] Admin ${adminId} pushing update ${updateId} to ${servers.length} servers (rate limit: ${rateLimit})`);
  
  // Process in batches respecting rate limit
  for (let i = 0; i < servers.length; i += rateLimit) {
    // Check kill switch before each batch
    if (await isKillSwitchActive()) {
      console.log(`[Updates] Kill switch activated during push - stopping at server ${i}`);
      results.push({ stopped: true, reason: 'Kill switch activated' });
      break;
    }
    
    const batch = servers.slice(i, i + rateLimit);
    
    const batchPromises = batch.map(async (server) => {
      try {
        const result = await applyUpdate(server, update, adminId, 'admin_push');
        return { serverId: server.id, hostname: server.hostname, ...result };
      } catch (err) {
        return { serverId: server.id, hostname: server.hostname, success: false, error: err.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Brief pause between batches
    if (i + rateLimit < servers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success && !r.stopped).length;
  
  console.log(`[Updates] Push complete: ${successCount} success, ${failCount} failed`);
  
  return { pushed: servers.length, successCount, failCount, results };
}

/**
 * Retry update on failed servers only
 */
async function retryFailedServers(updateId, adminId) {
  if (await isKillSwitchActive()) {
    throw new Error('Update execution is currently disabled');
  }
  
  const update = await getUpdateById(updateId);
  if (!update) {
    throw new Error('Update not found');
  }
  
  const failedServers = await getFailedServers(updateId);
  const results = [];
  
  for (const server of failedServers) {
    try {
      const result = await applyUpdate(server, update, adminId, 'admin_retry');
      results.push({ serverId: server.id, ...result });
    } catch (err) {
      results.push({ serverId: server.id, success: false, error: err.message });
    }
  }
  
  return results;
}

/**
 * Get all running servers for test target selection
 */
async function getEligibleTestServers() {
  const result = await pool.query(`
    SELECT s.id, s.hostname, s.ip_address, u.email as owner_email
    FROM servers s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'running'
      AND s.ip_address IS NOT NULL
      AND s.ssh_password IS NOT NULL
    ORDER BY s.hostname
  `);
  return result.rows;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Constants
  UPDATE_STATUS,
  
  // Kill switch
  isKillSwitchActive,
  setKillSwitch,
  getRateLimit,
  
  // CRUD
  getAllUpdates,
  getUpdateById,
  getPendingUpdates,
  getUpdateHistory,
  createUpdate,
  deleteUpdate,
  archiveUpdate,
  
  // Testing
  testUpdateOnServer,
  getTestResults,
  hasSuccessfulTest,
  getEligibleTestServers,
  
  // Release & Execution
  releaseUpdate,
  applyUpdate,
  applyAllPendingUpdates,
  getServersWithoutUpdate,
  getFailedServers,
  pushUpdateToAll,
  retryFailedServers,
};

/**
 * Script Validator Service
 * 
 * Validates bash scripts before they can be created as updates.
 * Ensures safety, idempotency hints, and proper error handling.
 */

const crypto = require('crypto');

// Dangerous commands that require explicit whitelist
// NOTE: Patterns use (?=\s|$) (positive lookahead) to match at end of line/string
const DANGEROUS_PATTERNS = [
  // Critical filesystem destruction
  { pattern: /\brm\s+-rf?\s+\/(?=\s|$)/i, name: 'rm -rf /', severity: 'critical' },
  { pattern: /\brm\s+-rf?\s+\/[a-z]/i, name: 'rm -rf /path', severity: 'critical' },
  { pattern: /\brm\s+-rf?\s+~\//i, name: 'rm -rf ~/', severity: 'critical' },
  { pattern: /\brm\s+-rf?\s+\*(?=\s|$)/i, name: 'rm -rf *', severity: 'critical' },
  { pattern: /\brm\s+-rf?\s+\.\.?(?=\s|$)/i, name: 'rm -rf . or ..', severity: 'critical' },
  { pattern: /\bmkfs\b/i, name: 'mkfs (format disk)', severity: 'critical' },
  { pattern: /\bdd\s+.*of=\/dev\//i, name: 'dd to device', severity: 'critical' },
  { pattern: />\s*\/dev\/[sh]d[a-z]/i, name: 'write to disk device', severity: 'critical' },
  { pattern: /\bmv\s+\/\*\s+/i, name: 'mv /* (move root)', severity: 'critical' },
  
  // Fork bombs (multiple variations)
  { pattern: /:\s*\(\s*\)\s*\{[^}]*:\s*\|/i, name: 'fork bomb', severity: 'critical' },
  { pattern: /\bfork\s*\(\s*\).*fork\s*\(/i, name: 'fork bomb variant', severity: 'critical' },
  { pattern: /\$\{\$\|\$&\}/i, name: 'fork bomb variant', severity: 'critical' },
  
  // Remote code execution
  { pattern: /\bwget\s+.*\|\s*(ba)?sh/i, name: 'pipe URL to shell', severity: 'high' },
  { pattern: /\bcurl\s+.*\|\s*(ba)?sh/i, name: 'pipe URL to shell', severity: 'high' },
  { pattern: /\bsource\s+<\s*\(\s*(curl|wget)/i, name: 'source remote script', severity: 'critical' },
  { pattern: /\beval\s+["']?\$/i, name: 'eval with variable', severity: 'high' },
  { pattern: /\bbase64\s+-d.*\|\s*(ba)?sh/i, name: 'base64 decode to shell', severity: 'critical' },
  
  // Reverse shells
  { pattern: /\/dev\/tcp\//i, name: 'bash reverse shell', severity: 'critical' },
  { pattern: /\bnc\s+-[elp].*\/bin\/(ba)?sh/i, name: 'netcat reverse shell', severity: 'critical' },
  { pattern: /\bpython[23]?\s+-c.*socket/i, name: 'python reverse shell', severity: 'critical' },
  { pattern: /\bperl\s+-e.*socket/i, name: 'perl reverse shell', severity: 'critical' },
  
  // Permission destruction
  { pattern: /\bchmod\s+(777|a\+rwx)\s+\//i, name: 'chmod 777 /', severity: 'high' },
  { pattern: /\bchown\s+-R\s+.*\s+\//i, name: 'chown -R /', severity: 'high' },
  
  // System control
  { pattern: /\bshutdown\b/i, name: 'shutdown command', severity: 'high' },
  { pattern: /\breboot\b/i, name: 'reboot command', severity: 'medium' },
  { pattern: /\bhalt\b/i, name: 'halt command', severity: 'high' },
  { pattern: /\bpoweroff\b/i, name: 'poweroff command', severity: 'high' },
  { pattern: /\binit\s+[06]\b/i, name: 'init 0/6', severity: 'high' },
  
  // Sensitive file access
  { pattern: /\/etc\/passwd/i, name: 'passwd file access', severity: 'medium' },
  { pattern: /\/etc\/shadow/i, name: 'shadow file access', severity: 'high' },
  { pattern: /\buserdel\b/i, name: 'userdel command', severity: 'high' },
  { pattern: /\bpasswd\s+--delete/i, name: 'delete password', severity: 'high' },
  { pattern: /\/root\/\.ssh/i, name: 'root SSH access', severity: 'high' },
];

// Commands that are allowed even if flagged (can be whitelisted per-update)
const WHITELISTABLE_COMMANDS = [
  'reboot',
  'apt update',
  'apt upgrade',
  'systemctl restart',
  'service restart',
];

// Required safety header for all scripts
const REQUIRED_HEADER = 'set -euo pipefail';

/**
 * Validates a bash script for safety
 * @param {string} script - The bash script to validate
 * @param {string[]} whitelist - Commands to allow even if flagged
 * @returns {{ valid: boolean, errors: string[], warnings: string[], hash: string }}
 */
function validateScript(script, whitelist = []) {
  const errors = [];
  const warnings = [];
  
  if (!script || typeof script !== 'string') {
    return { valid: false, errors: ['Script is required'], warnings: [], hash: null };
  }
  
  const trimmedScript = script.trim();
  
  // Check for empty script
  if (trimmedScript.length === 0) {
    return { valid: false, errors: ['Script cannot be empty'], warnings: [], hash: null };
  }
  
  // Check for required safety header
  const lines = trimmedScript.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const hasHeader = lines.some(line => 
    line.includes('set -e') || 
    line.includes('set -euo pipefail') ||
    line.includes('set -o errexit')
  );
  
  if (!hasHeader) {
    warnings.push(`Script should start with '${REQUIRED_HEADER}' for proper error handling`);
  }
  
  // Check for dangerous patterns
  for (const { pattern, name, severity } of DANGEROUS_PATTERNS) {
    // Reset lastIndex for patterns with global flag
    pattern.lastIndex = 0;
    
    if (pattern.test(trimmedScript)) {
      // Check if whitelisted - require exact word match, not substring
      const isWhitelisted = whitelist.some(w => {
        // Escape regex special chars in whitelist item and require word boundary
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        return regex.test(trimmedScript);
      });
      
      if (!isWhitelisted) {
        if (severity === 'critical') {
          errors.push(`BLOCKED: Dangerous command detected - ${name}`);
        } else if (severity === 'high') {
          errors.push(`HIGH RISK: Potentially dangerous command - ${name}. Add to whitelist if intentional.`);
        } else {
          warnings.push(`CAUTION: ${name} detected - verify this is intentional`);
        }
      }
    }
  }
  
  // Check for hardcoded secrets (basic detection)
  const secretPatterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][^'"]+['"]/gi,
  ];
  
  for (const pattern of secretPatterns) {
    if (pattern.test(trimmedScript)) {
      warnings.push('Script may contain hardcoded secrets - use environment variables instead');
      break;
    }
  }
  
  // Check for infinite loops
  if (/while\s+true|while\s+:\s*;|while\s+\[\s*1\s*\]/.test(trimmedScript)) {
    if (!trimmedScript.includes('break') && !trimmedScript.includes('exit')) {
      warnings.push('Infinite loop detected without break/exit - ensure this is intentional');
    }
  }
  
  // Check script length
  if (trimmedScript.length > 50000) {
    errors.push('Script exceeds maximum length of 50KB');
  }
  
  // Generate hash for immutability
  const hash = crypto.createHash('sha256').update(trimmedScript).digest('hex');
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hash
  };
}

/**
 * Prepends safety headers to a script if missing
 * @param {string} script - Original script
 * @returns {string} - Script with safety headers
 */
function ensureSafetyHeaders(script) {
  const trimmed = script.trim();
  
  // Check if shebang exists
  const hasShebang = trimmed.startsWith('#!/');
  const lines = trimmed.split('\n');
  
  // Find where to insert safety header
  let insertIndex = 0;
  if (hasShebang) {
    insertIndex = 1;
    // Skip any comments after shebang
    while (insertIndex < lines.length && lines[insertIndex].trim().startsWith('#')) {
      insertIndex++;
    }
  }
  
  // Check if safety header already exists in first few lines
  const firstFewLines = lines.slice(0, Math.min(5, lines.length)).join('\n');
  if (firstFewLines.includes('set -e') || firstFewLines.includes('set -o errexit')) {
    return trimmed;
  }
  
  // Insert safety header
  lines.splice(insertIndex, 0, REQUIRED_HEADER);
  return lines.join('\n');
}

/**
 * Generates a SHA-256 hash of the script for immutability verification
 * @param {string} script 
 * @returns {string}
 */
function hashScript(script) {
  if (!script || typeof script !== 'string') {
    throw new Error('hashScript requires a non-empty string');
  }
  return crypto.createHash('sha256').update(script.trim()).digest('hex');
}

/**
 * Verifies a script against its stored hash (timing-safe comparison)
 * @param {string} script 
 * @param {string} expectedHash 
 * @returns {boolean}
 */
function verifyScriptHash(script, expectedHash) {
  if (!script || !expectedHash) {
    return false;
  }
  const actualHash = hashScript(script);
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (err) {
    // Buffers of different lengths throw - hashes don't match
    return false;
  }
}

/**
 * Extracts a summary of what the script does (first comment block or first N commands)
 * @param {string} script 
 * @returns {string}
 */
function extractScriptSummary(script) {
  const lines = script.trim().split('\n');
  const comments = [];
  const commands = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && !trimmed.startsWith('#!/')) {
      comments.push(trimmed.replace(/^#\s*/, ''));
    } else if (trimmed && !trimmed.startsWith('set ')) {
      commands.push(trimmed);
      if (commands.length >= 3) break;
    }
  }
  
  if (comments.length > 0) {
    return comments.slice(0, 3).join(' ');
  }
  
  return commands.slice(0, 3).join('; ').substring(0, 200);
}

module.exports = {
  validateScript,
  ensureSafetyHeaders,
  hashScript,
  verifyScriptHash,
  extractScriptSummary,
  REQUIRED_HEADER,
  DANGEROUS_PATTERNS,
  WHITELISTABLE_COMMANDS,
};

const crypto = require('crypto');

// Generate a 6-digit confirmation code (cryptographically secure)
function generateConfirmationCode() {
  // Generate random number between 100000-999999 using crypto
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const code = 100000 + (randomNumber % 900000);
  return code.toString();
}

// Get expiration time (4 minutes from now)
function getCodeExpiration() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 4);
  return expiresAt;
}

// Create code object with expiration
function createConfirmationCode() {
  return {
    code: generateConfirmationCode(),
    expiresAt: getCodeExpiration()
  };
}

// Check if code is still valid
function isCodeValid(expiresAt) {
  return new Date() < new Date(expiresAt);
}

module.exports = {
  generateConfirmationCode,
  getCodeExpiration,
  createConfirmationCode,
  isCodeValid
};

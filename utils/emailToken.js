const crypto = require('crypto');

// Generate a 6-digit confirmation code
function generateConfirmationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get expiration time (15 minutes from now)
function getCodeExpiration() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
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

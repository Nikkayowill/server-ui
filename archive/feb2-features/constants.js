// Application constants - eliminates magic strings and numbers

// Server statuses
const SERVER_STATUS = {
  PROVISIONING: 'provisioning',
  RUNNING: 'running',
  STOPPED: 'stopped',
  FAILED: 'failed',
  DELETED: 'deleted'
};

// Deployment statuses
const DEPLOYMENT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  FAILED: 'failed'
};

// Payment statuses
const PAYMENT_STATUS = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PENDING: 'pending'
};

// User roles
const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin'
};

// Timeouts (in milliseconds)
const TIMEOUTS = {
  SSH_CONNECTION: 30 * 1000,         // 30 seconds
  SSH_COMMAND: 15 * 60 * 1000,       // 15 minutes
  DEPLOYMENT: 30 * 60 * 1000,        // 30 minutes
  IP_POLLING_INTERVAL: 10 * 1000,    // 10 seconds
  IP_POLLING_MAX_DURATION: 5 * 60 * 1000,  // 5 minutes
  IP_POLLING_MAX_ATTEMPTS: 30        // 30 attempts
};

// Network ports
const PORTS = {
  SSH: 22,
  HTTP: 80,
  HTTPS: 443,
  APP_DEFAULT: 3000,
  POSTGRES: 5432,
  MYSQL: 3306,
  MONGODB: 27017
};

// Pricing plans (amounts in cents) - ACTUAL PRICING IS IN paymentController.js
// These constants are for reference only
const PRICING_PLANS = {
  basic: {
    name: 'Basic Plan',
    monthlyPrice: 1500,     // $15.00/month
    yearlyPrice: 16200,     // $162.00/year (save 10%)
    displayPrice: '$15/mo',
    ram: '1GB',
    cpu: 1,
    storage: '25GB',
    dropletSize: 's-1vcpu-1gb',
    maxSites: 2             // Max domains/sites
  },
  pro: {
    name: 'Pro Plan',
    monthlyPrice: 3500,     // $35.00/month
    yearlyPrice: 37800,     // $378.00/year (save 10%)
    displayPrice: '$35/mo',
    ram: '2GB',
    cpu: 2,
    storage: '60GB',
    dropletSize: 's-2vcpu-2gb',
    maxSites: 5             // Max domains/sites
  },
  premium: {
    name: 'Premium Plan',
    monthlyPrice: 7500,     // $75.00/month
    yearlyPrice: 81000,     // $810.00/year (save 10%)
    displayPrice: '$75/mo',
    ram: '4GB',
    cpu: 2,
    storage: '80GB',
    dropletSize: 's-2vcpu-4gb',
    maxSites: 10            // Max domains/sites
  }
};

// Valid DigitalOcean regions
const DO_REGIONS = [
  'nyc1', 'nyc3', 'sfo3', 'sgp1', 'lon1', 
  'fra1', 'tor1', 'blr1', 'syd1'
];

// Session configuration
const SESSION_CONFIG = {
  MAX_AGE: 7 * 24 * 60 * 60 * 1000,  // 7 days
  COOKIE_NAME: 'sessionId'
};

// Email configuration
const EMAIL_CONFIG = {
  TOKEN_LENGTH: 6,
  TOKEN_EXPIRY_MINUTES: 10,
  RESET_TOKEN_EXPIRY_HOURS: 1
};

module.exports = {
  SERVER_STATUS,
  DEPLOYMENT_STATUS,
  PAYMENT_STATUS,
  USER_ROLE,
  TIMEOUTS,
  PORTS,
  PRICING_PLANS,
  DO_REGIONS,
  SESSION_CONFIG,
  EMAIL_CONFIG
};

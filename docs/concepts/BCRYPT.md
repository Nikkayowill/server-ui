# Bcrypt - Password Security

## What It Is

Bcrypt is a password hashing algorithm that's intentionally slow. It turns passwords into irreversible strings that are safe to store in databases.

## Why Plain Text Passwords Are Dangerous

**Bad (never do this):**
```javascript
// Storing password directly
await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);

// Later: Database breach
// Attacker gets: "test@test.com, password123"
// Uses same password on Gmail, Twitter, bank accounts
// Customer's entire online life compromised
```

**85% of people reuse passwords.** One database leak = access to everything.

## How Bcrypt Works

### 1. Registration (Hashing)

```javascript
// controllers/authController.js
const bcrypt = require('bcrypt');

app.post('/register', async (req, res) => {
  const { email, password } = req.body; // "password123"
  
  // Hash with 10 rounds (takes ~100ms)
  const hashedPassword = await bcrypt.hash(password, 10);
  // Result: "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
  
  // Store hash, NOT original password
  await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', 
    [email, hashedPassword]);
});
```

**What "10 rounds" means:**
- Password hashed 2^10 = 1,024 times
- Each round makes brute-forcing exponentially harder
- Takes ~100ms on modern CPU (acceptable for login)
- Takes years to crack with dictionary attack

### 2. Login (Verification)

```javascript
app.post('/login', async (req, res) => {
  const { email, password } = req.body; // "password123"
  
  // Get stored hash from database
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const storedHash = user.rows[0].password_hash; // "$2b$10$N9qo8..."
  
  // Compare password to hash (also takes ~100ms)
  const validPassword = await bcrypt.compare(password, storedHash);
  
  if (validPassword) {
    req.session.userId = user.rows[0].id;
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=invalid_credentials');
  }
});
```

**Why this is secure:**
- Attacker steals database → gets hash "$2b$10$N9qo8..."
- Hash is irreversible (can't get "password123" back)
- Must try billions of passwords to find match
- At 10 rounds, would take years per password

## Salt (Unique Hashes)

Bcrypt automatically adds a **salt** (random data) to each password:

```javascript
// Two users with same password
bcrypt.hash('password123', 10);
// User 1: "$2b$10$abc123...xyz789"

bcrypt.hash('password123', 10);
// User 2: "$2b$10$def456...uvw012"
```

**Different hashes for same password!**

**Why salting matters:**
- Attacker can't use "rainbow tables" (precomputed hash lists)
- Can't search for "which users have password123?"
- Must crack each password individually

## Why Bcrypt (vs Alternatives)

**MD5/SHA-1 (NEVER USE):**
- Designed for speed (millions of hashes/second)
- Can brute-force in hours with GPU
- No built-in salt

**SHA-256 (NOT FOR PASSWORDS):**
- Fast (still too fast)
- No built-in salt
- Good for checksums, bad for passwords

**Bcrypt (RECOMMENDED):**
- Intentionally slow (configurable)
- Built-in salt
- Battle-tested (20+ years)
- Designed specifically for passwords

**Argon2 (ALTERNATIVE):**
- Newer than bcrypt
- Memory-hard (harder to crack with specialized hardware)
- Good choice, but bcrypt is fine

## Security Benefits

### 1. Database Breach Protection

**Your database leaked on dark web:**
```
email                | password_hash
test@test.com       | $2b$10$N9qo8uLOickgx2ZMRZoMye...
admin@site.com      | $2b$10$K8pl9xPNvwqrx3APQEoLse...
user@site.com       | $2b$10$T5rs7mQXbhjkx4CRWTpOpe...
```

**Attacker can't:**
- See original passwords
- Use hashes to login (must crack first)
- Search for common passwords (each hash unique due to salt)

**Attacker must:**
- Rent GPU cluster ($1000s/month)
- Try billions of guesses per password
- Spend years cracking strong passwords

### 2. Employee Trust

**Without bcrypt:**
- Admin looks at database → sees all passwords
- Support staff reset password → sees user's password
- Temp intern has access → steals passwords

**With bcrypt:**
- No one can see passwords, not even you
- Password reset generates new hash
- Zero-knowledge security

### 3. Regulatory Compliance

**GDPR (Europe), CCPA (California):**
- Passwords must be "adequately protected"
- Bcrypt = industry standard
- Plain text = massive fines

## Implementation Details

**Cost factor (rounds):**
```javascript
// 10 rounds = ~100ms per hash (current standard)
bcrypt.hash(password, 10);

// 12 rounds = ~400ms per hash (more secure, slower)
bcrypt.hash(password, 12);

// 8 rounds = ~25ms per hash (too fast, insecure)
bcrypt.hash(password, 8); // Don't do this
```

**Our choice: 10 rounds**
- Fast enough for good UX (login feels instant)
- Slow enough to deter attackers
- Industry standard

**Future-proofing:**
CPUs get faster → increase rounds every few years:
```javascript
const BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || 10;
```

### Password Strength Recommendations

**Weak (crackable in days):**
- `password123`
- `qwerty`
- `12345678`

**Strong (years to crack):**
- `Tr0ub4dor&3` (11 chars, mixed case, symbols)
- `correct horse battery staple` (28 chars, all lowercase)

**Our requirements:**
```javascript
body('password').isLength({ min: 8 })
```

Minimum 8 characters. Should enforce stronger rules:
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/[A-Z]/) // At least one uppercase
  .matches(/[a-z]/) // At least one lowercase
  .matches(/[0-9]/) // At least one number
```

## Customer Value

**What customers see:**
- "Your password is secure and encrypted"
- Can't recover forgotten passwords (must reset)
- No emails with plaintext passwords

**What customers don't see:**
- Database breach happens → their password still safe
- Employee snooping prevented
- Regulatory compliance maintained
- Your reputation protected

---

Bcrypt = the shield between database breaches and customer account takeovers.  
Without it: Database leak = game over.  
With it: Database leak = annoying, but customers stay safe.

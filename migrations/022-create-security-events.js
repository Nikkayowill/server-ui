-- Security Events Table for Audit Logging
-- Run this migration to enable security event tracking

CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    email VARCHAR(255), -- For failed login attempts where user doesn't exist
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Event types to track:
-- LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED
-- REGISTER_SUCCESS, REGISTER_FAILED
-- PASSWORD_RESET_REQUESTED, PASSWORD_RESET_SUCCESS
-- PASSWORD_CHANGED
-- EMAIL_CONFIRMED
-- SESSION_CREATED, SESSION_DESTROYED
-- ADMIN_ACTION
-- RATE_LIMIT_EXCEEDED
-- CSRF_REJECTED
-- SUSPICIOUS_ACTIVITY

COMMENT ON TABLE security_events IS 'Audit log for security-relevant events';

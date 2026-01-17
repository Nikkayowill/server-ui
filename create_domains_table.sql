CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domains_server_id ON domains(server_id);
CREATE INDEX idx_domains_user_id ON domains(user_id);

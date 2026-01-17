CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    git_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed')),
    output TEXT,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deployments_server_id ON deployments(server_id);
CREATE INDEX idx_deployments_user_id ON deployments(user_id);

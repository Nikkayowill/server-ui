ALTER TABLE servers ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE servers ADD COLUMN IF NOT EXISTS ssl_status VARCHAR(50) DEFAULT 'none' CHECK (ssl_status IN ('none', 'pending', 'active', 'failed', 'expired'));

-- Add stripe_charge_id column to servers table to track payments
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

-- Create index for faster lookups when webhooks arrive
CREATE INDEX IF NOT EXISTS idx_servers_stripe_charge_id ON servers(stripe_charge_id);

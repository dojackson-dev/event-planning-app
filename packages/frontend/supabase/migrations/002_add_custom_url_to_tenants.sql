-- Add custom_url column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_url VARCHAR(255);

COMMENT ON COLUMN tenants.custom_url IS 'Custom website URL for the tenant if they have one';

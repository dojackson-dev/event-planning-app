-- Create website_configs table for storing tenant website configurations
CREATE TABLE IF NOT EXISTS website_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_color VARCHAR(7) DEFAULT '#3b82f6',
  logo_url VARCHAR(500),
  hero_title VARCHAR(255) NOT NULL,
  hero_subtitle TEXT,
  about_text TEXT,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  address TEXT,
  show_booking_form BOOLEAN DEFAULT true,
  show_gallery BOOLEAN DEFAULT true,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create index on tenant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_configs_tenant_id ON website_configs(tenant_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_website_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_configs_updated_at
  BEFORE UPDATE ON website_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_website_configs_updated_at();

-- Add comment
COMMENT ON TABLE website_configs IS 'Stores website configuration for each tenant to build their frontend';

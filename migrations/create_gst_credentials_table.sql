-- Create gst_credentials table
CREATE TABLE IF NOT EXISTS gst_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    gstin VARCHAR(15) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password TEXT NOT NULL, -- In production, this should be encrypted
    client_id VARCHAR(100),
    client_secret TEXT, -- In production, this should be encrypted
    is_sandbox BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gst_credentials_company_id ON gst_credentials(company_id);

-- Add comments for documentation
COMMENT ON TABLE gst_credentials IS 'GST credentials for Whitebooks GSP integration';
COMMENT ON COLUMN gst_credentials.gstin IS 'GST Identification Number';
COMMENT ON COLUMN gst_credentials.username IS 'Whitebooks/GST portal username';
COMMENT ON COLUMN gst_credentials.password IS 'Whitebooks/GST portal password (encrypted in production)';
COMMENT ON COLUMN gst_credentials.client_id IS 'Whitebooks API client ID';
COMMENT ON COLUMN gst_credentials.client_secret IS 'Whitebooks API client secret (encrypted in production)';
COMMENT ON COLUMN gst_credentials.is_sandbox IS 'Whether to use sandbox environment';
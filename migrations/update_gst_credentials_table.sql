-- Update gst_credentials table to add missing columns
ALTER TABLE public.gst_credentials 
ADD COLUMN IF NOT EXISTS client_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_secret TEXT,
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'whitebooks';

-- Add comments for documentation
COMMENT ON COLUMN public.gst_credentials.client_id IS 'Whitebooks API client ID';
COMMENT ON COLUMN public.gst_credentials.client_secret IS 'Whitebooks API client secret (encrypted in production)';
COMMENT ON COLUMN public.gst_credentials.provider IS 'GSP provider (whitebooks, etc.)';
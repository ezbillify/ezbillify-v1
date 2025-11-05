-- Migration: Add UPI fields to bank_accounts table
-- Date: 2024-11-05
-- Description: Add UPI ID and UPI QR code fields to support UPI payments

-- Add UPI ID column to bank_accounts table
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255) NULL;

-- Add UPI QR code column to bank_accounts table
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS upi_qr_code TEXT NULL;

-- Add comments to describe the new columns
COMMENT ON COLUMN public.bank_accounts.upi_id IS 'UPI ID for the bank account (e.g., username@bank)';
COMMENT ON COLUMN public.bank_accounts.upi_qr_code IS 'Generated UPI QR code for the account';

-- Create index on UPI ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_upi_id 
ON public.bank_accounts (upi_id);

-- Update existing records to ensure consistency
UPDATE public.bank_accounts 
SET upi_id = NULL 
WHERE upi_id = '';

UPDATE public.bank_accounts 
SET upi_qr_code = NULL 
WHERE upi_qr_code = '';
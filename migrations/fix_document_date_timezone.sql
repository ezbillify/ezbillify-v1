-- Migration: Change document_date from date to timestamp with time zone
-- This fixes the issue where times were showing as 5:30 AM

-- Step 1: Add new column with timestamp type
ALTER TABLE sales_documents
ADD COLUMN document_date_new timestamp with time zone;

-- Step 2: Copy existing dates to new column (set to noon IST to avoid confusion)
UPDATE sales_documents
SET document_date_new = document_date + interval '12 hours';

-- Step 3: Drop old column
ALTER TABLE sales_documents
DROP COLUMN document_date;

-- Step 4: Rename new column to original name
ALTER TABLE sales_documents
RENAME COLUMN document_date_new TO document_date;

-- Step 5: Set NOT NULL constraint and default
ALTER TABLE sales_documents
ALTER COLUMN document_date SET NOT NULL,
ALTER COLUMN document_date SET DEFAULT now();

-- Step 6: Recreate the index
DROP INDEX IF EXISTS idx_sales_documents_date;
CREATE INDEX idx_sales_documents_date ON sales_documents USING btree (document_date);

-- Step 7: Also update created_at and updated_at if they're not already timestamptz
-- (They should already be correct based on your schema, but let's verify)

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sales_documents'
  AND column_name IN ('document_date', 'created_at', 'updated_at', 'due_date')
ORDER BY column_name;

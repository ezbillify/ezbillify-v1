-- Migration: Change document_date from date to timestamp with time zone
-- This version uses created_at time for more accuracy

-- Step 1: Add new column with timestamp type
ALTER TABLE sales_documents
ADD COLUMN document_date_new timestamp with time zone;

-- Step 2: Copy existing dates to new column
-- If created_at exists and has a time, use that time component
-- Otherwise, default to noon
UPDATE sales_documents
SET document_date_new = CASE
  WHEN created_at IS NOT NULL THEN
    -- Combine document_date with the time from created_at
    document_date + (created_at::time)
  ELSE
    -- If no created_at, default to noon
    document_date + interval '12 hours'
END;

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

-- Verify the changes
SELECT
  id,
  document_number,
  document_date,
  created_at,
  EXTRACT(HOUR FROM document_date) as hour_part,
  EXTRACT(MINUTE FROM document_date) as minute_part
FROM sales_documents
ORDER BY created_at DESC
LIMIT 10;

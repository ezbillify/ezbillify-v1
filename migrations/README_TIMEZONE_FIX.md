# Database Migration: Fix Document Date to Support Time

## Problem

The `sales_documents.document_date` column is defined as `date` type, which only stores dates (YYYY-MM-DD) without time information. This causes all invoices to show 5:30 AM when converted to timestamp for display.

## Solution

Change the column type from `date` to `timestamp with time zone` (timestamptz) to store both date and time information.

## Migration Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and execute the migration file: `migrations/fix_document_date_timezone.sql`
4. Verify the changes by checking the results

### Option 2: Using Supabase CLI

```bash
# Run the migration
supabase db execute -f migrations/fix_document_date_timezone.sql

# Or if you have migrations set up
supabase migration new fix_document_date_timezone
# Then copy the SQL content and run
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your PostgreSQL database and run:

```sql
-- Change document_date to timestamp with time zone
ALTER TABLE sales_documents
ADD COLUMN document_date_new timestamp with time zone;

UPDATE sales_documents
SET document_date_new = document_date + interval '12 hours';

ALTER TABLE sales_documents
DROP COLUMN document_date;

ALTER TABLE sales_documents
RENAME COLUMN document_date_new TO document_date;

ALTER TABLE sales_documents
ALTER COLUMN document_date SET NOT NULL,
ALTER COLUMN document_date SET DEFAULT now();

DROP INDEX IF EXISTS idx_sales_documents_date;
CREATE INDEX idx_sales_documents_date ON sales_documents USING btree (document_date);
```

## What This Changes

### Before:
```sql
document_date date not null default CURRENT_DATE
```
- Stores only: `2025-11-18`
- Displays as: `18 Nov 2025 5:30 AM` ❌

### After:
```sql
document_date timestamp with time zone not null default now()
```
- Stores: `2025-11-18 14:30:00+05:30`
- Displays as: `18 Nov 2025 2:30 PM` ✅

## Impact on Existing Data

- **Existing invoices**: Will have time set to 12:00 PM (noon) as a reasonable default
- **New invoices**: Will store the actual creation time in IST
- **No data loss**: All existing dates are preserved

## Verification

After running the migration, verify it worked:

```sql
-- Check column type
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sales_documents'
  AND column_name = 'document_date';

-- Should show:
-- column_name   | data_type                   | is_nullable | column_default
-- document_date | timestamp with time zone    | NO          | now()

-- Check some sample data
SELECT id, document_number, document_date, created_at
FROM sales_documents
ORDER BY created_at DESC
LIMIT 5;
```

## Rollback (If Needed)

If you need to rollback (not recommended):

```sql
ALTER TABLE sales_documents
ADD COLUMN document_date_old date;

UPDATE sales_documents
SET document_date_old = document_date::date;

ALTER TABLE sales_documents
DROP COLUMN document_date;

ALTER TABLE sales_documents
RENAME COLUMN document_date_old TO document_date;

ALTER TABLE sales_documents
ALTER COLUMN document_date SET NOT NULL,
ALTER COLUMN document_date SET DEFAULT CURRENT_DATE;
```

## Notes

- ⚠️ **Backup First**: Always backup your database before running migrations
- ✅ **Test Environment**: Test in development/staging environment first
- 📝 **Schedule**: Run during low-traffic periods if possible
- 🔄 **Dependencies**: This migration is required for the IST timezone fix to work

## After Migration

Once the migration is complete:

1. Restart your application (if necessary)
2. Create a test invoice
3. Verify the time shows correctly on all templates
4. Check that existing invoices display their times correctly

## Additional Migrations Needed

You may also want to update `due_date` and `valid_until` columns if they need time information:

```sql
-- For due_date (optional - usually only date is needed)
-- For valid_until (optional - usually only date is needed)
```

For these columns, keeping them as `date` type is usually fine since they represent deadlines, not specific moments in time.

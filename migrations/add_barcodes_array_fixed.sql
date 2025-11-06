-- Migration: Add barcodes array column and migrate existing data
-- This script safely handles the transition from single barcode to multiple barcodes

-- Step 1: Add the new barcodes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'barcodes'
  ) THEN
    ALTER TABLE items ADD COLUMN barcodes text[];
    RAISE NOTICE 'Created barcodes column';
  ELSE
    RAISE NOTICE 'barcodes column already exists';
  END IF;
END $$;

-- Step 2: Migrate data from old barcode column to new barcodes array (if barcode column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'barcode'
  ) THEN
    -- Migrate non-null barcodes
    UPDATE items
    SET barcodes = ARRAY[barcode]
    WHERE barcode IS NOT NULL
      AND barcode != ''
      AND (barcodes IS NULL OR array_length(barcodes, 1) IS NULL);

    RAISE NOTICE 'Migrated data from barcode to barcodes';

    -- Rename old column to keep it as backup
    ALTER TABLE items RENAME COLUMN barcode TO barcode_old;
    RAISE NOTICE 'Renamed barcode column to barcode_old';
  ELSE
    RAISE NOTICE 'barcode column does not exist, skipping migration';
  END IF;
END $$;

-- Step 3: Create GIN index for fast array searches
CREATE INDEX IF NOT EXISTS idx_items_barcodes_gin ON items USING GIN (barcodes);

-- Step 4: Drop old trigger if it exists
DROP TRIGGER IF EXISTS check_barcode_uniqueness_trigger ON items;

-- Step 5: Create or replace the barcode uniqueness check function
CREATE OR REPLACE FUNCTION check_barcode_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  existing_item RECORD;
  barcode_value TEXT;
BEGIN
  -- Only check if barcodes array is not empty
  IF NEW.barcodes IS NULL OR array_length(NEW.barcodes, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check each barcode in the array
  FOREACH barcode_value IN ARRAY NEW.barcodes
  LOOP
    -- Look for any other item in the same company with this barcode
    SELECT id, item_name, item_code
    INTO existing_item
    FROM items
    WHERE company_id = NEW.company_id
      AND id != COALESCE(NEW.id, 0) -- Exclude current item if updating
      AND barcodes @> ARRAY[barcode_value]::text[] -- Array contains operator
      AND deleted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Barcode "%" is already assigned to item: % (Code: %)',
        barcode_value, existing_item.item_name, existing_item.item_code
        USING HINT = 'Each barcode must be unique within your company';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for new inserts and updates
CREATE TRIGGER check_barcode_uniqueness_trigger
  BEFORE INSERT OR UPDATE OF barcodes ON items
  FOR EACH ROW
  EXECUTE FUNCTION check_barcode_uniqueness();

-- Step 7: Handle items with NULL barcodes (set to empty array)
UPDATE items
SET barcodes = ARRAY[]::text[]
WHERE barcodes IS NULL;

-- Step 8: Verify the migration
DO $$
DECLARE
  total_items INTEGER;
  items_with_barcodes INTEGER;
  empty_barcode_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items FROM items WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO items_with_barcodes FROM items WHERE barcodes IS NOT NULL AND array_length(barcodes, 1) > 0 AND deleted_at IS NULL;
  SELECT COUNT(*) INTO empty_barcode_items FROM items WHERE (barcodes IS NULL OR array_length(barcodes, 1) IS NULL) AND deleted_at IS NULL;

  RAISE NOTICE '==== Migration Complete ====';
  RAISE NOTICE 'Total items: %', total_items;
  RAISE NOTICE 'Items with barcodes: %', items_with_barcodes;
  RAISE NOTICE 'Items without barcodes: %', empty_barcode_items;
END $$;

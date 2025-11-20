-- Workforce Tasks Feature Migration
-- Created: 2025-11-19
-- Purpose: Enable barcode scanning tasks for workforce users with real-time sync

-- =====================================================
-- 1. CREATE WORKFORCE_TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workforce_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Task metadata
  task_type VARCHAR(50) NOT NULL DEFAULT 'barcode_scan',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: 'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'terminated'

  -- Customer info (for invoice context)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),

  -- Scanned items (aggregated from scanned_items_log)
  scanned_items JSONB DEFAULT '[]'::jsonb,

  -- Status timestamps
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_company_id ON workforce_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_status ON workforce_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_created_by ON workforce_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_assigned_to ON workforce_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_created_at ON workforce_tasks(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE workforce_tasks IS 'Tasks sent to workforce users for barcode scanning';
COMMENT ON COLUMN workforce_tasks.scanned_items IS 'Aggregated scanned items from scanned_items_log table (auto-synced via trigger)';
COMMENT ON COLUMN workforce_tasks.status IS 'Task status: pending, accepted, in_progress, completed, cancelled, terminated';

-- =====================================================
-- 2. CREATE SCANNED_ITEMS_LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scanned_items_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Item details
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(100),
  barcode VARCHAR(255) NOT NULL,

  -- Quantity and pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  mrp DECIMAL(10, 2),

  -- Scan metadata
  scanned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scanned_items_task_id ON scanned_items_log(task_id);
CREATE INDEX IF NOT EXISTS idx_scanned_items_company_id ON scanned_items_log(company_id);
CREATE INDEX IF NOT EXISTS idx_scanned_items_scanned_at ON scanned_items_log(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scanned_items_barcode ON scanned_items_log(barcode);

-- Add comments
COMMENT ON TABLE scanned_items_log IS 'Audit log of all items scanned by workforce users';
COMMENT ON COLUMN scanned_items_log.barcode IS 'The actual barcode that was scanned';

-- =====================================================
-- 3. CREATE AUTO-UPDATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_workforce_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workforce_tasks_updated_at
  BEFORE UPDATE ON workforce_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_workforce_tasks_updated_at();

-- =====================================================
-- 4. CREATE AUTO-SYNC TRIGGER FOR SCANNED_ITEMS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_scanned_items_to_task()
RETURNS TRIGGER AS $$
DECLARE
  existing_item JSONB;
  new_item JSONB;
  updated_items JSONB;
BEGIN
  -- Build the new scanned item as JSONB
  new_item := jsonb_build_object(
    'id', NEW.id,
    'item_id', NEW.item_id,
    'item_name', NEW.item_name,
    'item_code', NEW.item_code,
    'barcode', NEW.barcode,
    'quantity', NEW.quantity,
    'mrp', NEW.mrp,
    'scanned_by', NEW.scanned_by,
    'scanned_at', NEW.scanned_at
  );

  -- Get current scanned_items array
  SELECT scanned_items INTO updated_items
  FROM workforce_tasks
  WHERE id = NEW.task_id;

  -- Check if item already exists in array (by item_id)
  IF NEW.item_id IS NOT NULL THEN
    -- Try to find existing item by item_id
    SELECT elem INTO existing_item
    FROM jsonb_array_elements(updated_items) elem
    WHERE elem->>'item_id' = NEW.item_id::text
    LIMIT 1;

    IF existing_item IS NOT NULL THEN
      -- Update quantity of existing item
      updated_items := (
        SELECT jsonb_agg(
          CASE
            WHEN elem->>'item_id' = NEW.item_id::text
            THEN jsonb_set(elem, '{quantity}', to_jsonb((elem->>'quantity')::decimal + NEW.quantity))
            ELSE elem
          END
        )
        FROM jsonb_array_elements(updated_items) elem
      );
    ELSE
      -- Add new item to array
      updated_items := updated_items || new_item;
    END IF;
  ELSE
    -- Item not found in database, just add to array
    updated_items := updated_items || new_item;
  END IF;

  -- Update workforce_tasks with new scanned_items array
  UPDATE workforce_tasks
  SET
    scanned_items = updated_items,
    status = CASE
      WHEN status = 'accepted' THEN 'in_progress'
      ELSE status
    END,
    started_at = CASE
      WHEN status = 'accepted' THEN NOW()
      ELSE started_at
    END
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_scanned_items
  AFTER INSERT ON scanned_items_log
  FOR EACH ROW
  EXECUTE FUNCTION sync_scanned_items_to_task();

COMMENT ON FUNCTION sync_scanned_items_to_task() IS 'Auto-sync scanned items from log to workforce_tasks.scanned_items JSONB array';

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE workforce_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items_log ENABLE ROW LEVEL SECURITY;

-- ===== WORKFORCE_TASKS POLICIES =====

-- Policy: Admin users can view all tasks in their company
CREATE POLICY "Admin users can view all tasks in their company"
  ON workforce_tasks
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Workforce users can view tasks in their company
CREATE POLICY "Workforce users can view tasks in their company"
  ON workforce_tasks
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('workforce', 'admin')
    )
  );

-- Policy: Admin users can create tasks
CREATE POLICY "Admin users can create tasks"
  ON workforce_tasks
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admin users can update their company's tasks
CREATE POLICY "Admin users can update their company tasks"
  ON workforce_tasks
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Workforce users can update tasks assigned to them
CREATE POLICY "Workforce users can update their assigned tasks"
  ON workforce_tasks
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'workforce'
    )
  );

-- Policy: Admin users can delete their company's tasks
CREATE POLICY "Admin users can delete their company tasks"
  ON workforce_tasks
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ===== SCANNED_ITEMS_LOG POLICIES =====

-- Policy: Users can view scanned items for tasks in their company
CREATE POLICY "Users can view scanned items in their company"
  ON scanned_items_log
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Workforce users can insert scanned items
CREATE POLICY "Workforce users can insert scanned items"
  ON scanned_items_log
  FOR INSERT
  WITH CHECK (
    scanned_by = auth.uid()
    AND company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('workforce', 'admin')
    )
  );

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON workforce_tasks TO authenticated;
GRANT SELECT, INSERT ON scanned_items_log TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification query (run this to test):
-- SELECT
--   t.id,
--   t.task_type,
--   t.status,
--   t.customer_name,
--   jsonb_array_length(t.scanned_items) as items_count,
--   t.created_at,
--   u.email as created_by_email
-- FROM workforce_tasks t
-- LEFT JOIN users u ON t.created_by = u.id
-- ORDER BY t.created_at DESC;

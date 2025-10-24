-- =====================================================
-- RLS POLICIES FOR CUSTOMERS TABLE
-- =====================================================
-- These policies ensure users can only access customers
-- belonging to their company
-- =====================================================

-- First, enable RLS on the customers table (if not already enabled)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_view_company_customers" ON public.customers;
DROP POLICY IF EXISTS "users_insert_company_customers" ON public.customers;
DROP POLICY IF EXISTS "users_update_company_customers" ON public.customers;
DROP POLICY IF EXISTS "users_delete_company_customers" ON public.customers;

-- =====================================================
-- SELECT POLICY - Users can view customers from their company
-- =====================================================
CREATE POLICY "users_view_company_customers"
ON public.customers
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
    AND company_id IS NOT NULL
  )
);

-- =====================================================
-- INSERT POLICY - Users can create customers for their company
-- =====================================================
CREATE POLICY "users_insert_company_customers"
ON public.customers
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
    AND company_id IS NOT NULL
  )
);

-- =====================================================
-- UPDATE POLICY - Users can update customers from their company
-- =====================================================
CREATE POLICY "users_update_company_customers"
ON public.customers
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
    AND company_id IS NOT NULL
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
    AND company_id IS NOT NULL
  )
);

-- =====================================================
-- DELETE POLICY - Users can delete (soft delete) customers from their company
-- =====================================================
CREATE POLICY "users_delete_company_customers"
ON public.customers
FOR DELETE
USING (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
    AND company_id IS NOT NULL
  )
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify policies are created correctly:

-- 1. Check if RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'customers';

-- 2. View all policies on customers table
-- SELECT * FROM pg_policies WHERE tablename = 'customers';

-- 3. Test customer count for current user
-- SELECT COUNT(*) FROM customers;

-- =====================================================
-- NOTES:
-- =====================================================
-- - These policies assume you have a 'users' table with 'company_id' column
-- - Users must have a valid company_id to access customers
-- - All operations (SELECT, INSERT, UPDATE, DELETE) are scoped to the user's company
-- - The soft delete is handled by the application logic (setting status = 'inactive')

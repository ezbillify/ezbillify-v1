-- =====================================================
-- FIX EXISTING RLS POLICY FOR CUSTOMERS TABLE
-- =====================================================
-- Your existing policy uses get_current_company_id()
-- This script will check if the function exists and fix it
-- =====================================================

-- STEP 1: Check if the function exists
-- Run this first to see if get_current_company_id() exists
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_current_company_id';

-- =====================================================
-- If the function DOES NOT exist, create it:
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;

-- =====================================================
-- STEP 2: Update the existing policy to work properly
-- =====================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Company data isolation" ON public.customers;

-- Recreate it with proper configuration
CREATE POLICY "Company data isolation"
ON public.customers
FOR ALL
TO authenticated
USING (company_id = get_current_company_id())
WITH CHECK (company_id = get_current_company_id());

-- =====================================================
-- STEP 3: Verify it works
-- =====================================================

-- Test 1: Check your company_id
SELECT id, email, company_id
FROM users
WHERE id = auth.uid();

-- Test 2: Try to fetch customers
SELECT customer_code, name, customer_type, status
FROM customers
LIMIT 5;

-- If Test 2 returns customers, it's working! ✅

-- =====================================================
-- ALTERNATIVE: If you prefer the direct approach
-- =====================================================
-- Instead of using get_current_company_id(), you can
-- use the direct query in the policy (more transparent):

/*
DROP POLICY IF EXISTS "Company data isolation" ON public.customers;

CREATE POLICY "Company data isolation"
ON public.customers
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
  )
);
*/

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Issue: Function exists but returns NULL
-- Fix: Check if user has company_id
SELECT auth.uid() as current_user_id, get_current_company_id() as company_id;
-- If company_id is NULL, update users table:
-- UPDATE users SET company_id = 'your-company-uuid' WHERE id = auth.uid();

-- Issue: "permission denied" error
-- Fix: Grant permission on the function
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO anon;

-- Issue: Policy exists but not working
-- Fix: Make sure RLS is enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Issue: Still not working
-- Fix: Check if policy is using correct operator
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'customers';

-- =====================================================
-- RECOMMENDED APPROACH
-- =====================================================
-- For better debugging and transparency, I recommend
-- using the direct query approach instead of a function.
-- Run the ALTERNATIVE section above.
-- =====================================================

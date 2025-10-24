-- =====================================================
-- RLS VERIFICATION SCRIPT
-- =====================================================
-- Run this in Supabase SQL Editor to verify RLS setup
-- =====================================================

-- 1. Check if RLS is enabled on customers table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'customers';

-- Expected: rls_enabled = true

-- =====================================================

-- 2. List all policies on customers table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'customers'
ORDER BY policyname;

-- Expected: 4 policies
-- - users_view_company_customers (SELECT)
-- - users_insert_company_customers (INSERT)
-- - users_update_company_customers (UPDATE)
-- - users_delete_company_customers (DELETE)

-- =====================================================

-- 3. Check current user's company_id
SELECT
  id as user_id,
  email,
  company_id,
  CASE
    WHEN company_id IS NULL THEN '❌ No company assigned'
    ELSE '✅ Company assigned'
  END as status
FROM users
WHERE id = auth.uid();

-- Expected: User should have a valid company_id

-- =====================================================

-- 4. Count customers visible to current user
SELECT
  COUNT(*) as visible_customers,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ No customers visible - Check RLS policies'
    WHEN COUNT(*) > 0 THEN '✅ Customers are visible'
  END as status
FROM customers;

-- Expected: Should show number of customers in your company

-- =====================================================

-- 5. Count total customers in database (requires admin/service role)
-- Uncomment to run as admin:
-- SELECT
--   COUNT(*) as total_customers_in_db,
--   COUNT(DISTINCT company_id) as total_companies
-- FROM customers;

-- =====================================================

-- 6. Sample customer data visible to current user
SELECT
  customer_code,
  name,
  customer_type,
  status,
  company_id
FROM customers
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Should show your company's customers

-- =====================================================

-- 7. Verify company_id match
SELECT
  u.company_id as user_company_id,
  COUNT(c.id) as customer_count,
  CASE
    WHEN COUNT(c.id) = 0 THEN '❌ No customers for this company'
    WHEN COUNT(c.id) > 0 THEN '✅ Customers exist for this company'
  END as status
FROM users u
LEFT JOIN customers c ON c.company_id = u.company_id
WHERE u.id = auth.uid()
GROUP BY u.company_id;

-- Expected: Should show customer count for your company

-- =====================================================
-- INTERPRETATION GUIDE
-- =====================================================
--
-- If Step 1 shows rls_enabled = false:
--   → Run: ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
--
-- If Step 2 shows no policies:
--   → Apply the policies from customers_rls_policies.sql
--
-- If Step 3 shows company_id = NULL:
--   → Update user record with correct company_id
--   → Run: UPDATE users SET company_id = 'your-company-uuid' WHERE id = auth.uid();
--
-- If Step 4 shows 0 customers but Step 7 shows customers exist:
--   → RLS policies may be incorrect
--   → Re-apply policies from customers_rls_policies.sql
--
-- If Step 4 and Step 7 both show 0 customers:
--   → No customers exist for this company
--   → Create some customers first
--
-- =====================================================

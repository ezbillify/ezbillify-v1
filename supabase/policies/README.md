# Supabase RLS Policies Setup

This directory contains Row Level Security (RLS) policies for your database tables.

## What is RLS?

Row Level Security (RLS) ensures that users can only access data they're authorized to see. Without proper RLS policies, even authenticated users won't be able to read data from your tables.

## Problem: Customers Not Showing in Dropdown

If customers aren't appearing in your sales forms, it's likely because:
1. RLS is enabled on the `customers` table
2. No policies exist to allow users to read their company's customers

## How to Apply RLS Policies

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Database** → **Tables** → **customers**
4. Click on **Policies** tab
5. Click **New Policy**
6. Click **Create policy from scratch**
7. Copy and paste each policy from `customers_rls_policies.sql`

### Option 2: Via Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire content of `customers_rls_policies.sql`
5. Paste it into the SQL editor
6. Click **Run** or press `Ctrl/Cmd + Enter`
7. Verify success message

### Option 3: Via Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/devacc/ezbillify-v1

# Apply the policies
supabase db push supabase/policies/customers_rls_policies.sql
```

## Verifying Policies Are Working

### 1. Check in Supabase Dashboard

1. Go to **Database** → **Tables** → **customers**
2. Click **Policies** tab
3. You should see 4 policies:
   - `users_view_company_customers` (SELECT)
   - `users_insert_company_customers` (INSERT)
   - `users_update_company_customers` (UPDATE)
   - `users_delete_company_customers` (DELETE)

### 2. Test in Your Application

1. Open your app: http://localhost:3000
2. Login to your account
3. Go to **Sales** → **Quotations** → **New Quotation**
4. Open browser console (F12)
5. Click on the **Customer** search field
6. Check the console logs:
   - `🔍 Customer API Response:` should show `dataCount: X` (where X > 0)
   - `📋 Customers fetched:` should show the count
   - Dropdown should display your customers

### 3. Test Directly in Supabase

Run this query in Supabase SQL Editor while logged in as a user:

```sql
-- This should return customers for your company
SELECT COUNT(*) as total_customers
FROM customers
WHERE company_id = (
  SELECT company_id FROM users WHERE id = auth.uid()
);
```

## Troubleshooting

### Issue: Still no customers showing

**Check 1: Verify RLS is enabled**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'customers';
```
Should return: `rowsecurity = true`

**Check 2: Verify policies exist**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'customers';
```
Should return 4 policies

**Check 3: Verify user has company_id**
```sql
SELECT id, email, company_id
FROM users
WHERE id = auth.uid();
```
Should return your user with a valid `company_id`

**Check 4: Verify customers exist**
```sql
-- Run this as superuser or with service role key
SELECT company_id, customer_code, name, customer_type
FROM customers
LIMIT 10;
```

**Check 5: Check API authentication**
Open browser console and check:
```javascript
// Should show your access token
localStorage.getItem('supabase.auth.token')
```

### Issue: RLS policies not taking effect

1. Clear browser cache and localStorage
2. Log out and log back in
3. Restart your dev server
4. Check if the user's `company_id` matches the customers' `company_id`

### Issue: Error "permission denied for table customers"

This means RLS is enabled but no policies match. Apply the policies from `customers_rls_policies.sql`.

## Security Notes

- These policies ensure users can ONLY access customers from their own company
- Users without a `company_id` cannot access any customers
- All operations (read, create, update, delete) are scoped to the user's company
- The policies use `auth.uid()` which is the currently authenticated user's ID

## Related Files

- `customers_rls_policies.sql` - RLS policies for customers table
- Add more policy files here for other tables as needed

## Next Steps

After applying customer policies, you may need similar policies for:
- `items` table
- `sales_documents` table
- `payments` table
- `branches` table
- Other company-specific tables

Would you like me to generate RLS policies for these tables as well?

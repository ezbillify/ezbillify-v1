# Workforce Feature - Complete Setup Guide

**Date**: 2025-11-20
**Status**: Ready for deployment

---

## 🎯 Overview

This guide covers **all SQL migrations** and **setup steps** needed to deploy the workforce barcode scanning feature.

---

## 📋 Prerequisites

### Existing Tables Required
These tables should already exist in your database:
- ✅ `users` (with `id`, `email`, `role`, `company_id` columns)
- ✅ `companies` (with `id` column)
- ✅ `customers` (with `id` column)
- ✅ `items` (with `id` column)

### Verify Prerequisites
```sql
-- Check if required tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'companies', 'customers', 'items');

-- Should return 4 rows
```

---

## 🔧 Setup Steps

### Step 1: Run Workforce Tables Migration

This creates the core workforce feature tables.

```bash
# Connect to your database
psql -d ezbillify_production -U postgres

# Run the migration
\i /path/to/ezbillify-v1/migrations/create_workforce_tasks.sql
```

**What this creates:**
- ✅ `workforce_tasks` table
- ✅ `scanned_items_log` table
- ✅ Database triggers (auto-sync, timestamps)
- ✅ Row Level Security policies
- ✅ Indexes for performance

**Verify:**
```sql
-- Check tables created
\dt workforce_tasks
\dt scanned_items_log

-- Check triggers
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid IN ('workforce_tasks'::regclass, 'scanned_items_log'::regclass);

-- Should see:
-- - trigger_workforce_tasks_updated_at
-- - trigger_sync_scanned_items
```

---

### Step 2: Add FCM Token Support

This adds push notification support for mobile users.

```bash
# Run FCM token migration
\i /path/to/ezbillify-v1/migrations/add_fcm_token_to_users.sql
```

**What this adds:**
- ✅ `fcm_token` column to `users` table
- ✅ `fcm_token_updated_at` timestamp column
- ✅ Index for faster lookups

**Verify:**
```sql
-- Check columns added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('fcm_token', 'fcm_token_updated_at');

-- Should return 2 rows
```

---

### Step 3: Create Test Workforce Users

Add workforce role users for testing.

```sql
-- Check existing user roles
SELECT id, email, role, company_id
FROM users
WHERE role IN ('admin', 'workforce')
ORDER BY role;

-- If you need to add workforce role to existing user
UPDATE users
SET role = 'workforce'
WHERE email = 'workforce@example.com';

-- OR create new workforce user (if using Supabase Auth directly)
-- Note: Use your app's signup flow instead for production
```

**Important:** Users need these columns:
- `role` = `'workforce'` (for workforce users)
- `role` = `'admin'` (for admins who send tasks)
- `company_id` = same company UUID

---

## ✅ Verification Tests

### Test 1: Database Setup
```sql
-- 1. Check workforce_tasks table
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'workforce_tasks'
ORDER BY ordinal_position;

-- Should see: id, company_id, created_by, assigned_to, task_type,
-- status, customer_id, customer_name, scanned_items, timestamps

-- 2. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('workforce_tasks', 'scanned_items_log');

-- Should see multiple policies for admin and workforce roles

-- 3. Test trigger
INSERT INTO workforce_tasks (
  company_id,
  created_by,
  customer_name
) VALUES (
  'your-company-uuid',
  'your-admin-user-uuid',
  'Test Customer'
) RETURNING id, status, created_at;

-- Should return: status='pending', created_at populated

-- Clean up test
DELETE FROM workforce_tasks WHERE customer_name = 'Test Customer';
```

### Test 2: API Endpoints
```bash
# 1. Create a task
curl -X POST http://localhost:3000/api/workforce/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "company_id": "YOUR_COMPANY_UUID",
    "customer_name": "API Test Customer"
  }'

# Expected: { "success": true, "data": { "id": "...", "status": "pending" } }

# 2. List tasks
curl http://localhost:3000/api/workforce/tasks?company_id=YOUR_COMPANY_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: { "success": true, "data": [...tasks] }

# 3. Update FCM token
curl -X POST http://localhost:3000/api/auth/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WORKFORCE_TOKEN" \
  -d '{
    "fcm_token": "test-fcm-token-123"
  }'

# Expected: { "success": true, "message": "FCM token updated successfully" }
```

### Test 3: Web UI
1. Login as **admin** user
2. Navigate to **Create Invoice** page
3. Select a **customer**
4. Click **"Send to Workforce"** button
5. Verify **WorkforceTaskMonitor** component appears
6. Check browser console for logs:
   ```
   ✅ Workforce task created: task-uuid
   🔄 Subscribing to task updates: task-uuid
   ```

---

## 🧪 Testing Without Mobile App

You can test the complete workflow WITHOUT mobile using API calls:

### Full Test Workflow

```bash
# 1. Admin creates task (via web UI or API)
TASK_ID=$(curl -X POST http://localhost:3000/api/workforce/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "company_id": "'$COMPANY_ID'",
    "customer_name": "Test Customer"
  }' | jq -r '.data.id')

echo "Created task: $TASK_ID"

# 2. Workforce user accepts task (simulating mobile)
curl -X POST http://localhost:3000/api/workforce/tasks/$TASK_ID/accept \
  -H "Authorization: Bearer $WORKFORCE_TOKEN"

# Expected: { "success": true, "data": { "status": "accepted", "assigned_to": "..." } }

# 3. Workforce user scans items (simulating mobile camera scans)
curl -X POST http://localhost:3000/api/workforce/tasks/$TASK_ID/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKFORCE_TOKEN" \
  -d '{
    "item_id": "'$ITEM_UUID'",
    "item_name": "Test Product",
    "barcode": "8901234567890",
    "quantity": 2,
    "mrp": 299.00
  }'

# Expected: { "success": true, "task": { "totalItemsScanned": 1 } }

# 4. Scan more items
curl -X POST http://localhost:3000/api/workforce/tasks/$TASK_ID/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKFORCE_TOKEN" \
  -d '{
    "item_id": "'$ITEM_UUID_2'",
    "item_name": "Another Product",
    "barcode": "8901234567891",
    "quantity": 1,
    "mrp": 150.00
  }'

# 5. Complete task
curl -X POST http://localhost:3000/api/workforce/tasks/$TASK_ID/complete \
  -H "Authorization: Bearer $WORKFORCE_TOKEN"

# Expected: { "success": true, "data": { "status": "completed", "scanned_items": [...] } }

# 6. Verify in web UI
# The WorkforceTaskMonitor should show:
# - Status: Completed ✓
# - Items Scanned: 2
# - Items should be auto-added to invoice form
```

---

## 📱 Mobile Integration (Next Phase)

Once web is working, mobile team needs to:

### 1. Add FCM to Flutter App
```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
```

### 2. Register FCM Token
```dart
// In mobile app
final fcmToken = await FirebaseMessaging.instance.getToken();

// Send to backend
await dio.post(
  '/api/auth/fcm-token',
  data: {'fcm_token': fcmToken},
  options: Options(
    headers: {'Authorization': 'Bearer $accessToken'},
  ),
);
```

### 3. Listen for Notifications
```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  if (message.data['type'] == 'new_workforce_task') {
    // Show in-app alert
    // Navigate to task acceptance screen
  }
});
```

**Full mobile guide:** [WORKFORCE_MOBILE_INTEGRATION.md](./WORKFORCE_MOBILE_INTEGRATION.md)

---

## 🔥 Backend FCM Implementation (Optional - For Now)

When you're ready to send actual push notifications from backend:

### Install Firebase Admin SDK
```bash
npm install firebase-admin
```

### Setup Firebase Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Save as `firebase-service-account.json` (add to `.gitignore`)

### Create FCM Service
```javascript
// src/services/fcmService.js
import admin from 'firebase-admin'

// Initialize (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

export async function sendTaskNotification(fcmToken, taskData) {
  const message = {
    notification: {
      title: 'New Scanning Task',
      body: `Customer: ${taskData.customer_name}`,
    },
    data: {
      type: 'new_workforce_task',
      task_id: taskData.id,
      customer_name: taskData.customer_name,
    },
    token: fcmToken,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
        },
      },
    },
  }

  try {
    const response = await admin.messaging().send(message)
    console.log('✅ FCM notification sent:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('❌ FCM error:', error)
    return { success: false, error: error.message }
  }
}
```

### Update Task Creation API
```javascript
// In /api/workforce/tasks/index.js
import { sendTaskNotification } from '../../../services/fcmService'

// After creating task
const task = await createTaskInDB(...)

// Get workforce users with FCM tokens
const { data: workforceUsers } = await supabase
  .from('users')
  .select('id, email, fcm_token')
  .eq('company_id', task.company_id)
  .eq('role', 'workforce')
  .not('fcm_token', 'is', null)

// Send notifications to all workforce users
for (const user of workforceUsers) {
  await sendTaskNotification(user.fcm_token, task)
}
```

**Note:** This is optional for now. You can test everything without FCM notifications.

---

## 📊 Database Schema Summary

### Tables Created

```
workforce_tasks
├── id (UUID, PK)
├── company_id (UUID, FK → companies)
├── created_by (UUID, FK → users)
├── assigned_to (UUID, FK → users, nullable)
├── task_type (VARCHAR)
├── status (VARCHAR) - pending/accepted/in_progress/completed/cancelled/terminated
├── customer_id (UUID, FK → customers, nullable)
├── customer_name (VARCHAR)
├── scanned_items (JSONB) - Auto-synced from scanned_items_log
└── timestamps (accepted_at, started_at, completed_at, etc.)

scanned_items_log
├── id (UUID, PK)
├── task_id (UUID, FK → workforce_tasks)
├── company_id (UUID, FK → companies)
├── item_id (UUID, FK → items, nullable)
├── item_name (VARCHAR)
├── item_code (VARCHAR)
├── barcode (VARCHAR)
├── quantity (DECIMAL)
├── mrp (DECIMAL)
├── scanned_by (UUID, FK → users)
├── scanned_at (TIMESTAMP)
└── created_at (TIMESTAMP)

users (modified)
├── ... existing columns ...
├── fcm_token (TEXT, nullable) - NEW
└── fcm_token_updated_at (TIMESTAMP, nullable) - NEW
```

---

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Run `create_workforce_tasks.sql` migration
- [ ] Run `add_fcm_token_to_users.sql` migration
- [ ] Verify all tables and triggers created
- [ ] Create test workforce users
- [ ] Test API endpoints with curl
- [ ] Test web UI (send task, monitor, cancel)
- [ ] Verify Supabase Realtime enabled in project settings

### After Deployment
- [ ] Monitor database for task creation
- [ ] Check API logs for errors
- [ ] Verify real-time subscriptions working
- [ ] Test with production data
- [ ] Share mobile integration docs with Flutter team

### Mobile Team Handoff
- [ ] Provide [WORKFORCE_MOBILE_INTEGRATION.md](./WORKFORCE_MOBILE_INTEGRATION.md)
- [ ] Share API endpoint URLs
- [ ] Provide test credentials (workforce user)
- [ ] Create test company with sample items
- [ ] Schedule integration testing session

---

## 🆘 Troubleshooting

### Issue: Migration fails with "relation does not exist"
**Cause:** Users/companies/customers/items tables missing
**Fix:** Verify prerequisite tables exist first

### Issue: RLS policies blocking queries
**Cause:** User doesn't have correct role
**Fix:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
UPDATE users SET role = 'workforce' WHERE email = 'workforce@example.com';
```

### Issue: Trigger not firing
**Cause:** Trigger might be disabled
**Fix:**
```sql
-- Check trigger status
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'scanned_items_log'::regclass;

-- Enable if disabled
ALTER TABLE scanned_items_log ENABLE TRIGGER trigger_sync_scanned_items;
```

### Issue: Real-time not working in web
**Cause:** Supabase Realtime not enabled
**Fix:**
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for `workforce_tasks` and `scanned_items_log` tables

---

## 📚 Related Documentation

- [WORKFORCE_FEATURE.md](./WORKFORCE_FEATURE.md) - Complete feature guide
- [WORKFORCE_MOBILE_INTEGRATION.md](./WORKFORCE_MOBILE_INTEGRATION.md) - Mobile implementation
- [WORKFORCE_IMPLEMENTATION_SUMMARY.md](./WORKFORCE_IMPLEMENTATION_SUMMARY.md) - Overview

---

## ✅ Summary

**What to run:**
```bash
# 1. Workforce tables (REQUIRED)
psql -d ezbillify -f migrations/create_workforce_tasks.sql

# 2. FCM token support (REQUIRED for mobile notifications)
psql -d ezbillify -f migrations/add_fcm_token_to_users.sql
```

**That's it!** Only 2 migrations total.

**Can test without mobile:** ✅ Yes, using API calls (see "Testing Without Mobile App" section)

**Need FCM for web testing:** ❌ No, only needed for mobile push notifications

**Ready for production:** ✅ Yes, after running migrations and basic testing

---

**Questions?** Check the troubleshooting section or related docs above.

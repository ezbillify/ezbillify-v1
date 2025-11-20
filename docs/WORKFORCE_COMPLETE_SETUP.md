# Workforce Feature - Complete Setup & Implementation Guide

## 🎯 Overview
The workforce barcode scanning feature allows admin users to send scanning tasks to mobile workforce users. Workforce users receive push notifications, accept tasks, scan barcodes, and the items automatically sync to the admin's invoice form in real-time.

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Setup](#database-setup)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Mobile App Implementation](#mobile-app-implementation)
6. [Firebase Push Notifications](#firebase-push-notifications)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### System Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN WEB APP                           │
│  1. Admin creates invoice                                   │
│  2. Clicks "Send to Workforce" button                       │
│  3. Task created in database (status: pending)              │
│  4. Push notification sent to all workforce users           │
│  5. Real-time listener waits for scanned items              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE CLOUD MESSAGING                  │
│  - Notification sent to all workforce users' devices       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   MOBILE APP (Flutter)                      │
│  1. Workforce user receives push notification               │
│  2. Opens app, sees task list                               │
│  3. Accepts task (first-come-first-served)                  │
│  4. Scans barcodes using camera                             │
│  5. Items saved to database in real-time                    │
│  6. Completes task                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE REALTIME                         │
│  - PostgreSQL changes broadcast to subscribers              │
│  - Admin's web app receives updates instantly               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN WEB APP                           │
│  1. Invoice form receives scanned items                     │
│  2. Items added to invoice automatically                    │
│  3. Admin can edit/adjust and save invoice                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Backend**: Next.js API Routes (Pages Router)
- **Database**: Supabase PostgreSQL with Realtime
- **Real-time**: Supabase Realtime subscriptions
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Mobile**: Flutter (iOS/Android)
- **Authentication**: Supabase Auth with JWT tokens

---

## 🗄️ Database Setup

### Step 1: Run SQL Migrations

#### Migration 1: Create Workforce Tables
```bash
# Location: migrations/create_workforce_tasks.sql
```

Run this SQL in Supabase SQL Editor:

<details>
<summary>Click to see SQL (create_workforce_tasks.sql)</summary>

```sql
-- Create workforce_tasks table
CREATE TABLE IF NOT EXISTS workforce_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  task_type VARCHAR(50) NOT NULL DEFAULT 'barcode_scan',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  scanned_items JSONB DEFAULT '[]'::jsonb,
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'terminated')
  ),
  CONSTRAINT valid_task_type CHECK (
    task_type IN ('barcode_scan', 'delivery', 'pickup', 'other')
  )
);

-- Create scanned_items_log table
CREATE TABLE IF NOT EXISTS scanned_items_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
  item_code VARCHAR(255) NOT NULL,
  item_name VARCHAR(255),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scanned_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_company ON workforce_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_status ON workforce_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_assigned ON workforce_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_scanned_items_log_task ON scanned_items_log(task_id);

-- Auto-update trigger for workforce_tasks
CREATE OR REPLACE FUNCTION update_workforce_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workforce_tasks_updated_at
  BEFORE UPDATE ON workforce_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_workforce_tasks_updated_at();

-- Trigger to sync scanned_items_log to workforce_tasks.scanned_items
CREATE OR REPLACE FUNCTION sync_scanned_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workforce_tasks
  SET scanned_items = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'item_code', item_code,
        'item_name', item_name,
        'quantity', quantity,
        'scanned_at', scanned_at
      )
      ORDER BY scanned_at ASC
    )
    FROM scanned_items_log
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_scanned_items_on_insert
  AFTER INSERT ON scanned_items_log
  FOR EACH ROW
  EXECUTE FUNCTION sync_scanned_items();

-- Enable Realtime for workforce_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE workforce_tasks;
```
</details>

#### Migration 2: Add FCM Token Support
```bash
# Location: migrations/add_fcm_token_to_users.sql
```

Run this SQL in Supabase SQL Editor:

```sql
-- Add FCM token columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for FCM token lookups
CREATE INDEX IF NOT EXISTS idx_users_fcm_token
ON users(fcm_token)
WHERE (fcm_token IS NOT NULL);

-- Add comment for documentation
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN users.fcm_token_updated_at IS 'Timestamp when FCM token was last updated';
```

### Step 2: Verify Tables Created

```sql
-- Check workforce_tasks table
SELECT * FROM workforce_tasks LIMIT 1;

-- Check scanned_items_log table
SELECT * FROM scanned_items_log LIMIT 1;

-- Check users table has FCM columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('fcm_token', 'fcm_token_updated_at');
```

### Step 3: Set Row Level Security (Optional)

```sql
-- Enable RLS
ALTER TABLE workforce_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything in their company
CREATE POLICY admin_all_access ON workforce_tasks
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Workforce users can view and update their assigned tasks
CREATE POLICY workforce_own_tasks ON workforce_tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR (assigned_to IS NULL AND status = 'pending')
  );

-- Policy: Workforce can insert scanned items for their tasks
CREATE POLICY workforce_scan_items ON scanned_items_log
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM workforce_tasks WHERE assigned_to = auth.uid()
    )
  );
```

---

## 🔧 Backend Implementation

### File Structure
```
src/
├── pages/
│   └── api/
│       ├── auth/
│       │   └── fcm-token.js              # FCM token registration
│       └── workforce/
│           └── tasks/
│               ├── index.js              # Create & list tasks
│               └── [id]/
│                   ├── index.js          # Get task details
│                   ├── accept.js         # Accept task
│                   ├── complete.js       # Complete task
│                   └── scan-item.js      # Add scanned item
└── services/
    └── fcmService.js                     # Firebase push notifications
```

### API Endpoints Summary

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/auth/fcm-token` | POST | Register FCM token | Workforce |
| `/api/workforce/tasks` | GET | List tasks | Admin/Workforce |
| `/api/workforce/tasks` | POST | Create task | Admin |
| `/api/workforce/tasks/[id]` | GET | Get task details | Admin/Workforce |
| `/api/workforce/tasks/[id]/accept` | POST | Accept task | Workforce |
| `/api/workforce/tasks/[id]/complete` | POST | Complete task | Workforce |
| `/api/workforce/tasks/[id]/scan-item` | POST | Add scanned item | Workforce |

### Key Implementation Files

All API endpoints are already implemented. Key features:
- ✅ JWT authentication via `withAuth` middleware
- ✅ Company-based data isolation
- ✅ Role-based access control (admin/workforce)
- ✅ Atomic task acceptance (first-come-first-served)
- ✅ Real-time database triggers for auto-sync
- ✅ Firebase Cloud Messaging integration

---

## 💻 Frontend Implementation

### File Structure
```
src/
├── components/
│   ├── sales/
│   │   └── InvoiceForm.js               # Invoice form with workforce button
│   └── workforce/
│       └── WorkforceTaskMonitor.js      # Real-time task monitor
└── hooks/
    └── useAPI.js                         # API hook with auth
```

### Invoice Form Integration

The `InvoiceForm.js` component has been updated with:
1. **"Send to Workforce" button** - Creates task and opens monitor
2. **WorkforceTaskMonitor component** - Shows real-time task status
3. **Auto-populate items** - Scanned items automatically added to invoice

### WorkforceTaskMonitor Component

Real-time component that:
- Shows task status (pending → accepted → in_progress → completed)
- Displays assigned workforce user name
- Shows scanned items as they arrive
- Uses Supabase Realtime for instant updates
- Auto-closes and populates invoice when task completes

**Location**: [src/components/workforce/WorkforceTaskMonitor.js](src/components/workforce/WorkforceTaskMonitor.js)

---

## 📱 Mobile App Implementation

### Complete Documentation Available

See detailed mobile implementation guides:

1. **[MOBILE_QUICK_START.md](MOBILE_QUICK_START.md)** - 5-minute overview
2. **[MOBILE_COMPLETE_IMPLEMENTATION.md](MOBILE_COMPLETE_IMPLEMENTATION.md)** - Full Flutter code (copy-paste ready)
3. **[MOBILE_IMPLEMENTATION_CHECKLIST.md](MOBILE_IMPLEMENTATION_CHECKLIST.md)** - Day-by-day tasks
4. **[WORKFORCE_MOBILE_INTEGRATION.md](WORKFORCE_MOBILE_INTEGRATION.md)** - API reference

### Mobile Features
- ✅ FCM push notifications
- ✅ Task list with filters
- ✅ First-come-first-served task acceptance
- ✅ Barcode scanning with camera
- ✅ Real-time sync with web app
- ✅ Offline support with queue
- ✅ Background notification handling

### Mobile Tech Stack
- **Framework**: Flutter 3.x
- **Barcode Scanner**: mobile_scanner
- **HTTP Client**: dio
- **State Management**: provider
- **Push Notifications**: firebase_messaging
- **Local Storage**: shared_preferences

---

## 🔥 Firebase Push Notifications

### Setup Steps

#### 1. Generate Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **ezbillify-mobile**
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download JSON file

#### 2. Add to Environment Variables

Edit `.env.local`:

```bash
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=ezbillify-mobile
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----
```

#### 3. Restart Server

```bash
# Stop dev server (Ctrl+C)
npm run dev
```

### How It Works

1. **Mobile app registers FCM token** on login
2. **Backend stores token** in `users.fcm_token` column
3. **Admin creates task** → backend sends push notification
4. **Mobile receives notification** → user opens app
5. **User accepts and completes task** → items sync to web

### Notification Payload

```json
{
  "notification": {
    "title": "New Scanning Task!",
    "body": "Customer: John Doe"
  },
  "data": {
    "type": "new_workforce_task",
    "task_id": "uuid-here",
    "customer_name": "John Doe"
  }
}
```

**Detailed Guide**: [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)

---

## 🧪 Testing Guide

### Test 1: Create Task from Web

1. Log in as admin user
2. Go to Sales → Create Invoice
3. Select customer or enter name
4. Click "Send to Workforce" button
5. Check console logs:
```
✅ Workforce task created: { taskId: '...', ... }
📱 Push notification result: { successCount: 1, ... }
```

### Test 2: Accept Task (API Testing)

```bash
# Get list of pending tasks
curl http://localhost:3000/api/workforce/tasks?company_id=YOUR_COMPANY_ID&status=pending \
  -H "Authorization: Bearer WORKFORCE_USER_TOKEN"

# Accept a task
curl -X POST http://localhost:3000/api/workforce/tasks/TASK_ID/accept \
  -H "Authorization: Bearer WORKFORCE_USER_TOKEN" \
  -H "Content-Type: application/json"
```

### Test 3: Scan Items (API Testing)

```bash
# Add scanned item
curl -X POST http://localhost:3000/api/workforce/tasks/TASK_ID/scan-item \
  -H "Authorization: Bearer WORKFORCE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_code": "ITEM001",
    "item_name": "Test Product",
    "quantity": 5
  }'
```

### Test 4: Real-time Updates

1. Keep web app open with WorkforceTaskMonitor visible
2. Use curl commands above to accept task and add items
3. Watch items appear in real-time on web app
4. Complete task → items should auto-populate invoice

### Test 5: End-to-End with Mobile

1. Admin creates task from web
2. Workforce user receives push notification on mobile
3. User accepts task in mobile app
4. User scans barcodes with camera
5. Admin sees items appear in real-time
6. User completes task
7. Invoice auto-populates with scanned items

---

## 🐛 Troubleshooting

### Issue: "Module not found: Can't resolve '../../lib/api'"
**Solution**: Fixed in WorkforceTaskMonitor.js by using `useAPI` hook instead.

### Issue: "column users_1.email does not exist"
**Solution**: Fixed all API queries to use `first_name, last_name` instead of `email, name`.

### Issue: "Firebase app not initialized"
**Solution**:
1. Check `.env.local` has all three Firebase variables
2. Restart dev server
3. Verify credentials are from correct Firebase project

### Issue: Push notifications not received
**Solution**:
1. Check mobile app registered FCM token: `SELECT fcm_token FROM users WHERE role='workforce'`
2. Verify Firebase service account credentials are correct
3. Check mobile app has notification permissions enabled
4. Test with Firebase Console → Cloud Messaging → Send test message

### Issue: Real-time updates not working
**Solution**:
1. Verify Realtime is enabled in Supabase
2. Check table is added to publication: `ALTER PUBLICATION supabase_realtime ADD TABLE workforce_tasks;`
3. Check browser console for connection errors
4. Test with Supabase Realtime inspector in dashboard

### Issue: Task stuck in "pending" status
**Solution**:
1. Check if any workforce users exist: `SELECT * FROM users WHERE role='workforce'`
2. Verify workforce users have FCM tokens registered
3. Check Firebase Console for delivery errors
4. Manually accept task via API to test flow

---

## 📊 Database Monitoring

### Check Active Tasks
```sql
SELECT
  t.id,
  t.status,
  t.customer_name,
  t.created_at,
  u_creator.first_name || ' ' || u_creator.last_name as created_by,
  u_assignee.first_name || ' ' || u_assignee.last_name as assigned_to,
  jsonb_array_length(t.scanned_items) as items_count
FROM workforce_tasks t
LEFT JOIN users u_creator ON t.created_by = u_creator.id
LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
WHERE t.status NOT IN ('completed', 'cancelled')
ORDER BY t.created_at DESC;
```

### Check Workforce Users with FCM Tokens
```sql
SELECT
  id,
  first_name,
  last_name,
  phone,
  fcm_token IS NOT NULL as has_fcm_token,
  fcm_token_updated_at
FROM users
WHERE role = 'workforce'
ORDER BY fcm_token_updated_at DESC NULLS LAST;
```

### Check Recent Scanned Items
```sql
SELECT
  t.customer_name,
  t.status,
  l.item_code,
  l.item_name,
  l.quantity,
  l.scanned_at,
  u.first_name || ' ' || u.last_name as scanned_by
FROM scanned_items_log l
JOIN workforce_tasks t ON l.task_id = t.id
LEFT JOIN users u ON l.scanned_by = u.id
ORDER BY l.scanned_at DESC
LIMIT 50;
```

---

## ✅ Implementation Checklist

### Backend
- [x] Database tables created (`workforce_tasks`, `scanned_items_log`)
- [x] FCM token column added to `users` table
- [x] All API endpoints implemented
- [x] Firebase Admin SDK service created (`fcmService.js`)
- [x] FCM integration in task creation endpoint
- [x] Real-time database triggers configured
- [x] Row Level Security policies (optional)

### Frontend
- [x] Invoice form updated with "Send to Workforce" button
- [x] WorkforceTaskMonitor component created
- [x] Real-time Supabase subscription implemented
- [x] Auto-populate invoice with scanned items
- [x] Error handling and loading states

### Firebase
- [x] Firebase project created (ezbillify-mobile)
- [ ] Service account key generated
- [ ] Environment variables configured
- [ ] Dev server restarted with new env vars

### Mobile App
- [ ] Flutter project setup
- [ ] Firebase configured in mobile app
- [ ] FCM token registration implemented
- [ ] Task list screen created
- [ ] Barcode scanner integrated
- [ ] Real-time sync implemented
- [ ] Background notification handling

### Testing
- [x] Task creation tested (web)
- [ ] Push notifications tested (end-to-end)
- [ ] Barcode scanning tested (mobile)
- [ ] Real-time sync tested (web + mobile)
- [ ] Complete workflow tested

---

## 🚀 Next Steps

### Immediate (Required for Testing)
1. **Generate Firebase service account key** (see [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md))
2. **Add credentials to `.env.local`**
3. **Restart development server**

### Mobile Team (See Mobile Docs)
1. **Read [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md)** for overview
2. **Follow [MOBILE_COMPLETE_IMPLEMENTATION.md](MOBILE_COMPLETE_IMPLEMENTATION.md)** for implementation
3. **Use [MOBILE_IMPLEMENTATION_CHECKLIST.md](MOBILE_IMPLEMENTATION_CHECKLIST.md)** to track progress

### Production Deployment
1. **Add environment variables to hosting** (Vercel/etc)
2. **Test push notifications in production**
3. **Monitor Firebase Console** for delivery metrics
4. **Set up error logging** (Sentry/etc)

---

## 📚 Additional Resources

- [WORKFORCE_SETUP_GUIDE.md](WORKFORCE_SETUP_GUIDE.md) - Original setup guide
- [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) - Firebase configuration
- [MOBILE_COMPLETE_IMPLEMENTATION.md](MOBILE_COMPLETE_IMPLEMENTATION.md) - Flutter code
- [TEMPLATE_REAL_TIME_UPDATES.md](TEMPLATE_REAL_TIME_UPDATES.md) - Realtime patterns
- [BARCODE_AUTO_ENTRY.md](BARCODE_AUTO_ENTRY.md) - Barcode scanning patterns

---

## 🎉 Summary

The workforce barcode scanning feature is **fully implemented on the backend and frontend**. Here's what's complete:

✅ **Database**: Tables, triggers, indexes, FCM columns
✅ **Backend**: 7 API endpoints with auth, roles, real-time
✅ **Frontend**: Invoice form integration, real-time monitor
✅ **FCM Service**: Push notification service with graceful degradation
✅ **Documentation**: Complete guides for setup, mobile, Firebase

**What's Left**:
1. Add Firebase service account credentials to `.env.local`
2. Mobile team implements Flutter app using provided docs
3. End-to-end testing with mobile app

**Estimated Time to Complete**:
- Firebase setup: 10 minutes
- Mobile implementation: 3-5 days
- Testing & polish: 1-2 days

**Total**: ~1 week for full production-ready implementation

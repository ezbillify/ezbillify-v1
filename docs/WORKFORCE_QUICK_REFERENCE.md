# Workforce Feature - Quick Reference

## 🚀 Quick Start

### What You Need to Do Right Now

1. **Get Firebase Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Project: ezbillify-mobile → Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download JSON file

2. **Add to .env.local**
   ```bash
   FIREBASE_PROJECT_ID=ezbillify-mobile
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
   ```

3. **Restart Dev Server**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

4. **Test It**
   - Log in as admin
   - Go to Sales → Create Invoice
   - Click "Send to Workforce"
   - Check console for: `✅ Workforce task created` and `📱 Push notification result`

---

## 📁 All Files Created/Modified

### Backend Files
```
✅ src/pages/api/auth/fcm-token.js                    # FCM token registration
✅ src/pages/api/workforce/tasks/index.js              # Create & list tasks
✅ src/pages/api/workforce/tasks/[id]/index.js         # Get task details
✅ src/pages/api/workforce/tasks/[id]/accept.js        # Accept task
✅ src/pages/api/workforce/tasks/[id]/complete.js      # Complete task
✅ src/pages/api/workforce/tasks/[id]/scan-item.js     # Add scanned item
✅ src/services/fcmService.js                          # Firebase push notifications
```

### Frontend Files
```
✅ src/components/workforce/WorkforceTaskMonitor.js    # Real-time task monitor
✅ src/components/sales/InvoiceForm.js                 # Updated with workforce button
```

### Database Files
```
✅ migrations/create_workforce_tasks.sql               # Workforce tables & triggers
✅ migrations/add_fcm_token_to_users.sql              # FCM token support
```

### Documentation Files
```
✅ docs/WORKFORCE_COMPLETE_SETUP.md                    # Complete implementation guide
✅ docs/FIREBASE_SETUP_GUIDE.md                        # Firebase configuration
✅ docs/WORKFORCE_SETUP_GUIDE.md                       # Original setup guide
✅ docs/MOBILE_COMPLETE_IMPLEMENTATION.md              # Full Flutter code
✅ docs/MOBILE_IMPLEMENTATION_CHECKLIST.md             # Mobile task checklist
✅ docs/MOBILE_QUICK_START.md                          # Mobile overview
✅ docs/WORKFORCE_MOBILE_INTEGRATION.md                # API reference for mobile
✅ docs/WORKFORCE_QUICK_REFERENCE.md                   # This file
```

---

## 🗄️ Database Migrations

### Run These in Supabase SQL Editor

**1. Create Workforce Tables**
```sql
-- See: migrations/create_workforce_tasks.sql
-- Creates: workforce_tasks, scanned_items_log
-- Adds: triggers, indexes, realtime
```

**2. Add FCM Token Support**
```sql
-- See: migrations/add_fcm_token_to_users.sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_fcm_token
ON users(fcm_token) WHERE (fcm_token IS NOT NULL);
```

**3. Enable Realtime**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE workforce_tasks;
```

---

## 📡 API Endpoints

### For Admin (Web App)
```bash
# Create task
POST /api/workforce/tasks
{
  "company_id": "uuid",
  "customer_name": "John Doe",
  "customer_id": "uuid" (optional)
}

# List tasks
GET /api/workforce/tasks?company_id=uuid&status=pending

# Get task details
GET /api/workforce/tasks/:id
```

### For Workforce (Mobile App)
```bash
# Register FCM token
POST /api/auth/fcm-token
{ "fcm_token": "..." }

# List available tasks
GET /api/workforce/tasks?company_id=uuid&status=pending

# Accept task (first-come-first-served)
POST /api/workforce/tasks/:id/accept

# Add scanned item
POST /api/workforce/tasks/:id/scan-item
{
  "item_code": "ITEM001",
  "item_name": "Product Name",
  "quantity": 5
}

# Complete task
POST /api/workforce/tasks/:id/complete
```

---

## 🔥 Firebase Configuration

### Environment Variables
```bash
# Required for push notifications
FIREBASE_PROJECT_ID=ezbillify-mobile
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

### How to Get Service Account Key
1. Firebase Console → ezbillify-mobile
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Extract values from downloaded JSON:
   - `project_id` → FIREBASE_PROJECT_ID
   - `client_email` → FIREBASE_CLIENT_EMAIL
   - `private_key` → FIREBASE_PRIVATE_KEY

---

## 🧪 Testing Checklist

### Backend Testing (Without Mobile)
```bash
# 1. Create task from web UI
- Log in as admin
- Create invoice
- Click "Send to Workforce"
- Check console logs

# 2. Or use curl
curl -X POST http://localhost:3000/api/workforce/tasks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"uuid","customer_name":"Test Customer"}'

# 3. Check database
SELECT * FROM workforce_tasks ORDER BY created_at DESC LIMIT 5;
```

### Mobile Testing
```bash
# 1. Install mobile app
# 2. Log in as workforce user
# 3. Check FCM token registered
SELECT fcm_token FROM users WHERE role='workforce';

# 4. Create task from web
# 5. Mobile should receive push notification
# 6. Accept task in mobile app
# 7. Scan barcodes
# 8. Check items appear in web app real-time
```

---

## 🐛 Common Issues

### "Firebase Admin not initialized"
**Fix**: Add Firebase env vars to `.env.local` and restart server

### "No workforce users with FCM tokens found"
**Fix**: Mobile app must register FCM token on login:
```bash
POST /api/auth/fcm-token
{ "fcm_token": "device_token_here" }
```

### "Module not found: Can't resolve '../../lib/api'"
**Fix**: Already fixed - WorkforceTaskMonitor uses `useAPI` hook

### "column users_1.email does not exist"
**Fix**: Already fixed - All queries use `first_name, last_name`

### Real-time not working
**Fix**: Enable realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE workforce_tasks;
```

---

## 📱 Mobile App Setup

### Give Mobile Team These Docs
1. **[MOBILE_QUICK_START.md](MOBILE_QUICK_START.md)** - Read this first (5 min)
2. **[MOBILE_COMPLETE_IMPLEMENTATION.md](MOBILE_COMPLETE_IMPLEMENTATION.md)** - Full code
3. **[MOBILE_IMPLEMENTATION_CHECKLIST.md](MOBILE_IMPLEMENTATION_CHECKLIST.md)** - Task list

### Mobile Tech Stack
- Flutter 3.x
- mobile_scanner (barcode scanning)
- firebase_messaging (push notifications)
- dio (HTTP client)
- provider (state management)

### Mobile Timeline
- Day 1-2: Setup, auth, FCM
- Day 3-4: Task list, barcode scanner
- Day 5: Testing, polish
- **Total: 3-5 days**

---

## 📊 Monitoring

### Check Active Tasks
```sql
SELECT
  t.id,
  t.status,
  t.customer_name,
  t.created_at,
  u.first_name || ' ' || u.last_name as assigned_to,
  jsonb_array_length(t.scanned_items) as items_count
FROM workforce_tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.status NOT IN ('completed', 'cancelled')
ORDER BY t.created_at DESC;
```

### Check Workforce Users
```sql
SELECT
  id,
  first_name,
  last_name,
  fcm_token IS NOT NULL as has_token,
  fcm_token_updated_at
FROM users
WHERE role = 'workforce'
ORDER BY fcm_token_updated_at DESC NULLS LAST;
```

---

## ✅ What's Complete

### Backend ✅
- [x] All 7 API endpoints
- [x] Firebase push notification service
- [x] FCM integration in task creation
- [x] Real-time database triggers
- [x] Authentication & authorization
- [x] Company-based data isolation

### Frontend ✅
- [x] "Send to Workforce" button in InvoiceForm
- [x] Real-time WorkforceTaskMonitor component
- [x] Auto-populate invoice with scanned items
- [x] Error handling & loading states

### Database ✅
- [x] workforce_tasks table
- [x] scanned_items_log table
- [x] FCM token columns
- [x] Auto-sync triggers
- [x] Indexes for performance
- [x] Realtime enabled

### Documentation ✅
- [x] Complete setup guide
- [x] Firebase configuration guide
- [x] Mobile implementation guide
- [x] API reference
- [x] Troubleshooting guide

---

## ⏳ What's Left

1. **Add Firebase credentials** (10 minutes)
   - Generate service account key
   - Add to `.env.local`
   - Restart server

2. **Mobile app implementation** (3-5 days)
   - Follow MOBILE_COMPLETE_IMPLEMENTATION.md
   - Mobile team can work in parallel

3. **End-to-end testing** (1-2 days)
   - Test push notifications
   - Test barcode scanning
   - Test real-time sync

---

## 📖 Full Documentation

For detailed guides, see:
- **[WORKFORCE_COMPLETE_SETUP.md](WORKFORCE_COMPLETE_SETUP.md)** - Complete reference (recommended)
- **[FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)** - Firebase detailed setup
- **[WORKFORCE_SETUP_GUIDE.md](WORKFORCE_SETUP_GUIDE.md)** - Original setup guide

---

## 🎯 Summary

**Backend**: ✅ 100% Complete
**Frontend**: ✅ 100% Complete
**Firebase**: ⏳ Needs credentials
**Mobile**: ⏳ Needs implementation

**Next Action**: Add Firebase service account credentials to `.env.local`

**Total Time to Production**: ~1 week (including mobile dev)

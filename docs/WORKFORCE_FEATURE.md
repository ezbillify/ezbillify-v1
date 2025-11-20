# Workforce Barcode Scanning Feature

**Created**: 2025-11-20
**Status**: ✅ Implemented (Web Only)
**Version**: 1.0

---

## Overview

The Workforce Barcode Scanning feature allows admin users in EZBillify v1 (web) to send barcode scanning tasks to workforce users on mobile devices. Workforce users scan items via their mobile camera/barcode scanner, and the scanned items sync in real-time back to the web invoice form.

### Key Features

✅ **Task Assignment**: Admin sends task from Invoice Form to workforce users
✅ **Atomic Acceptance**: First workforce user to accept gets the task (first-come-first-served)
✅ **Real-Time Sync**: Scanned items appear instantly in web UI
✅ **Live Progress Monitoring**: Admin sees who's scanning and item count in real-time
✅ **Task Cancellation**: Admin can cancel and reassign if needed
✅ **Auto-Termination**: Task terminates when invoice is saved or closed
✅ **Connection Recovery**: Mobile can resume after connection loss
✅ **Item Details**: Scanned items include name, barcode, quantity, and MRP

---

## Architecture

### Technology Stack

- **Backend**: Next.js API Routes (Pages Router)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Real-Time**: Supabase Realtime (PostgreSQL change subscriptions)
- **Frontend**: React components with real-time hooks
- **Mobile Notifications**: Firebase Cloud Messaging (mobile team implements)

### Database Schema

#### `workforce_tasks` Table

```sql
CREATE TABLE workforce_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),

  task_type VARCHAR(50) DEFAULT 'barcode_scan',
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: pending → accepted → in_progress → completed/cancelled/terminated

  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255),

  scanned_items JSONB DEFAULT '[]'::jsonb, -- Auto-synced via trigger

  -- Timestamps
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `scanned_items_log` Table

```sql
CREATE TABLE scanned_items_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workforce_tasks(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  item_id UUID REFERENCES items(id),
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(100),
  barcode VARCHAR(255) NOT NULL,

  quantity DECIMAL(10, 2) DEFAULT 1,
  mrp DECIMAL(10, 2),

  scanned_by UUID NOT NULL REFERENCES users(id),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Triggers

**Auto-Sync Trigger**: Automatically aggregates `scanned_items_log` entries into `workforce_tasks.scanned_items` JSONB array. When a new item is scanned:
1. Check if item already exists in array (by `item_id`)
2. If exists: Update quantity
3. If new: Append to array
4. Auto-update task status from `accepted` to `in_progress`

---

## API Endpoints

### 1. Create Task

**POST** `/api/workforce/tasks`

Create a new workforce task and notify workforce users.

**Request Body**:
```json
{
  "company_id": "uuid",
  "customer_id": "uuid",
  "customer_name": "Customer Name"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "pending",
    "customer_name": "Customer Name",
    "created_at": "2025-11-20T10:00:00Z"
  },
  "message": "Task created successfully. Workforce users will be notified."
}
```

**Auth**: Requires admin role

---

### 2. List Tasks

**GET** `/api/workforce/tasks?company_id=uuid&status=pending,accepted`

List workforce tasks with filters.

**Query Parameters**:
- `company_id` (required): Company UUID
- `status` (optional): Comma-separated statuses
- `assigned_to` (optional): Filter by assignee
- `created_by` (optional): Filter by creator
- `from_date` / `to_date` (optional): Date range
- `page` / `limit` (optional): Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "status": "in_progress",
      "customer_name": "Customer Name",
      "scanned_items": [/* array of items */],
      "assignee": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

---

### 3. Accept Task (Atomic)

**POST** `/api/workforce/tasks/{id}/accept`

Accept a pending task. Only the first user to call this gets the task.

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "accepted",
    "assigned_to": "user-uuid",
    "accepted_at": "2025-11-20T10:01:00Z"
  },
  "message": "Task accepted successfully. You can now start scanning items."
}
```

**Response (Already Accepted)**:
```json
{
  "success": false,
  "error": "Task already accepted by another user",
  "message": "Someone else has already accepted this task. Please try another task."
}
```

**Auth**: Requires workforce or admin role

---

### 4. Submit Scanned Item

**POST** `/api/workforce/tasks/{id}/scan`

Submit a scanned item to the task. Auto-synced to `scanned_items` array.

**Request Body**:
```json
{
  "item_id": "uuid",
  "item_name": "Product Name",
  "item_code": "ITEM-001",
  "barcode": "8901234567890",
  "quantity": 1,
  "mrp": 299.00
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "scan-uuid",
    "item_name": "Product Name",
    "barcode": "8901234567890",
    "scanned_at": "2025-11-20T10:02:00Z"
  },
  "task": {
    "id": "task-uuid",
    "status": "in_progress",
    "totalItemsScanned": 5
  },
  "message": "Item \"Product Name\" scanned successfully. Total items: 5"
}
```

**Error (Task Terminated)**:
```json
{
  "success": false,
  "error": "Task terminated",
  "message": "This task was terminated because the invoice was closed or saved. No more items can be scanned."
}
```

**Auth**: Requires workforce or admin role, must be assigned to this task

---

### 5. Complete Task

**POST** `/api/workforce/tasks/{id}/complete`

Mark task as completed (called by mobile when done scanning).

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "completed",
    "completed_at": "2025-11-20T10:05:00Z",
    "scanned_items": [/* array of all items */]
  },
  "message": "Task completed successfully. Total items scanned: 10"
}
```

**Auth**: Requires workforce or admin role, must be assigned to this task

---

### 6. Cancel Task

**DELETE** `/api/workforce/tasks/{id}`

Cancel a task (admin can cancel and reassign to others).

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "cancelled",
    "cancelled_at": "2025-11-20T10:03:00Z"
  },
  "message": "Task cancelled successfully. You can create a new task if needed."
}
```

**Auth**: Requires admin role, must be task creator

---

### 7. Terminate Task

**PUT** `/api/workforce/tasks/{id}`

Terminate task when invoice is closed or saved.

**Request Body**:
```json
{
  "action": "terminate"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "terminated",
    "terminated_at": "2025-11-20T10:06:00Z"
  },
  "message": "Task terminated successfully. Invoice was closed or saved."
}
```

**Auth**: Requires admin role, must be task creator

---

## Real-Time Implementation

### Supabase Realtime Helpers

Location: `src/services/utils/supabase.js`

```javascript
import { workforceRealtimeHelpers } from '../../services/utils/supabase'

// Subscribe to task updates (for admin monitoring)
const channel = workforceRealtimeHelpers.subscribeToTask(taskId, (payload) => {
  if (payload.eventType === 'UPDATE') {
    const updatedTask = payload.new
    console.log('Task updated:', updatedTask.status)

    if (updatedTask.status === 'completed') {
      onTaskCompleted(updatedTask.scanned_items)
    }
  }
})

// Cleanup
workforceRealtimeHelpers.unsubscribe(channel)
```

### Available Real-Time Functions

1. **`subscribeToTask(taskId, callback)`** - Monitor specific task
2. **`subscribeToTaskScans(taskId, callback)`** - Live scan feed
3. **`subscribeToCompanyTasks(companyId, callback)`** - All company tasks
4. **`subscribeToPendingTasks(companyId, callback)`** - New task notifications
5. **`subscribeToUserTasks(userId, callback)`** - User's assigned tasks

---

## Frontend Components

### WorkforceTaskMonitor Component

Location: `src/components/workforce/WorkforceTaskMonitor.js`

Real-time task status display for Invoice Form.

**Features**:
- Shows task status with color-coded badge
- Displays assignee name when accepted
- Real-time item count updates
- Preview of recently scanned items (last 3)
- Cancel button for admin
- Auto-updates on task completion

**Usage**:
```jsx
import WorkforceTaskMonitor from '../workforce/WorkforceTaskMonitor'

<WorkforceTaskMonitor
  taskId={workforceTaskId}
  onItemsReceived={(scannedItems) => {
    // Convert to invoice items and add to form
  }}
  onCancel={() => {
    // Clear task state
  }}
  companyId={companyId}
/>
```

### InvoiceForm Integration

Location: `src/components/sales/InvoiceForm.js`

**Added Features**:
1. "Send to Workforce" button (only visible when customer selected)
2. WorkforceTaskMonitor component display
3. Auto-convert scanned items to invoice items
4. Auto-terminate task on invoice save

**Key Handlers**:
- `handleSendToWorkforce()` - Create and send task
- `handleWorkforceItemsReceived(items)` - Process scanned items
- `handleWorkforceTaskCancel()` - Cancel task
- `terminateWorkforceTask()` - Terminate on save

---

## User Flows

### Flow 1: Normal Workflow

1. **Admin**: Opens Invoice Form, selects customer
2. **Admin**: Clicks "Send to Workforce" button
3. **System**: Creates task, sends FCM notification to all workforce users
4. **Workforce User**: Receives notification, opens app, accepts task
5. **System**: Updates task status to "accepted", notifies admin
6. **Admin**: Sees "Accepted by: John Doe" in monitor
7. **Workforce User**: Scans items with camera
8. **System**: Each scan updates database via API, trigger syncs to JSONB array
9. **Admin**: Sees real-time item count and preview
10. **Workforce User**: Clicks "Complete" when done
11. **System**: Updates status to "completed"
12. **Admin**: Receives all scanned items, automatically added to invoice
13. **Admin**: Reviews and saves invoice
14. **System**: Auto-terminates task

### Flow 2: Task Cancellation

1. **Admin**: Sends task to workforce
2. **Workforce User A**: Accepts task, starts scanning
3. **Admin**: Decides to cancel (maybe wrong customer)
4. **Admin**: Clicks "Cancel Task" button
5. **System**: Updates status to "cancelled"
6. **Workforce User A**: Receives termination message on next scan
7. **Admin**: Can send new task to workforce

### Flow 3: Connection Loss Recovery

1. **Workforce User**: Accepts task, starts scanning
2. **Network**: Connection lost
3. **Workforce User**: Continues scanning (queued locally)
4. **Network**: Connection restored
5. **Mobile App**: Syncs queued scans to API
6. **Admin**: Sees items appear in real-time

### Flow 4: Multiple Workforce Users

1. **Admin**: Sends task
2. **Workforce Users A, B, C**: All receive notification
3. **Workforce User A**: Accepts task first (atomic operation)
4. **System**: Returns "already accepted" to Users B and C
5. **Users B, C**: See "Task no longer available" message
6. **User A**: Completes scanning

---

## Testing

### Manual Testing Steps

1. **Create Task**:
   ```bash
   curl -X POST http://localhost:3000/api/workforce/tasks \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "company_id": "YOUR_COMPANY_ID",
       "customer_name": "Test Customer"
     }'
   ```

2. **Accept Task** (test with 2 users simultaneously):
   ```bash
   curl -X POST http://localhost:3000/api/workforce/tasks/TASK_ID/accept \
     -H "Authorization: Bearer WORKFORCE_TOKEN"
   ```

3. **Scan Items**:
   ```bash
   curl -X POST http://localhost:3000/api/workforce/tasks/TASK_ID/scan \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer WORKFORCE_TOKEN" \
     -d '{
       "item_name": "Product 1",
       "barcode": "8901234567890",
       "quantity": 1,
       "mrp": 299.00
     }'
   ```

4. **Complete Task**:
   ```bash
   curl -X POST http://localhost:3000/api/workforce/tasks/TASK_ID/complete \
     -H "Authorization: Bearer WORKFORCE_TOKEN"
   ```

### Database Verification

```sql
-- Check task status
SELECT
  t.id,
  t.status,
  t.customer_name,
  jsonb_array_length(t.scanned_items) as items_count,
  u.email as assigned_to_email
FROM workforce_tasks t
LEFT JOIN users u ON t.assigned_to = u.id
ORDER BY t.created_at DESC;

-- Check scanned items log
SELECT
  s.item_name,
  s.barcode,
  s.quantity,
  s.scanned_at,
  u.email as scanned_by_email
FROM scanned_items_log s
LEFT JOIN users u ON s.scanned_by = u.id
WHERE s.task_id = 'YOUR_TASK_ID'
ORDER BY s.scanned_at DESC;
```

---

## Security

### Row Level Security (RLS) Policies

All policies implemented in migration file:

1. **Admin users**: Full access to company tasks
2. **Workforce users**: Can view, accept, and update assigned tasks
3. **Task creators**: Can cancel/terminate their tasks
4. **Scanned items**: Only workforce users can insert

### Authentication

- All API endpoints protected with `withAuth` middleware
- Role-based access control (admin vs workforce)
- Atomic operations prevent race conditions

---

## Performance Considerations

- **Indexes**: Added on `company_id`, `status`, `assigned_to`, `task_id`
- **JSONB Storage**: Efficient storage and querying of scanned items
- **Real-Time Channels**: Dedicated channels per task, auto-cleanup on unmount
- **Pagination**: All list endpoints support pagination

---

## Troubleshooting

### Issue: Task not appearing in mobile

**Check**:
1. FCM token registered correctly?
2. User has `workforce` role in database?
3. Task status is `pending`?
4. User belongs to same company?

**Solution**: Mobile team needs to implement FCM listeners (see WORKFORCE_MOBILE_INTEGRATION.md)

---

### Issue: Items not syncing to web

**Check**:
1. Database trigger enabled?
2. Real-time subscription active?
3. Browser console for subscription errors?

**Debug**:
```javascript
// Check if channel is subscribed
console.log('Channel state:', channel.state)

// Check for realtime errors
supabase.on('error', (error) => {
  console.error('Realtime error:', error)
})
```

---

### Issue: "Task already accepted" for same user

**Check**: User might have clicked accept multiple times

**Solution**: Already handled - API returns current task data if already assigned to same user

---

## Future Enhancements

Potential improvements:

1. **Bulk Scanning Mode**: Rapid scan multiple items without confirmation
2. **Barcode History**: Show recently scanned barcodes for reference
3. **Sound Feedback**: Beep on successful scan
4. **Offline Queue**: Store scans locally when offline, sync when online
5. **Task Reassignment**: Admin can reassign from one user to another
6. **Item Validation**: Warn if item not found in inventory
7. **Photo Capture**: Attach product photos to scanned items
8. **Voice Commands**: "Scan complete" to finish task
9. **Analytics Dashboard**: Track workforce efficiency and scan statistics
10. **Multi-Language Support**: Localization for mobile app

---

## Related Files

### Backend
- **Migration**: [migrations/create_workforce_tasks.sql](../migrations/create_workforce_tasks.sql)
- **API - Tasks**: [src/pages/api/workforce/tasks/index.js](../src/pages/api/workforce/tasks/index.js)
- **API - Accept**: [src/pages/api/workforce/tasks/[id]/accept.js](../src/pages/api/workforce/tasks/[id]/accept.js)
- **API - Scan**: [src/pages/api/workforce/tasks/[id]/scan.js](../src/pages/api/workforce/tasks/[id]/scan.js)
- **API - Complete**: [src/pages/api/workforce/tasks/[id]/complete.js](../src/pages/api/workforce/tasks/[id]/complete.js)
- **API - Cancel/Terminate**: [src/pages/api/workforce/tasks/[id]/index.js](../src/pages/api/workforce/tasks/[id]/index.js)

### Frontend
- **Real-Time Helpers**: [src/services/utils/supabase.js](../src/services/utils/supabase.js)
- **Monitor Component**: [src/components/workforce/WorkforceTaskMonitor.js](../src/components/workforce/WorkforceTaskMonitor.js)
- **Invoice Form**: [src/components/sales/InvoiceForm.js](../src/components/sales/InvoiceForm.js)

### Documentation
- **Mobile Integration**: [WORKFORCE_MOBILE_INTEGRATION.md](./WORKFORCE_MOBILE_INTEGRATION.md)

---

**Status**: ✅ Web implementation complete. Mobile integration pending.

**Next Steps**: Mobile team to implement Flutter integration using WORKFORCE_MOBILE_INTEGRATION.md guide.

# Workforce Mobile Integration Guide

**Created**: 2025-11-20
**Target Platform**: Flutter (EZBillify Mobile)
**Backend**: EZBillify v1 (Web)
**Version**: 1.0

---

## Overview

This document provides complete specifications for implementing the workforce barcode scanning feature in the EZBillify Flutter mobile app. The backend APIs and real-time infrastructure are already implemented in EZBillify v1.

### What You Need to Build

1. **Task Notification Listener** - Receive new task notifications via FCM
2. **Task Acceptance Screen** - Show pending tasks and accept button
3. **Barcode Scanner Screen** - Scan items with camera and submit to API
4. **Scanned Items List** - Show what's been scanned with quantities
5. **Real-Time Sync** - Subscribe to task updates from Supabase
6. **Offline Support** - Queue scans when offline, sync when online

---

## Prerequisites

### Flutter Packages Needed

```yaml
dependencies:
  # Supabase client for real-time and database
  supabase_flutter: ^2.0.0

  # Firebase Cloud Messaging for notifications
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0

  # Barcode scanning
  mobile_scanner: ^3.5.0
  # OR
  qr_code_scanner: ^1.0.1

  # State management (choose one)
  provider: ^6.1.0
  # OR
  riverpod: ^2.4.0
  # OR
  bloc: ^8.1.0

  # HTTP client
  dio: ^5.4.0

  # Local storage for offline queue
  hive: ^2.2.3
  hive_flutter: ^1.1.0
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    EZBillify Mobile                      │
│                                                          │
│  ┌─────────────┐      ┌──────────────┐                 │
│  │    FCM      │      │   Supabase   │                 │
│  │ Notification│      │   Realtime   │                 │
│  │  Listener   │      │ Subscription │                 │
│  └──────┬──────┘      └──────┬───────┘                 │
│         │                     │                          │
│         v                     v                          │
│  ┌──────────────────────────────────┐                   │
│  │     Workforce Service            │                   │
│  │  - Accept task (API)             │                   │
│  │  - Submit scans (API)            │                   │
│  │  - Complete task (API)           │                   │
│  │  - Listen to updates (Realtime)  │                   │
│  └──────────────┬───────────────────┘                   │
│                 │                                        │
│                 v                                        │
│  ┌──────────────────────────────────┐                   │
│  │     Barcode Scanner Screen       │                   │
│  │  - Camera view                   │                   │
│  │  - Scan button                   │                   │
│  │  - Items list                    │                   │
│  │  - Complete button               │                   │
│  └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
                    │
                    │ HTTPS
                    v
┌─────────────────────────────────────────────────────────┐
│              EZBillify v1 Backend (Web)                  │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  Workforce APIs (Next.js API Routes)         │       │
│  │  - POST /api/workforce/tasks (create)        │       │
│  │  - POST /api/workforce/tasks/:id/accept      │       │
│  │  - POST /api/workforce/tasks/:id/scan        │       │
│  │  - POST /api/workforce/tasks/:id/complete    │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  Supabase PostgreSQL                         │       │
│  │  - workforce_tasks table                     │       │
│  │  - scanned_items_log table                   │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## API Integration

### Base URL

```dart
class ApiConfig {
  static const String baseUrl = 'https://your-domain.com';
  static const String workforceBase = '$baseUrl/api/workforce/tasks';
}
```

### Authentication

All API requests require Bearer token authentication:

```dart
class ApiClient {
  final Dio _dio;
  final String _accessToken;

  ApiClient(this._accessToken) : _dio = Dio() {
    _dio.options.baseUrl = ApiConfig.baseUrl;
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $_accessToken',
    };
  }

  // ... API methods
}
```

Get access token from Supabase auth:

```dart
final supabase = Supabase.instance.client;
final session = supabase.auth.currentSession;
final accessToken = session?.accessToken;
```

---

## API Endpoints

### 1. List Pending Tasks

**GET** `/api/workforce/tasks?company_id={uuid}&status=pending`

Get all pending tasks for the company.

```dart
Future<List<WorkforceTask>> getPendingTasks(String companyId) async {
  try {
    final response = await _dio.get(
      '/api/workforce/tasks',
      queryParameters: {
        'company_id': companyId,
        'status': 'pending',
        'page': 1,
        'limit': 50,
      },
    );

    if (response.data['success']) {
      final List tasks = response.data['data'];
      return tasks.map((task) => WorkforceTask.fromJson(task)).toList();
    } else {
      throw Exception(response.data['error']);
    }
  } catch (e) {
    throw Exception('Failed to fetch tasks: $e');
  }
}
```

**Response Model**:

```dart
class WorkforceTask {
  final String id;
  final String companyId;
  final String customerId;
  final String customerName;
  final String status;
  final List<ScannedItem> scannedItems;
  final DateTime createdAt;
  final DateTime? acceptedAt;
  final User? assignee;

  WorkforceTask({
    required this.id,
    required this.companyId,
    required this.customerId,
    required this.customerName,
    required this.status,
    required this.scannedItems,
    required this.createdAt,
    this.acceptedAt,
    this.assignee,
  });

  factory WorkforceTask.fromJson(Map<String, dynamic> json) {
    return WorkforceTask(
      id: json['id'],
      companyId: json['company_id'],
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'],
      status: json['status'],
      scannedItems: (json['scanned_items'] as List?)
          ?.map((item) => ScannedItem.fromJson(item))
          .toList() ?? [],
      createdAt: DateTime.parse(json['created_at']),
      acceptedAt: json['accepted_at'] != null
          ? DateTime.parse(json['accepted_at'])
          : null,
      assignee: json['assignee'] != null
          ? User.fromJson(json['assignee'])
          : null,
    );
  }
}

class ScannedItem {
  final String id;
  final String itemId;
  final String itemName;
  final String? itemCode;
  final String barcode;
  final double quantity;
  final double? mrp;
  final DateTime scannedAt;

  ScannedItem({
    required this.id,
    required this.itemId,
    required this.itemName,
    this.itemCode,
    required this.barcode,
    required this.quantity,
    this.mrp,
    required this.scannedAt,
  });

  factory ScannedItem.fromJson(Map<String, dynamic> json) {
    return ScannedItem(
      id: json['id'],
      itemId: json['item_id'],
      itemName: json['item_name'],
      itemCode: json['item_code'],
      barcode: json['barcode'],
      quantity: (json['quantity'] as num).toDouble(),
      mrp: json['mrp'] != null ? (json['mrp'] as num).toDouble() : null,
      scannedAt: DateTime.parse(json['scanned_at']),
    );
  }
}
```

---

### 2. Accept Task (Atomic)

**POST** `/api/workforce/tasks/{id}/accept`

Accept a pending task. Only first user to call this succeeds.

```dart
Future<WorkforceTask> acceptTask(String taskId) async {
  try {
    final response = await _dio.post(
      '/api/workforce/tasks/$taskId/accept',
    );

    if (response.data['success']) {
      return WorkforceTask.fromJson(response.data['data']);
    } else {
      // Task already accepted by someone else
      throw TaskAlreadyAcceptedException(response.data['message']);
    }
  } catch (e) {
    if (e is DioException && e.response?.statusCode == 409) {
      throw TaskAlreadyAcceptedException(
        e.response?.data['message'] ?? 'Task already accepted by another user'
      );
    }
    throw Exception('Failed to accept task: $e');
  }
}

class TaskAlreadyAcceptedException implements Exception {
  final String message;
  TaskAlreadyAcceptedException(this.message);
}
```

**Usage**:

```dart
try {
  final task = await workforceService.acceptTask(taskId);
  // Navigate to scanner screen
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => BarcodeScannerScreen(task: task),
    ),
  );
} on TaskAlreadyAcceptedException catch (e) {
  // Show user-friendly message
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(e.message)),
  );
} catch (e) {
  // Generic error
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Failed to accept task')),
  );
}
```

---

### 3. Submit Scanned Item

**POST** `/api/workforce/tasks/{id}/scan`

Submit a scanned barcode and item details.

```dart
Future<ScannedItemResponse> submitScan({
  required String taskId,
  required String itemId,
  required String itemName,
  String? itemCode,
  required String barcode,
  double quantity = 1,
  double? mrp,
}) async {
  try {
    final response = await _dio.post(
      '/api/workforce/tasks/$taskId/scan',
      data: {
        'item_id': itemId,
        'item_name': itemName,
        'item_code': itemCode,
        'barcode': barcode,
        'quantity': quantity,
        'mrp': mrp,
      },
    );

    if (response.data['success']) {
      return ScannedItemResponse.fromJson(response.data);
    } else {
      throw Exception(response.data['error']);
    }
  } catch (e) {
    if (e is DioException && e.response?.statusCode == 410) {
      // Task terminated
      throw TaskTerminatedException(
        e.response?.data['message'] ?? 'Task has been terminated'
      );
    }
    throw Exception('Failed to submit scan: $e');
  }
}

class ScannedItemResponse {
  final ScannedItem data;
  final TaskSummary task;
  final String message;

  ScannedItemResponse({
    required this.data,
    required this.task,
    required this.message,
  });

  factory ScannedItemResponse.fromJson(Map<String, dynamic> json) {
    return ScannedItemResponse(
      data: ScannedItem.fromJson(json['data']),
      task: TaskSummary.fromJson(json['task']),
      message: json['message'],
    );
  }
}

class TaskSummary {
  final String id;
  final String status;
  final int totalItemsScanned;

  TaskSummary({
    required this.id,
    required this.status,
    required this.totalItemsScanned,
  });

  factory TaskSummary.fromJson(Map<String, dynamic> json) {
    return TaskSummary(
      id: json['id'],
      status: json['status'],
      totalItemsScanned: json['totalItemsScanned'],
    );
  }
}

class TaskTerminatedException implements Exception {
  final String message;
  TaskTerminatedException(this.message);
}
```

---

### 4. Validate Barcode

**GET** `/api/items/validate-barcode?barcode={code}&company_id={uuid}`

Check if barcode exists and get item details.

```dart
Future<ItemValidationResult> validateBarcode({
  required String barcode,
  required String companyId,
}) async {
  try {
    final response = await _dio.get(
      '/api/items/validate-barcode',
      queryParameters: {
        'barcode': barcode,
        'company_id': companyId,
      },
    );

    if (response.data['success']) {
      if (response.data['available'] == false) {
        // Barcode exists, item found
        return ItemValidationResult(
          found: true,
          item: Item.fromJson(response.data['existingItem']),
        );
      } else {
        // Barcode not found
        return ItemValidationResult(found: false);
      }
    } else {
      throw Exception(response.data['error']);
    }
  } catch (e) {
    throw Exception('Failed to validate barcode: $e');
  }
}

class ItemValidationResult {
  final bool found;
  final Item? item;

  ItemValidationResult({required this.found, this.item});
}

class Item {
  final String id;
  final String itemName;
  final String itemCode;
  final List<String> barcodes;
  final double? mrp;
  final double? sellingPrice;
  final String? hsnSacCode;

  Item({
    required this.id,
    required this.itemName,
    required this.itemCode,
    required this.barcodes,
    this.mrp,
    this.sellingPrice,
    this.hsnSacCode,
  });

  factory Item.fromJson(Map<String, dynamic> json) {
    return Item(
      id: json['id'],
      itemName: json['item_name'],
      itemCode: json['item_code'],
      barcodes: (json['barcodes'] as List).cast<String>(),
      mrp: json['mrp'] != null ? (json['mrp'] as num).toDouble() : null,
      sellingPrice: json['selling_price'] != null
          ? (json['selling_price'] as num).toDouble()
          : null,
      hsnSacCode: json['hsn_sac_code'],
    );
  }
}
```

---

### 5. Complete Task

**POST** `/api/workforce/tasks/{id}/complete`

Mark task as completed when done scanning.

```dart
Future<WorkforceTask> completeTask(String taskId) async {
  try {
    final response = await _dio.post(
      '/api/workforce/tasks/$taskId/complete',
    );

    if (response.data['success']) {
      return WorkforceTask.fromJson(response.data['data']);
    } else {
      throw Exception(response.data['error']);
    }
  } catch (e) {
    throw Exception('Failed to complete task: $e');
  }
}
```

---

## Real-Time Integration

### Supabase Realtime Setup

Initialize Supabase client:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    realtimeClientOptions: const RealtimeClientOptions(
      eventsPerSecond: 10,
    ),
  );
}
```

### Subscribe to Task Updates

```dart
class WorkforceRealtimeService {
  final SupabaseClient _supabase = Supabase.instance.client;
  RealtimeChannel? _taskChannel;

  void subscribeToTask({
    required String taskId,
    required Function(WorkforceTask) onUpdate,
    required Function() onTerminated,
  }) {
    _taskChannel = _supabase
        .channel('task:$taskId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'workforce_tasks',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: taskId,
          ),
          callback: (payload) {
            print('Task updated: ${payload.newRecord}');

            final updatedTask = WorkforceTask.fromJson(payload.newRecord);

            // Check if task was terminated or cancelled
            if (updatedTask.status == 'terminated' ||
                updatedTask.status == 'cancelled') {
              onTerminated();
            } else {
              onUpdate(updatedTask);
            }
          },
        )
        .subscribe();
  }

  void unsubscribe() {
    _taskChannel?.unsubscribe();
    _taskChannel = null;
  }
}
```

**Usage in Screen**:

```dart
class BarcodeScannerScreen extends StatefulWidget {
  final WorkforceTask task;

  const BarcodeScannerScreen({Key? key, required this.task}) : super(key: key);

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final _realtimeService = WorkforceRealtimeService();
  late WorkforceTask _currentTask;

  @override
  void initState() {
    super.initState();
    _currentTask = widget.task;

    // Subscribe to real-time updates
    _realtimeService.subscribeToTask(
      taskId: widget.task.id,
      onUpdate: (updatedTask) {
        setState(() {
          _currentTask = updatedTask;
        });
      },
      onTerminated: () {
        // Task terminated by admin
        _showTerminatedDialog();
      },
    );
  }

  @override
  void dispose() {
    _realtimeService.unsubscribe();
    super.dispose();
  }

  void _showTerminatedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Task Terminated'),
        content: const Text(
          'This task was terminated because the invoice was closed or saved. '
          'No more items can be scanned.'
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close scanner screen
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  // ... rest of scanner implementation
}
```

---

## Firebase Cloud Messaging Integration

### FCM Setup

1. Add Firebase to your Flutter project
2. Configure FCM in `android/app/build.gradle` and `ios/Runner/Info.plist`
3. Get FCM token and store it

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class FCMService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Request permission (iOS)
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get FCM token
    final token = await _fcm.getToken();
    print('FCM Token: $token');

    // TODO: Send token to your backend
    await _saveTokenToBackend(token);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle notification tap (app opened from terminated state)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
  }

  Future<void> _saveTokenToBackend(String? token) async {
    // TODO: Implement API call to save FCM token
    // POST /api/users/fcm-token
    // { "fcm_token": token }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    print('Foreground message: ${message.data}');

    if (message.data['type'] == 'new_workforce_task') {
      final taskId = message.data['task_id'];
      final customerName = message.data['customer_name'];

      // Show in-app notification (like Uber)
      _showInAppTaskNotification(
        taskId: taskId,
        customerName: customerName,
      );
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    print('Notification tapped: ${message.data}');

    if (message.data['type'] == 'new_workforce_task') {
      final taskId = message.data['task_id'];

      // Navigate to task screen
      // Use your navigation service
      navigatorKey.currentState?.pushNamed(
        '/workforce/task-details',
        arguments: taskId,
      );
    }
  }

  void _showInAppTaskNotification({
    required String taskId,
    required String customerName,
  }) {
    // Show overlay notification (like Uber rider alert)
    // Use packages like: overlay_support, flash, or custom implementation

    showSimpleNotification(
      Text('New Scanning Task!'),
      subtitle: Text('Customer: $customerName'),
      background: Colors.purple,
      duration: Duration(seconds: 10),
      trailing: ElevatedButton(
        onPressed: () {
          // Navigate to task acceptance
          navigatorKey.currentState?.pushNamed(
            '/workforce/task-details',
            arguments: taskId,
          );
        },
        child: Text('VIEW'),
      ),
    );
  }
}

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message: ${message.data}');

  if (message.data['type'] == 'new_workforce_task') {
    // Play continuous sound/ringtone
    // Use packages like: audioplayers, just_audio
    _playContinuousRingtone();
  }
}

void _playContinuousRingtone() {
  // TODO: Implement continuous ringtone until user responds
  // Stop when: user accepts task, or timeout (e.g., 30 seconds)
}
```

### FCM Notification Payload Format

Backend will send this payload when creating a task:

```json
{
  "notification": {
    "title": "New Scanning Task",
    "body": "Customer: ABC Company Ltd."
  },
  "data": {
    "type": "new_workforce_task",
    "task_id": "task-uuid",
    "customer_name": "ABC Company Ltd.",
    "created_at": "2025-11-20T10:00:00Z"
  },
  "priority": "high",
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "channel_id": "workforce_tasks"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "default",
        "content-available": 1
      }
    }
  }
}
```

---

## Barcode Scanner Implementation

### Using mobile_scanner Package

```dart
import 'package:mobile_scanner/mobile_scanner.dart';

class BarcodeScannerView extends StatefulWidget {
  final Function(String barcode) onBarcodeScanned;

  const BarcodeScannerView({Key? key, required this.onBarcodeScanned})
      : super(key: key);

  @override
  State<BarcodeScannerView> createState() => _BarcodeScannerViewState();
}

class _BarcodeScannerViewState extends State<BarcodeScannerView> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(
          controller: _controller,
          onDetect: (capture) {
            final List<Barcode> barcodes = capture.barcodes;
            for (final barcode in barcodes) {
              if (barcode.rawValue != null) {
                widget.onBarcodeScanned(barcode.rawValue!);
                break;
              }
            }
          },
        ),

        // Overlay with scan frame
        Positioned.fill(
          child: CustomPaint(
            painter: ScannerOverlayPainter(),
          ),
        ),

        // Torch button
        Positioned(
          bottom: 20,
          right: 20,
          child: IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _controller.torchState,
              builder: (context, state, child) {
                return Icon(
                  state == TorchState.on ? Icons.flash_on : Icons.flash_off,
                  color: Colors.white,
                );
              },
            ),
            onPressed: () => _controller.toggleTorch(),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

// Custom painter for scan frame
class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    // Draw semi-transparent overlay
    canvas.drawPath(
      Path()
        ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
        ..addRect(Rect.fromCenter(
          center: Offset(size.width / 2, size.height / 2),
          width: 250,
          height: 250,
        ))
        ..fillType = PathFillType.evenOdd,
      paint,
    );

    // Draw scan frame corners
    final framePaint = Paint()
      ..color = Colors.green
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    final frameRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: 250,
      height: 250,
    );

    // Top-left corner
    canvas.drawLine(
      frameRect.topLeft,
      frameRect.topLeft + Offset(30, 0),
      framePaint,
    );
    canvas.drawLine(
      frameRect.topLeft,
      frameRect.topLeft + Offset(0, 30),
      framePaint,
    );

    // Top-right corner
    canvas.drawLine(
      frameRect.topRight,
      frameRect.topRight + Offset(-30, 0),
      framePaint,
    );
    canvas.drawLine(
      frameRect.topRight,
      frameRect.topRight + Offset(0, 30),
      framePaint,
    );

    // Bottom-left corner
    canvas.drawLine(
      frameRect.bottomLeft,
      frameRect.bottomLeft + Offset(30, 0),
      framePaint,
    );
    canvas.drawLine(
      frameRect.bottomLeft,
      frameRect.bottomLeft + Offset(0, -30),
      framePaint,
    );

    // Bottom-right corner
    canvas.drawLine(
      frameRect.bottomRight,
      frameRect.bottomRight + Offset(-30, 0),
      framePaint,
    );
    canvas.drawLine(
      frameRect.bottomRight,
      frameRect.bottomRight + Offset(0, -30),
      framePaint,
    );
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
```

---

## Complete Scanner Screen

```dart
class BarcodeScannerScreen extends StatefulWidget {
  final WorkforceTask task;

  const BarcodeScannerScreen({Key? key, required this.task}) : super(key: key);

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final _workforceService = WorkforceService();
  final _realtimeService = WorkforceRealtimeService();

  late WorkforceTask _currentTask;
  bool _isProcessing = false;
  bool _showScanner = true;

  @override
  void initState() {
    super.initState();
    _currentTask = widget.task;
    _subscribeToRealtime();
  }

  void _subscribeToRealtime() {
    _realtimeService.subscribeToTask(
      taskId: widget.task.id,
      onUpdate: (updatedTask) {
        setState(() {
          _currentTask = updatedTask;
        });
      },
      onTerminated: () {
        _showTerminatedDialog();
      },
    );
  }

  Future<void> _handleBarcodeScanned(String barcode) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _showScanner = false;
    });

    try {
      // Step 1: Validate barcode
      final validation = await _workforceService.validateBarcode(
        barcode: barcode,
        companyId: _currentTask.companyId,
      );

      if (!validation.found || validation.item == null) {
        _showItemNotFoundDialog(barcode);
        return;
      }

      final item = validation.item!;

      // Step 2: Submit scan to API
      final response = await _workforceService.submitScan(
        taskId: _currentTask.id,
        itemId: item.id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        barcode: barcode,
        quantity: 1,
        mrp: item.mrp,
      );

      // Show success feedback
      _playSuccessSound();
      _showSuccessSnackbar(response.message);

      // Update local state
      setState(() {
        _currentTask = _currentTask.copyWith(
          scannedItems: [
            ..._currentTask.scannedItems,
            response.data,
          ],
        );
      });

    } on TaskTerminatedException catch (e) {
      _showTerminatedDialog();
    } catch (e) {
      _showErrorSnackbar('Failed to scan item: $e');
    } finally {
      setState(() {
        _isProcessing = false;
        _showScanner = true;
      });
    }
  }

  void _showItemNotFoundDialog(String barcode) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Item Not Found'),
        content: Text(
          'Barcode "$barcode" not found in inventory.\n\n'
          'Please check the barcode or add this item to inventory first.'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleCompleteTask() async {
    final confirmed = await _showCompleteConfirmation();
    if (!confirmed) return;

    try {
      await _workforceService.completeTask(_currentTask.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Task completed successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      _showErrorSnackbar('Failed to complete task: $e');
    }
  }

  Future<bool> _showCompleteConfirmation() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Task'),
        content: Text(
          'Are you sure you want to complete this task?\n\n'
          'Total items scanned: ${_currentTask.scannedItems.length}'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('COMPLETE'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  void _playSuccessSound() {
    // TODO: Play beep sound
    // Use audioplayers or just_audio package
  }

  void _showSuccessSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showTerminatedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Task Terminated'),
        content: const Text(
          'This task was terminated because the invoice was closed or saved.'
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _realtimeService.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Items'),
        backgroundColor: Colors.purple,
      ),
      body: Column(
        children: [
          // Task info header
          Container(
            color: Colors.purple.shade50,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Customer: ${_currentTask.customerName}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Items Scanned: ${_currentTask.scannedItems.length}',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.purple.shade900,
                  ),
                ),
              ],
            ),
          ),

          // Scanner view
          Expanded(
            flex: 2,
            child: _showScanner
                ? BarcodeScannerView(
                    onBarcodeScanned: _handleBarcodeScanned,
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        const Text('Processing...'),
                      ],
                    ),
                  ),
          ),

          // Scanned items list
          Expanded(
            flex: 1,
            child: Container(
              color: Colors.grey.shade100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Scanned Items',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                  Expanded(
                    child: _currentTask.scannedItems.isEmpty
                        ? Center(
                            child: Text(
                              'No items scanned yet',
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          )
                        : ListView.builder(
                            itemCount: _currentTask.scannedItems.length,
                            itemBuilder: (context, index) {
                              final item = _currentTask.scannedItems[index];
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.purple,
                                  child: Text('${index + 1}'),
                                ),
                                title: Text(item.itemName),
                                subtitle: Text('Barcode: ${item.barcode}'),
                                trailing: Text(
                                  'Qty: ${item.quantity}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),

          // Complete button
          Container(
            padding: const EdgeInsets.all(16),
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _currentTask.scannedItems.isEmpty
                  ? null
                  : _handleCompleteTask,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: const EdgeInsets.all(16),
              ),
              child: const Text(
                'COMPLETE TASK',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## Offline Support

### Queue Scans When Offline

```dart
import 'package:hive/hive.dart';

class OfflineScanQueue {
  static const String _boxName = 'offline_scans';

  Future<void> queueScan({
    required String taskId,
    required Map<String, dynamic> scanData,
  }) async {
    final box = await Hive.openBox(_boxName);
    final scans = box.get(taskId, defaultValue: <Map<String, dynamic>>[]);
    scans.add(scanData);
    await box.put(taskId, scans);
  }

  Future<List<Map<String, dynamic>>> getPendingScans(String taskId) async {
    final box = await Hive.openBox(_boxName);
    return box.get(taskId, defaultValue: <Map<String, dynamic>>[]);
  }

  Future<void> clearScans(String taskId) async {
    final box = await Hive.openBox(_boxName);
    await box.delete(taskId);
  }
}

// Usage in WorkforceService
Future<void> submitScanWithOfflineSupport({
  required String taskId,
  required String itemId,
  required String itemName,
  String? itemCode,
  required String barcode,
  double quantity = 1,
  double? mrp,
}) async {
  final scanData = {
    'item_id': itemId,
    'item_name': itemName,
    'item_code': itemCode,
    'barcode': barcode,
    'quantity': quantity,
    'mrp': mrp,
  };

  try {
    // Try to submit to API
    await submitScan(
      taskId: taskId,
      itemId: itemId,
      itemName: itemName,
      itemCode: itemCode,
      barcode: barcode,
      quantity: quantity,
      mrp: mrp,
    );
  } catch (e) {
    // If offline, queue for later
    if (e is DioException && e.type == DioExceptionType.connectionError) {
      await _offlineQueue.queueScan(taskId: taskId, scanData: scanData);
      throw OfflineException('Scan queued for sync when online');
    } else {
      rethrow;
    }
  }
}

// Sync when back online
Future<void> syncOfflineScans(String taskId) async {
  final pendingScans = await _offlineQueue.getPendingScans(taskId);

  for (final scanData in pendingScans) {
    try {
      await submitScan(
        taskId: taskId,
        itemId: scanData['item_id'],
        itemName: scanData['item_name'],
        itemCode: scanData['item_code'],
        barcode: scanData['barcode'],
        quantity: scanData['quantity'],
        mrp: scanData['mrp'],
      );
    } catch (e) {
      print('Failed to sync scan: $e');
      // Keep in queue if still failing
      continue;
    }
  }

  // Clear queue after successful sync
  await _offlineQueue.clearScans(taskId);
}

class OfflineException implements Exception {
  final String message;
  OfflineException(this.message);
}
```

---

## Testing Checklist

### Backend Integration

- [ ] Can authenticate with Supabase using existing credentials
- [ ] Can fetch pending tasks from API
- [ ] Can accept task (first user succeeds, second gets 409)
- [ ] Can validate barcode and get item details
- [ ] Can submit scanned item to API
- [ ] Can complete task
- [ ] Receives 410 error when task is terminated

### Real-Time

- [ ] Real-time subscription connects successfully
- [ ] Task updates received when admin cancels
- [ ] Task updates received when admin terminates
- [ ] Scanned items count updates in real-time
- [ ] Subscription cleanup on screen dispose

### FCM

- [ ] Receives notification when admin sends task
- [ ] Notification shows even when app is in background
- [ ] Notification tapping opens task screen
- [ ] In-app notification shows when app is in foreground
- [ ] Continuous ringtone plays until user responds

### Barcode Scanner

- [ ] Camera permission granted
- [ ] Camera initializes and shows preview
- [ ] Barcode detection works (test with EAN-13, UPC, QR codes)
- [ ] Torch toggle works
- [ ] Scanner pauses during processing
- [ ] Success sound plays after successful scan
- [ ] Error dialog shows when barcode not found

### Offline Support

- [ ] Scans queued when offline
- [ ] Queued scans synced when back online
- [ ] User notified about offline mode
- [ ] Sync progress shown to user

### Edge Cases

- [ ] Multiple workforce users accepting same task
- [ ] Task terminated while scanning
- [ ] Network loss during scan submission
- [ ] App killed and restarted mid-task
- [ ] Duplicate barcode scanned
- [ ] Invalid barcode format

---

## Deployment Steps

1. **Run Database Migration**:
   ```bash
   # On EZBillify v1 server
   psql -U postgres -d ezbillify -f migrations/create_workforce_tasks.sql
   ```

2. **Update Flutter Dependencies**:
   ```bash
   flutter pub get
   ```

3. **Configure Firebase**:
   - Add `google-services.json` (Android)
   - Add `GoogleService-Info.plist` (iOS)

4. **Build and Test**:
   ```bash
   flutter run
   ```

5. **Test End-to-End Flow**:
   - Admin sends task from web
   - Mobile receives notification
   - Workforce user accepts and scans
   - Admin sees real-time updates on web

---

## Support and Troubleshooting

### Common Issues

**Issue**: "Task already accepted by another user"
**Solution**: Expected behavior for first-come-first-served. Show user-friendly message.

**Issue**: Real-time not working
**Solution**: Check Supabase Realtime is enabled in project settings.

**Issue**: Barcode scanner not detecting
**Solution**: Check camera permissions, lighting, and barcode format support.

---

## API Reference Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/workforce/tasks` | GET | List tasks | Workforce/Admin |
| `/api/workforce/tasks` | POST | Create task | Admin |
| `/api/workforce/tasks/:id/accept` | POST | Accept task | Workforce/Admin |
| `/api/workforce/tasks/:id/scan` | POST | Submit scan | Workforce/Admin |
| `/api/workforce/tasks/:id/complete` | POST | Complete task | Workforce/Admin |
| `/api/workforce/tasks/:id` | DELETE | Cancel task | Admin (creator) |
| `/api/workforce/tasks/:id` | PUT | Terminate task | Admin (creator) |
| `/api/items/validate-barcode` | GET | Validate barcode | Workforce/Admin |

---

**Implementation Status**: ✅ Backend complete, Mobile pending

**Next Steps**: Implement Flutter screens and services as per this guide.

**Contact**: For questions about backend APIs, refer to WORKFORCE_FEATURE.md or contact the backend team.

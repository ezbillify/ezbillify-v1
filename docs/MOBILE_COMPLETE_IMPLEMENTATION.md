# EZBillify Mobile - Workforce Feature Implementation Guide

**Target**: Flutter Mobile App
**Backend**: EZBillify v1 (Already Implemented ✅)
**Estimated Time**: 3-5 days

---

## 🎯 What You're Building

A barcode scanning feature where workforce users:
1. Receive push notifications for new tasks
2. Accept tasks (first-come-first-served)
3. Scan items with camera
4. Submit scans to backend in real-time
5. Complete tasks when done

**Backend is 100% ready** - all APIs, database, and real-time infrastructure are working.

---

## 📦 Step 1: Add Dependencies

Update `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Existing dependencies (keep these)
  supabase_flutter: ^2.0.0

  # ADD THESE NEW ONES
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  mobile_scanner: ^3.5.0  # For barcode scanning
  dio: ^5.4.0  # For HTTP requests
  hive: ^2.2.3  # For offline storage
  hive_flutter: ^1.1.0
  permission_handler: ^11.0.0  # For camera permissions
  audioplayers: ^5.2.0  # For beep sounds
  overlay_support: ^2.1.0  # For in-app notifications

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  hive_generator: ^2.0.0
```

Run:
```bash
flutter pub get
```

---

## 🔥 Step 2: Firebase Setup

### 2.1 Add Firebase to Project

1. **Android**: Add `google-services.json` to `android/app/`
2. **iOS**: Add `GoogleService-Info.plist` to `ios/Runner/`

### 2.2 Update Android Configuration

**File**: `android/app/build.gradle`

```gradle
dependencies {
    // Add at the bottom
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}

// Add at the very bottom
apply plugin: 'com.google.gms.google-services'
```

**File**: `android/build.gradle`

```gradle
buildscript {
    dependencies {
        // Add this
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**File**: `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
    <!-- Add permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application>
        <!-- Add FCM metadata -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="workforce_tasks" />

        <!-- Add service for background messages -->
        <service
            android:name=".MyFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

### 2.3 Update iOS Configuration

**File**: `ios/Runner/Info.plist`

```xml
<dict>
    <!-- Add camera permission -->
    <key>NSCameraUsageDescription</key>
    <string>We need camera access to scan barcodes</string>

    <!-- Add notification permissions -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
    </array>
</dict>
```

---

## 📱 Step 3: Initialize Services

### 3.1 Main App Initialization

**File**: `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'services/fcm_service.dart';
import 'services/workforce_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Initialize Hive (for offline storage)
  await Hive.initFlutter();

  // Initialize Supabase
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    realtimeClientOptions: const RealtimeClientOptions(
      eventsPerSecond: 10,
    ),
  );

  // Initialize FCM
  await FCMService.instance.initialize();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EZBillify Mobile',
      theme: ThemeData(
        primarySwatch: Colors.purple,
      ),
      home: const HomeScreen(), // Your existing home screen
    );
  }
}
```

---

## 🔔 Step 4: FCM Service

**File**: `lib/services/fcm_service.dart`

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:overlay_support/overlay_support.dart';
import 'package:audioplayers/audioplayers.dart';
import 'api_client.dart';

// Top-level function for background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱 Background message: ${message.data}');

  if (message.data['type'] == 'new_workforce_task') {
    // Play continuous ringtone
    FCMService._playContinuousRingtone();
  }
}

class FCMService {
  static final FCMService instance = FCMService._internal();
  factory FCMService() => instance;
  FCMService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  static AudioPlayer? _audioPlayer;

  Future<void> initialize() async {
    // Request permissions (iOS)
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ FCM permission granted');

      // Get FCM token
      final token = await _fcm.getToken();
      if (token != null) {
        print('📱 FCM Token: $token');
        await _sendTokenToBackend(token);
      }

      // Listen for token refresh
      _fcm.onTokenRefresh.listen(_sendTokenToBackend);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Handle notification tap (app opened from terminated state)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
    } else {
      print('❌ FCM permission denied');
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await ApiClient.instance.post(
        '/api/auth/fcm-token',
        data: {'fcm_token': token},
      );
      print('✅ FCM token sent to backend');
    } catch (e) {
      print('❌ Failed to send FCM token: $e');
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    print('📨 Foreground message: ${message.data}');

    if (message.data['type'] == 'new_workforce_task') {
      final taskId = message.data['task_id'];
      final customerName = message.data['customer_name'];

      // Play continuous ringtone
      _playContinuousRingtone();

      // Show in-app notification
      showOverlayNotification(
        (context) {
          return Card(
            margin: const EdgeInsets.all(16),
            color: Colors.purple,
            child: SafeArea(
              child: ListTile(
                leading: const Icon(
                  Icons.qr_code_scanner,
                  color: Colors.white,
                  size: 40,
                ),
                title: const Text(
                  'New Scanning Task!',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: Text(
                  'Customer: $customerName',
                  style: const TextStyle(color: Colors.white70),
                ),
                trailing: ElevatedButton(
                  onPressed: () {
                    _stopRingtone();
                    OverlaySupportEntry.of(context)?.dismiss();
                    // Navigate to task details
                    navigatorKey.currentState?.pushNamed(
                      '/workforce/task-details',
                      arguments: taskId,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.purple,
                  ),
                  child: const Text('VIEW'),
                ),
              ),
            ),
          );
        },
        duration: const Duration(seconds: 30),
      );
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    print('🔔 Notification tapped: ${message.data}');

    _stopRingtone();

    if (message.data['type'] == 'new_workforce_task') {
      final taskId = message.data['task_id'];
      navigatorKey.currentState?.pushNamed(
        '/workforce/task-details',
        arguments: taskId,
      );
    }
  }

  static void _playContinuousRingtone() {
    _audioPlayer?.stop();
    _audioPlayer = AudioPlayer();
    _audioPlayer?.play(AssetSource('sounds/ringtone.mp3'), mode: PlayerMode.loop);
    print('🔊 Playing continuous ringtone');
  }

  static void _stopRingtone() {
    _audioPlayer?.stop();
    _audioPlayer = null;
    print('🔇 Stopped ringtone');
  }
}

// Global navigator key (add to MaterialApp)
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
```

**Update `lib/main.dart`**:
```dart
return MaterialApp(
  navigatorKey: navigatorKey, // ADD THIS
  // ... rest of config
);
```

---

## 🌐 Step 5: API Client

**File**: `lib/services/api_client.dart`

```dart
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ApiClient {
  static final ApiClient instance = ApiClient._internal();
  factory ApiClient() => instance;
  ApiClient._internal();

  static const String baseUrl = 'https://your-domain.com';
  late final Dio _dio;

  void initialize() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    // Add interceptor for auth token
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        print('❌ API Error: ${error.message}');
        return handler.next(error);
      },
    ));
  }

  Future<String?> _getAccessToken() async {
    final session = Supabase.instance.client.auth.currentSession;
    return session?.accessToken;
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }
}
```

Initialize in `main.dart`:
```dart
void main() async {
  // ... other initializations
  ApiClient.instance.initialize();
  // ...
}
```

---

## 💼 Step 6: Workforce Service

**File**: `lib/services/workforce_service.dart`

```dart
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'api_client.dart';
import '../models/workforce_task.dart';
import '../models/scanned_item.dart';

class WorkforceService {
  final _supabase = Supabase.instance.client;
  final _api = ApiClient.instance;

  // Get pending tasks
  Future<List<WorkforceTask>> getPendingTasks(String companyId) async {
    try {
      final response = await _api.get(
        '/api/workforce/tasks',
        queryParameters: {
          'company_id': companyId,
          'status': 'pending',
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

  // Accept task (atomic)
  Future<WorkforceTask> acceptTask(String taskId) async {
    try {
      final response = await _api.post('/api/workforce/tasks/$taskId/accept');

      if (response.data['success']) {
        return WorkforceTask.fromJson(response.data['data']);
      } else {
        throw TaskAlreadyAcceptedException(response.data['message']);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw TaskAlreadyAcceptedException(
          e.response?.data['message'] ?? 'Task already accepted'
        );
      }
      throw Exception('Failed to accept task: $e');
    }
  }

  // Validate barcode
  Future<ItemValidationResult> validateBarcode({
    required String barcode,
    required String companyId,
  }) async {
    try {
      final response = await _api.get(
        '/api/items/validate-barcode',
        queryParameters: {
          'barcode': barcode,
          'company_id': companyId,
        },
      );

      if (response.data['success']) {
        if (response.data['available'] == false) {
          // Item found
          return ItemValidationResult(
            found: true,
            item: Item.fromJson(response.data['existingItem']),
          );
        } else {
          // Item not found
          return ItemValidationResult(found: false);
        }
      } else {
        throw Exception(response.data['error']);
      }
    } catch (e) {
      throw Exception('Failed to validate barcode: $e');
    }
  }

  // Submit scanned item
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
      final response = await _api.post(
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
    } on DioException catch (e) {
      if (e.response?.statusCode == 410) {
        throw TaskTerminatedException(
          e.response?.data['message'] ?? 'Task has been terminated'
        );
      }
      throw Exception('Failed to submit scan: $e');
    }
  }

  // Complete task
  Future<WorkforceTask> completeTask(String taskId) async {
    try {
      final response = await _api.post('/api/workforce/tasks/$taskId/complete');

      if (response.data['success']) {
        return WorkforceTask.fromJson(response.data['data']);
      } else {
        throw Exception(response.data['error']);
      }
    } catch (e) {
      throw Exception('Failed to complete task: $e');
    }
  }

  // Subscribe to task updates (Realtime)
  RealtimeChannel subscribeToTask({
    required String taskId,
    required Function(WorkforceTask) onUpdate,
    required VoidCallback onTerminated,
  }) {
    final channel = _supabase
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
            final updatedTask = WorkforceTask.fromJson(payload.newRecord);

            if (updatedTask.status == 'terminated' ||
                updatedTask.status == 'cancelled') {
              onTerminated();
            } else {
              onUpdate(updatedTask);
            }
          },
        )
        .subscribe();

    return channel;
  }

  void unsubscribe(RealtimeChannel channel) {
    _supabase.removeChannel(channel);
  }
}

// Exceptions
class TaskAlreadyAcceptedException implements Exception {
  final String message;
  TaskAlreadyAcceptedException(this.message);
}

class TaskTerminatedException implements Exception {
  final String message;
  TaskTerminatedException(this.message);
}
```

---

## 📊 Step 7: Data Models

**File**: `lib/models/workforce_task.dart`

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

  WorkforceTask copyWith({
    List<ScannedItem>? scannedItems,
    String? status,
  }) {
    return WorkforceTask(
      id: id,
      companyId: companyId,
      customerId: customerId,
      customerName: customerName,
      status: status ?? this.status,
      scannedItems: scannedItems ?? this.scannedItems,
      createdAt: createdAt,
      acceptedAt: acceptedAt,
      assignee: assignee,
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

class User {
  final String id;
  final String? name;
  final String email;

  User({required this.id, this.name, required this.email});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      email: json['email'],
    );
  }
}

class Item {
  final String id;
  final String itemName;
  final String itemCode;
  final List<String> barcodes;
  final double? mrp;
  final double? sellingPrice;

  Item({
    required this.id,
    required this.itemName,
    required this.itemCode,
    required this.barcodes,
    this.mrp,
    this.sellingPrice,
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
    );
  }
}

class ItemValidationResult {
  final bool found;
  final Item? item;

  ItemValidationResult({required this.found, this.item});
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
```

---

## 📸 Step 8: Barcode Scanner Screen

**File**: `lib/screens/workforce/barcode_scanner_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/workforce_task.dart';
import '../../services/workforce_service.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final WorkforceTask task;

  const BarcodeScannerScreen({Key? key, required this.task}) : super(key: key);

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final _workforceService = WorkforceService();
  final _audioPlayer = AudioPlayer();
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  late WorkforceTask _currentTask;
  RealtimeChannel? _realtimeChannel;
  bool _isProcessing = false;
  bool _scannerActive = true;

  @override
  void initState() {
    super.initState();
    _currentTask = widget.task;
    _subscribeToRealtime();
  }

  void _subscribeToRealtime() {
    _realtimeChannel = _workforceService.subscribeToTask(
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
    if (_isProcessing || !_scannerActive) return;

    setState(() {
      _isProcessing = true;
      _scannerActive = false;
    });

    try {
      // Validate barcode
      final validation = await _workforceService.validateBarcode(
        barcode: barcode,
        companyId: _currentTask.companyId,
      );

      if (!validation.found || validation.item == null) {
        _showItemNotFoundDialog(barcode);
        return;
      }

      final item = validation.item!;

      // Submit scan
      final response = await _workforceService.submitScan(
        taskId: _currentTask.id,
        itemId: item.id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        barcode: barcode,
        quantity: 1,
        mrp: item.mrp,
      );

      // Success!
      await _audioPlayer.play(AssetSource('sounds/beep.mp3'));

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 1),
        ),
      );

      // Update local state
      setState(() {
        _currentTask = _currentTask.copyWith(
          scannedItems: [..._currentTask.scannedItems, response.data],
        );
      });

    } on TaskTerminatedException catch (e) {
      _showTerminatedDialog();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isProcessing = false;
        _scannerActive = true;
      });
    }
  }

  void _showItemNotFoundDialog(String barcode) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Item Not Found'),
        content: Text('Barcode "$barcode" not found in inventory.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
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

  Future<void> _handleCompleteTask() async {
    final confirmed = await showDialog<bool>(
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

    if (confirmed != true) return;

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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _audioPlayer.dispose();
    if (_realtimeChannel != null) {
      _workforceService.unsubscribe(_realtimeChannel!);
    }
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
          // Task info
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

          // Scanner
          Expanded(
            flex: 2,
            child: _scannerActive
                ? MobileScanner(
                    controller: _scannerController,
                    onDetect: (capture) {
                      final List<Barcode> barcodes = capture.barcodes;
                      for (final barcode in barcodes) {
                        if (barcode.rawValue != null) {
                          _handleBarcodeScanned(barcode.rawValue!);
                          break;
                        }
                      }
                    },
                  )
                : const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Processing...'),
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
                  color: Colors.white,
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

## 📝 Step 9: Add Sound Files

Add these files to your project:

**Create folder**: `assets/sounds/`

Add files:
- `beep.mp3` - Short beep for successful scan
- `ringtone.mp3` - Continuous ringtone for notifications

**Update `pubspec.yaml`**:
```yaml
flutter:
  assets:
    - assets/sounds/beep.mp3
    - assets/sounds/ringtone.mp3
```

---

## ✅ Step 10: Testing Checklist

### Local Testing
- [ ] FCM token registered and saved to backend
- [ ] Can receive notifications (test with Firebase Console)
- [ ] Camera permission granted
- [ ] Barcode scanner works (test with any product barcode)
- [ ] Can validate barcodes against backend
- [ ] Can submit scans successfully
- [ ] Real-time updates working
- [ ] Can complete task
- [ ] Terminated task shows alert

### Integration Testing with Web
- [ ] Admin sends task from web
- [ ] Mobile receives notification
- [ ] Accept task (test with 2 users - second should get "already accepted")
- [ ] Scan items
- [ ] Web shows real-time item count
- [ ] Complete task
- [ ] Web receives all scanned items
- [ ] Items added to invoice correctly

---

## 🚀 Deployment

### Android
```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

---

## 🆘 Common Issues

### Issue: FCM notifications not working
**Fix**: Check Firebase Console → Cloud Messaging → ensure FCM is enabled

### Issue: Barcode not detecting
**Fix**: Ensure good lighting and barcode is clear

### Issue: "Task already accepted"
**Fix**: Expected behavior - first user wins

### Issue: Real-time not updating
**Fix**: Check Supabase Realtime is enabled for `workforce_tasks` table

---

## 📚 Backend API Reference

All these endpoints are ready on backend:

```bash
# Create task (admin only - from web)
POST /api/workforce/tasks

# List pending tasks
GET /api/workforce/tasks?company_id={id}&status=pending

# Accept task (atomic)
POST /api/workforce/tasks/{id}/accept

# Validate barcode
GET /api/items/validate-barcode?barcode={code}&company_id={id}

# Submit scan
POST /api/workforce/tasks/{id}/scan

# Complete task
POST /api/workforce/tasks/{id}/complete

# Update FCM token
POST /api/auth/fcm-token
```

---

## ✨ Summary

You need to implement:
1. ✅ FCM setup (notifications)
2. ✅ API client (HTTP calls)
3. ✅ Workforce service (business logic)
4. ✅ Data models
5. ✅ Barcode scanner screen
6. ✅ Real-time subscriptions

**Everything else is done on the backend!**

**Estimated time**: 3-5 days for experienced Flutter developer

Good luck! 🚀

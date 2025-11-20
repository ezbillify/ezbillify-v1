# Mobile Team - Implementation Checklist

## 📋 5-Day Implementation Plan

---

## Day 1: Setup & Authentication ⏱️ 6-8 hours

### Morning (3-4 hours)
- [ ] Create new Flutter project or use existing
- [ ] Add all dependencies to `pubspec.yaml` (see MOBILE_APP_COMPLETE_GUIDE.md)
- [ ] Run `flutter pub get`
- [ ] Download `google-services.json` from Firebase Console
- [ ] Place in `android/app/google-services.json`
- [ ] Download `GoogleService-Info.plist` from Firebase Console
- [ ] Add to `ios/Runner/GoogleService-Info.plist`
- [ ] Configure Android manifest (permissions, FCM service)
- [ ] Configure iOS Info.plist (camera permission, background modes)

### Afternoon (3-4 hours)
- [ ] Copy `lib/services/auth_service.dart` code
- [ ] Copy `lib/services/fcm_service.dart` code
- [ ] Copy `lib/main.dart` code
- [ ] Copy `lib/screens/login_screen.dart` code
- [ ] Test login with workforce user credentials
- [ ] Verify FCM token appears in console logs
- [ ] **Check database**: `SELECT fcm_token FROM users WHERE role='workforce'`

### End of Day 1 Verification
```bash
# Should be able to:
✓ Login with workforce credentials
✓ See FCM token in console
✓ Token saved to database
```

---

## Day 2: Task List & Navigation ⏱️ 6-8 hours

### Morning (3-4 hours)
- [ ] Copy `lib/services/workforce_service.dart` code
- [ ] Copy `lib/models/workforce_task.dart` code
- [ ] Update providers in `main.dart`
- [ ] Test API calls with Postman first (verify backend works)

### Afternoon (3-4 hours)
- [ ] Copy `lib/screens/task_list_screen.dart` code
- [ ] Add `pull_to_refresh` package usage
- [ ] Test task list loading
- [ ] Test filter chips (All, Available, My Tasks, etc.)
- [ ] Test pull to refresh
- [ ] Test navigation to detail screen

### End of Day 2 Verification
```bash
# Should be able to:
✓ See list of tasks
✓ Filter by status
✓ Pull to refresh
✓ Tap task to view details
```

---

## Day 3: Task Details & Operations ⏱️ 6-8 hours

### Morning (3-4 hours)
- [ ] Copy `lib/screens/task_detail_screen.dart` code
- [ ] Test task detail loading
- [ ] Test "Accept Task" button
- [ ] **Create test task from web admin** to have data
- [ ] Verify only one user can accept a pending task

### Afternoon (3-4 hours)
- [ ] Test "Complete Task" button
- [ ] Verify can't complete without scanned items
- [ ] Test navigation back to task list
- [ ] Test real-time updates (accept task, see status change)

### End of Day 3 Verification
```bash
# Should be able to:
✓ View task details
✓ Accept available tasks
✓ See task status updates
✓ Complete tasks (with validation)
```

---

## Day 4: Barcode Scanner ⏱️ 6-8 hours

### Morning (3-4 hours)
- [ ] Copy `lib/screens/barcode_scanner_screen.dart` code
- [ ] Request camera permission
- [ ] Test camera preview works
- [ ] Test barcode detection with test barcodes
- [ ] Print barcodes: Use online barcode generator

### Afternoon (3-4 hours)
- [ ] Test item dialog shows after scan
- [ ] Test adding item with code, name, quantity
- [ ] Test "Add Item" saves to backend
- [ ] **Check web admin**: Items should appear in real-time
- [ ] Test "Done Scanning" returns to detail screen
- [ ] Test torch/flashlight toggle

### End of Day 4 Verification
```bash
# Should be able to:
✓ Scan barcodes with camera
✓ Enter item details
✓ Save items to backend
✓ See items in web admin real-time
```

---

## Day 5: Polish & Testing ⏱️ 6-8 hours

### Morning (3-4 hours)
- [ ] Test push notifications
  - [ ] Create task from web admin
  - [ ] Mobile should receive notification
  - [ ] Tap notification opens app
- [ ] Test background notifications
- [ ] Test foreground notifications
- [ ] Add error handling for network issues
- [ ] Add loading indicators

### Afternoon (3-4 hours)
- [ ] Test complete workflow:
  1. [ ] Admin creates task → Push notification received
  2. [ ] Accept task → Status updates
  3. [ ] Scan items → Items appear in web real-time
  4. [ ] Complete task → Status updates to completed
- [ ] Test edge cases:
  - [ ] No internet connection
  - [ ] Camera permission denied
  - [ ] Task already accepted by another user
- [ ] Polish UI/UX
- [ ] Add app icon (optional)

### End of Day 5 Verification
```bash
# Complete end-to-end test:
✓ Login → See tasks → Accept → Scan → Complete
✓ Push notifications work
✓ Real-time sync works
✓ Error handling works
```

---

## 📱 Testing with Backend

### Before You Start Each Day

1. **Verify backend is running**:
```bash
curl https://v1.ezbillify.com/api/workforce/tasks?company_id=test
```

2. **Test with Postman/curl first**:
```bash
# Login
curl -X POST https://v1.ezbillify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"YOUR_PHONE","password":"YOUR_PASSWORD"}'

# Get token from response, then:

# List tasks
curl https://v1.ezbillify.com/api/workforce/tasks?company_id=YOUR_COMPANY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Check database directly** (ask backend team):
```sql
-- Check your FCM token
SELECT fcm_token FROM users WHERE phone='YOUR_PHONE';

-- Check tasks
SELECT * FROM workforce_tasks ORDER BY created_at DESC LIMIT 5;

-- Check scanned items
SELECT * FROM scanned_items_log ORDER BY scanned_at DESC LIMIT 10;
```

---

## 🧪 Test Scenarios

### Scenario 1: Happy Path (15 minutes)
1. [ ] Login as workforce user
2. [ ] See list of available tasks
3. [ ] Accept a task
4. [ ] Scan 3-5 barcodes
5. [ ] Complete task
6. [ ] Verify task shows as completed

### Scenario 2: Push Notifications (10 minutes)
1. [ ] Keep app in background
2. [ ] Admin creates task from web
3. [ ] Notification appears
4. [ ] Tap notification
5. [ ] App opens to task list

### Scenario 3: Race Condition (5 minutes)
1. [ ] Open app on 2 devices with different workforce users
2. [ ] Both see same pending task
3. [ ] User 1 accepts task
4. [ ] User 2 tries to accept (should fail gracefully)

### Scenario 4: Real-time Sync (5 minutes)
1. [ ] Mobile: Accept task and start scanning
2. [ ] Scan an item
3. [ ] Web: Check admin's invoice form
4. [ ] Item should appear immediately in WorkforceTaskMonitor

### Scenario 5: Offline Mode (10 minutes)
1. [ ] Turn off WiFi/mobile data
2. [ ] Try to scan item
3. [ ] Should show error message
4. [ ] Turn on internet
5. [ ] Retry (should work)

---

## 🐛 Common Issues & Solutions

### "Firebase app not initialized"
```dart
// Make sure this is called in main():
await Firebase.initializeApp();
```

### "Camera permission denied"
```yaml
# Add to pubspec.yaml:
permission_handler: ^11.1.0

// Request in code:
await Permission.camera.request();
```

### "Failed to register FCM token"
```dart
// Check auth service is initialized first:
final authService = context.read<AuthService>();
await fcmService.initialize(authService);  // After login
```

### Tasks not loading
```dart
// Check these:
1. Base URL correct? (https://v1.ezbillify.com)
2. Token being sent? (Check headers in dio)
3. Company ID correct?
4. User role is 'workforce'?
```

### Barcode not scanning
```
1. Good lighting?
2. Barcode in focus?
3. Try different barcode types (EAN, Code128, QR)
4. Camera permission granted?
```

---

## 📦 Deliverables Checklist

### Code
- [ ] All 4 screens implemented
- [ ] All 3 services implemented
- [ ] All models implemented
- [ ] main.dart configured
- [ ] pubspec.yaml with dependencies

### Configuration
- [ ] Firebase Android setup
- [ ] Firebase iOS setup
- [ ] Android permissions
- [ ] iOS permissions
- [ ] Android app signing (production)
- [ ] iOS provisioning profile (production)

### Testing
- [ ] All 5 test scenarios pass
- [ ] Push notifications work
- [ ] Barcode scanner works
- [ ] Real-time sync verified
- [ ] Error handling tested

### Documentation
- [ ] README with setup instructions
- [ ] Known issues documented
- [ ] APK/IPA build instructions

---

## 🚀 Ready to Deploy?

### Pre-deployment Checklist
- [ ] All features working
- [ ] Tested on real devices (Android + iOS)
- [ ] Push notifications tested
- [ ] App icon added
- [ ] Splash screen added (optional)
- [ ] Release build tested
- [ ] App signed with production keys

### Build Commands
```bash
# Android APK
flutter build apk --release

# Android App Bundle (for Play Store)
flutter build appbundle --release

# iOS (requires Mac + Xcode)
flutter build ios --release
```

---

## 📞 Need Help?

### Before Asking Backend Team
1. Test API with Postman first
2. Check console logs for errors
3. Verify auth token is valid
4. Check internet connection

### What to Send When Asking for Help
```
1. Error message (full stack trace)
2. API endpoint being called
3. Request headers (hide token)
4. Expected vs actual response
5. Flutter version: flutter --version
```

---

## ✅ Definition of Done

### Feature is complete when:
- [ ] All 5 test scenarios pass
- [ ] No console errors
- [ ] Push notifications work end-to-end
- [ ] Real-time sync verified with web admin
- [ ] Handles network errors gracefully
- [ ] Works on both Android and iOS
- [ ] APK/IPA can be built successfully

---

## 📊 Progress Tracker

```
Day 1: Setup & Auth          [ ][ ][ ][ ][ ][ ][ ][ ] 0/8 hours
Day 2: Task List             [ ][ ][ ][ ][ ][ ][ ][ ] 0/8 hours
Day 3: Task Details          [ ][ ][ ][ ][ ][ ][ ][ ] 0/8 hours
Day 4: Barcode Scanner       [ ][ ][ ][ ][ ][ ][ ][ ] 0/8 hours
Day 5: Polish & Testing      [ ][ ][ ][ ][ ][ ][ ][ ] 0/8 hours

Total: 0/40 hours (5 days × 8 hours)
```

---

## 🎯 Success Criteria

The implementation is successful when:

1. ✅ **Login works** - Workforce user can log in
2. ✅ **Tasks load** - Can see list of tasks
3. ✅ **Accept task** - Can accept available tasks
4. ✅ **Scan barcodes** - Camera scans and adds items
5. ✅ **Real-time sync** - Items appear in web admin instantly
6. ✅ **Push notifications** - Receives notifications when admin creates tasks
7. ✅ **Complete task** - Can mark tasks as completed
8. ✅ **Error handling** - Gracefully handles network errors

---

**Estimated Total Time**: 3-5 days (40 hours)

**Difficulty**: Medium

**Prerequisites**:
- Flutter 3.x installed
- Firebase project access
- Backend API access
- Workforce user credentials for testing

**Documentation**: See [MOBILE_APP_COMPLETE_GUIDE.md](MOBILE_APP_COMPLETE_GUIDE.md) for complete code

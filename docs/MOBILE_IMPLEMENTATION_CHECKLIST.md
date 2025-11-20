# Mobile Implementation Checklist

**Project**: EZBillify Mobile - Workforce Feature
**Estimated Time**: 3-5 days

---

## Day 1: Setup & Dependencies

- [ ] **1.1** Add dependencies to `pubspec.yaml`
  - [ ] firebase_core
  - [ ] firebase_messaging
  - [ ] mobile_scanner
  - [ ] dio
  - [ ] hive & hive_flutter
  - [ ] permission_handler
  - [ ] audioplayers
  - [ ] overlay_support

- [ ] **1.2** Run `flutter pub get`

- [ ] **1.3** Firebase Setup
  - [ ] Add `google-services.json` (Android)
  - [ ] Add `GoogleService-Info.plist` (iOS)
  - [ ] Update `android/app/build.gradle`
  - [ ] Update `android/build.gradle`
  - [ ] Update `AndroidManifest.xml`
  - [ ] Update `Info.plist` (iOS)

- [ ] **1.4** Add sound files
  - [ ] Create `assets/sounds/` folder
  - [ ] Add `beep.mp3`
  - [ ] Add `ringtone.mp3`
  - [ ] Update `pubspec.yaml` assets section

---

## Day 2: Services & Models

- [ ] **2.1** Create `lib/services/fcm_service.dart`
  - [ ] Initialize FCM
  - [ ] Request permissions
  - [ ] Get FCM token
  - [ ] Send token to backend
  - [ ] Handle foreground messages
  - [ ] Handle background messages
  - [ ] Handle notification taps
  - [ ] Implement continuous ringtone

- [ ] **2.2** Create `lib/services/api_client.dart`
  - [ ] Setup Dio
  - [ ] Add auth interceptor
  - [ ] Implement GET/POST/PUT/DELETE methods

- [ ] **2.3** Create `lib/services/workforce_service.dart`
  - [ ] getPendingTasks()
  - [ ] acceptTask()
  - [ ] validateBarcode()
  - [ ] submitScan()
  - [ ] completeTask()
  - [ ] subscribeToTask()
  - [ ] unsubscribe()

- [ ] **2.4** Create models in `lib/models/`
  - [ ] `workforce_task.dart`
  - [ ] WorkforceTask class
  - [ ] ScannedItem class
  - [ ] User class
  - [ ] Item class
  - [ ] ItemValidationResult class
  - [ ] ScannedItemResponse class
  - [ ] TaskSummary class

- [ ] **2.5** Update `lib/main.dart`
  - [ ] Initialize Firebase
  - [ ] Initialize Hive
  - [ ] Initialize Supabase
  - [ ] Initialize FCM
  - [ ] Initialize ApiClient
  - [ ] Add global navigator key

---

## Day 3: UI - Barcode Scanner Screen

- [ ] **3.1** Create `lib/screens/workforce/barcode_scanner_screen.dart`
  - [ ] Setup MobileScanner
  - [ ] Handle barcode detection
  - [ ] Subscribe to real-time updates
  - [ ] Validate barcode on scan
  - [ ] Submit scan to backend
  - [ ] Show success/error feedback
  - [ ] Play beep sound
  - [ ] Update scanned items list
  - [ ] Handle task termination
  - [ ] Implement complete task button

- [ ] **3.2** Create custom UI elements
  - [ ] Scanner overlay (frame)
  - [ ] Item not found dialog
  - [ ] Task terminated dialog
  - [ ] Complete task confirmation dialog

---

## Day 4: Testing & Integration

- [ ] **4.1** Local Testing
  - [ ] Test FCM token registration
  - [ ] Test notification reception (Firebase Console)
  - [ ] Test camera permissions
  - [ ] Test barcode scanning (any product)
  - [ ] Test API connectivity
  - [ ] Test barcode validation
  - [ ] Test scan submission
  - [ ] Test real-time updates
  - [ ] Test task completion
  - [ ] Test error handling

- [ ] **4.2** Backend Integration Testing
  - [ ] Get test credentials from backend team
  - [ ] Login as workforce user
  - [ ] View pending tasks
  - [ ] Accept task
  - [ ] Scan multiple items
  - [ ] Complete task
  - [ ] Verify items in backend

- [ ] **4.3** End-to-End Testing with Web
  - [ ] Admin sends task from web
  - [ ] Mobile receives notification
  - [ ] Continuous ringtone plays
  - [ ] Accept task (test with 2 users)
  - [ ] Second user gets "already accepted"
  - [ ] Scan items
  - [ ] Web shows real-time count
  - [ ] Complete task
  - [ ] Web receives all items
  - [ ] Items auto-added to invoice

---

## Day 5: Polish & Edge Cases

- [ ] **5.1** Handle Edge Cases
  - [ ] Task terminated while scanning
  - [ ] Network loss during scan
  - [ ] Invalid barcode format
  - [ ] Duplicate scans
  - [ ] App backgrounded mid-scan
  - [ ] Low battery scenario
  - [ ] Camera permission denied

- [ ] **5.2** UI/UX Improvements
  - [ ] Loading states
  - [ ] Error messages
  - [ ] Success animations
  - [ ] Vibration feedback
  - [ ] Scan count badge
  - [ ] Recent items preview
  - [ ] Torch/flashlight toggle
  - [ ] Manual barcode entry (fallback)

- [ ] **5.3** Performance
  - [ ] Optimize scan detection speed
  - [ ] Prevent duplicate detections
  - [ ] Memory leak checks
  - [ ] Battery usage optimization

- [ ] **5.4** Final Testing
  - [ ] Test on multiple devices
  - [ ] Test different Android versions
  - [ ] Test on iOS
  - [ ] Test with poor network
  - [ ] Test with airplane mode
  - [ ] Stress test (scan 100+ items)

---

## Optional Enhancements (Future)

- [ ] **Offline Support**
  - [ ] Queue scans when offline
  - [ ] Sync when back online
  - [ ] Show offline indicator

- [ ] **Advanced Features**
  - [ ] Bulk scan mode
  - [ ] Voice commands
  - [ ] Photo capture
  - [ ] Barcode history
  - [ ] Manual quantity adjustment
  - [ ] Undo last scan
  - [ ] Search scanned items
  - [ ] Export scan log

---

## Deployment Checklist

- [ ] **Android**
  - [ ] Update version in `pubspec.yaml`
  - [ ] Update version in `android/app/build.gradle`
  - [ ] Generate signing key
  - [ ] Build release APK/AAB
  - [ ] Test release build
  - [ ] Upload to Play Store

- [ ] **iOS**
  - [ ] Update version in `pubspec.yaml`
  - [ ] Update version in Xcode
  - [ ] Configure signing
  - [ ] Build release IPA
  - [ ] Test release build
  - [ ] Upload to App Store

---

## Documentation

- [ ] **For Team**
  - [ ] User guide for workforce users
  - [ ] Troubleshooting guide
  - [ ] FAQ

- [ ] **For Backend Team**
  - [ ] Feedback on APIs
  - [ ] Feature requests
  - [ ] Bug reports

---

## Support Contacts

**Backend Team**: [Contact for API issues]
**Firebase**: [Contact for FCM issues]
**Project Manager**: [Contact for scope questions]

---

## Progress Tracking

**Start Date**: ___________
**Target Date**: ___________
**Actual Completion**: ___________

**Blockers**:
-

**Notes**:
-

---

## Sign-off

- [ ] **Development Complete**
  - Developer: ___________ Date: ___________

- [ ] **Testing Complete**
  - QA: ___________ Date: ___________

- [ ] **Backend Integration Verified**
  - Backend Dev: ___________ Date: ___________

- [ ] **Ready for Production**
  - Project Manager: ___________ Date: ___________

---

**Good luck! 🚀**

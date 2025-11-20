# Firebase Push Notifications Setup Guide

## Overview
This guide explains how to set up Firebase Cloud Messaging (FCM) for sending push notifications to mobile workforce users.

## Prerequisites
- Firebase project created (ezbillify-mobile)
- Firebase configuration added to mobile app
- Service account credentials from Firebase Console

---

## Step 1: Generate Firebase Service Account Key

### 1.1 Navigate to Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ezbillify-mobile**

### 1.2 Generate Private Key
1. Click **Project Settings** (gear icon)
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Click **Generate Key** button
5. A JSON file will download (e.g., `ezbillify-mobile-firebase-adminsdk-xxxxx.json`)

### 1.3 Extract Credentials
Open the downloaded JSON file and extract these values:

```json
{
  "project_id": "ezbillify-mobile",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com"
}
```

---

## Step 2: Add Credentials to Environment Variables

### 2.1 Update `.env.local`
Add these three environment variables to your `.env.local` file:

```bash
# Firebase Admin SDK Configuration (for Push Notifications)
FIREBASE_PROJECT_ID=ezbillify-mobile
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----
```

**IMPORTANT**:
- Keep the `\n` characters in the private key exactly as they are in the JSON file
- The private key should be one long line with `\n` representing newlines
- Wrap the entire key in quotes if needed

### 2.2 For Production (Vercel/Hosting)
Add the same three variables to your hosting platform's environment variables:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `FIREBASE_PROJECT_ID`
3. Add `FIREBASE_CLIENT_EMAIL`
4. Add `FIREBASE_PRIVATE_KEY` (paste the entire key including `\n` characters)

---

## Step 3: Restart Development Server

After adding environment variables:

```bash
# Stop your dev server (Ctrl+C)
# Restart it
npm run dev
```

---

## Step 4: Verify Setup

### 4.1 Check Logs
When you create a workforce task, check the console for:

```
✅ Workforce task created: { taskId: '...', ... }
📱 Push notification result: {
  successCount: 2,
  failureCount: 0,
  results: [ ... ]
}
```

### 4.2 Test Without Mobile App
You can test the backend without mobile app:

```bash
# Create a test task
curl -X POST http://localhost:3000/api/workforce/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "company_id": "your-company-id",
    "customer_name": "Test Customer"
  }'
```

You should see logs indicating notification attempt (it will fail if no users have FCM tokens yet).

---

## Step 5: Mobile App FCM Token Registration

### 5.1 Mobile App Must Register FCM Token
When a workforce user logs into the mobile app, it must:

1. Get FCM token from Firebase
2. Send it to backend:

```dart
POST /api/auth/fcm-token
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "fcm_token": "fcm_device_token_here"
}
```

### 5.2 Backend Stores Token
The backend stores the token in the `users` table:

```sql
-- Check if token is stored
SELECT id, first_name, last_name, role, fcm_token
FROM users
WHERE role = 'workforce' AND fcm_token IS NOT NULL;
```

---

## How It Works

### Flow Diagram
```
Admin creates task
    ↓
Task saved to database
    ↓
Backend queries workforce users with FCM tokens
    ↓
Backend sends FCM notification via Firebase Admin SDK
    ↓
Mobile devices receive push notification
    ↓
Users tap notification → opens task in app
```

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

---

## Troubleshooting

### Issue: "Firebase app not initialized"
**Solution**: Check that all three environment variables are set correctly and server is restarted.

### Issue: "No users with FCM tokens found"
**Solution**:
1. Mobile app must register FCM token first
2. Check database: `SELECT * FROM users WHERE fcm_token IS NOT NULL`
3. Ensure mobile app calls `/api/auth/fcm-token` after login

### Issue: "Invalid credentials"
**Solution**:
1. Verify the private key includes `\n` characters (not actual newlines)
2. Ensure the key is from the correct Firebase project
3. Check client_email matches the service account

### Issue: Notifications not received on mobile
**Solution**:
1. Check mobile app has FCM token in database
2. Verify mobile app has notification permissions enabled
3. Check Firebase Console → Cloud Messaging for errors
4. Test with Firebase Console → Cloud Messaging → Send test message

---

## Security Best Practices

1. **Never commit `.env.local` to git** - it's already in `.gitignore`
2. **Use service account key only on backend** - never expose to frontend
3. **Rotate keys periodically** - generate new service account keys every 90 days
4. **Restrict service account permissions** - only give FCM sending permissions
5. **Monitor usage** - check Firebase Console for unusual activity

---

## Development vs Production

### Development Mode (Local)
- FCM service gracefully degrades if credentials missing
- Logs errors but doesn't crash
- Useful for testing without push notifications

### Production Mode
- FCM credentials REQUIRED
- Notifications sent to all workforce users
- Monitor Firebase Console for delivery metrics

---

## Quick Reference

### Environment Variables
```bash
FIREBASE_PROJECT_ID=ezbillify-mobile
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ezbillify-mobile.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

### API Endpoints
- `POST /api/auth/fcm-token` - Register FCM token (mobile app)
- `POST /api/workforce/tasks` - Create task (triggers notification)

### Database Tables
- `users.fcm_token` - Stores FCM tokens
- `users.fcm_token_updated_at` - Last token update time

### Mobile Documentation
See `MOBILE_COMPLETE_IMPLEMENTATION.md` for full Flutter code including:
- FCM setup
- Token registration
- Notification handling
- Background notification processing

---

## Next Steps

1. ✅ Backend FCM service is implemented
2. ✅ Task creation sends notifications
3. ⏳ Generate Firebase service account key
4. ⏳ Add credentials to `.env.local`
5. ⏳ Mobile app implements FCM token registration
6. ⏳ Test end-to-end notification flow

---

## Support

If you encounter issues:
1. Check logs in console for detailed error messages
2. Verify all environment variables are set
3. Test with Firebase Console test message first
4. Ensure mobile app has registered FCM token

// src/services/fcmService.js
// Firebase Cloud Messaging service for sending push notifications
import admin from 'firebase-admin'

const firebaseConfig = {
  apiKey: "AIzaSyA0YXWnYJORQO5NfsyqXM0jItrKInbwwFg",
  authDomain: "ezbillify-mobile.firebaseapp.com",
  projectId: "ezbillify-mobile",
  storageBucket: "ezbillify-mobile.firebasestorage.app",
  messagingSenderId: "435057939365",
  appId: "1:435057939365:web:9259f481eebdba804bce4c",
  measurementId: "G-NS9LDR309C"
}

// Initialize Firebase Admin (server-side only)
// Note: For production, you need a service account key
// For now, this will use the config above (limited functionality)
let initialized = false

function initializeFirebaseAdmin() {
  if (initialized) return

  try {
    // Check if we have service account credentials
    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) {

      // Initialize with service account (PRODUCTION)
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        })
      }
      console.log('✅ Firebase Admin initialized with service account')
    } else {
      // Development mode - warn about missing credentials
      console.warn('⚠️ Firebase service account not configured')
      console.warn('To send FCM notifications, add these to .env.local:')
      console.warn('FIREBASE_PROJECT_ID=ezbillify-mobile')
      console.warn('FIREBASE_CLIENT_EMAIL=your-service-account-email')
      console.warn('FIREBASE_PRIVATE_KEY=your-private-key')
    }

    initialized = true
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message)
  }
}

/**
 * Send push notification to workforce user(s)
 * @param {string|string[]} fcmTokens - Single token or array of tokens
 * @param {object} taskData - Task data to include in notification
 * @returns {Promise<object>} Result with success status
 */
export async function sendTaskNotification(fcmTokens, taskData) {
  // Initialize on first use
  initializeFirebaseAdmin()

  // Check if Firebase Admin is available
  if (!admin.apps.length) {
    console.warn('⚠️ Firebase Admin not initialized - skipping notification')
    return {
      success: false,
      error: 'Firebase Admin not configured',
      skipped: true
    }
  }

  // Convert single token to array
  const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens]

  // Filter out null/undefined tokens
  const validTokens = tokens.filter(token => token && token.trim())

  if (validTokens.length === 0) {
    console.warn('⚠️ No valid FCM tokens provided')
    return {
      success: false,
      error: 'No valid FCM tokens',
      skipped: true
    }
  }

  // Build notification message
  const message = {
    notification: {
      title: 'New Scanning Task!',
      body: `Customer: ${taskData.customer_name}`,
    },
    data: {
      type: 'new_workforce_task',
      task_id: taskData.id,
      customer_name: taskData.customer_name,
      created_at: taskData.created_at || new Date().toISOString(),
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'workforce_tasks',
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
          badge: 1,
        },
      },
    },
  }

  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  }

  // Send to each token
  for (const token of validTokens) {
    try {
      const response = await admin.messaging().send({
        ...message,
        token,
      })

      console.log('✅ FCM notification sent:', {
        token: token.substring(0, 20) + '...',
        messageId: response,
      })

      results.sent++
    } catch (error) {
      console.error('❌ FCM send error:', {
        token: token.substring(0, 20) + '...',
        error: error.message,
      })

      results.failed++
      results.errors.push({
        token: token.substring(0, 20) + '...',
        error: error.message,
      })
    }
  }

  if (results.failed > 0 && results.sent === 0) {
    results.success = false
  }

  return results
}

/**
 * Send notification to all workforce users in a company
 * @param {object} supabase - Supabase admin client
 * @param {string} companyId - Company UUID
 * @param {object} taskData - Task data
 * @returns {Promise<object>} Result with success status
 */
export async function notifyWorkforceUsers(supabase, companyId, taskData) {
  try {
    // Get all workforce users in this company with FCM tokens
    const { data: workforceUsers, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, fcm_token')
      .eq('company_id', companyId)
      .eq('role', 'workforce')
      .eq('is_active', true)
      .not('fcm_token', 'is', null)

    if (error) {
      console.error('Error fetching workforce users:', error)
      return {
        success: false,
        error: 'Failed to fetch workforce users',
        details: error.message,
      }
    }

    if (!workforceUsers || workforceUsers.length === 0) {
      console.warn('⚠️ No workforce users with FCM tokens found in company')
      return {
        success: false,
        error: 'No workforce users available',
        skipped: true,
      }
    }

    console.log(`📱 Notifying ${workforceUsers.length} workforce users`)

    // Extract FCM tokens
    const fcmTokens = workforceUsers.map(user => user.fcm_token)

    // Send notifications
    const result = await sendTaskNotification(fcmTokens, taskData)

    return {
      ...result,
      totalUsers: workforceUsers.length,
      users: workforceUsers.map(u => ({
        id: u.id,
        name: u.first_name && u.last_name
          ? `${u.first_name} ${u.last_name}`
          : u.first_name || 'Workforce User',
      })),
    }
  } catch (error) {
    console.error('Error notifying workforce users:', error)
    return {
      success: false,
      error: 'Failed to notify workforce users',
      details: error.message,
    }
  }
}

export { firebaseConfig }

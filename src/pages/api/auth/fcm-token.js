// src/pages/api/auth/fcm-token.js
// Update user's FCM token for push notifications
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const supabase = supabaseAdmin

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { fcm_token } = req.body

  if (!fcm_token) {
    return res.status(400).json({
      success: false,
      error: 'FCM token is required'
    })
  }

  try {
    const userId = req.auth?.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }

    // Update user's FCM token
    const { data, error } = await supabase
      .from('users')
      .update({
        fcm_token: fcm_token,
        fcm_token_updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, fcm_token, fcm_token_updated_at')
      .single()

    if (error) {
      console.error('Error updating FCM token:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update FCM token',
        details: error.message
      })
    }

    console.log('✅ FCM token updated:', {
      userId: data.id,
      email: data.email,
      updatedAt: data.fcm_token_updated_at
    })

    return res.status(200).json({
      success: true,
      data: {
        id: data.id,
        fcm_token_updated_at: data.fcm_token_updated_at
      },
      message: 'FCM token updated successfully'
    })
  } catch (error) {
    console.error('Error in FCM token update:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update FCM token',
      details: error.message
    })
  }
}

export default withAuth(handler)

// pages/api/auth/verify-and-set-password.js
import { supabaseAdmin } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { accessToken, userId, password } = req.body

  if (!accessToken || !userId || !password) {
    return res.status(400).json({
      success: false,
      error: 'Access token, user ID, and password are required'
    })
  }

  try {
    console.log('🔐 Verifying email and setting password for user:', userId)

    // Step 1: Verify the user's email (mark as confirmed)
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true, // Mark email as confirmed
      }
    )

    if (confirmError) {
      console.error('❌ Error confirming email:', confirmError)
      return res.status(500).json({
        success: false,
        error: `Failed to confirm email: ${confirmError.message}`
      })
    }

    console.log('✅ Email confirmed successfully')

    // Step 2: Set the user's password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password: password,
        // Clear the admin_set_password from metadata after using it
        user_metadata: {
          admin_set_password: null
        }
      }
    )

    if (passwordError) {
      console.error('❌ Error setting password:', passwordError)
      return res.status(500).json({
        success: false,
        error: `Failed to set password: ${passwordError.message}`
      })
    }

    console.log('✅ Password set successfully for user:', userId)

    return res.status(200).json({
      success: true,
      message: 'Email verified and password set successfully'
    })

  } catch (error) {
    console.error('💥 Exception verifying and setting password:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to verify email and set password'
    })
  }
}

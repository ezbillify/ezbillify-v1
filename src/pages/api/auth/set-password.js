// pages/api/auth/set-password.js
import { supabaseAdmin } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { userId, password } = req.body

  if (!userId || !password) {
    return res.status(400).json({
      success: false,
      error: 'User ID and password are required'
    })
  }

  try {
    console.log('🔐 Setting password for user after email confirmation:', userId)

    // Update the user's password
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
      message: 'Password set successfully'
    })

  } catch (error) {
    console.error('💥 Exception setting password:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set password'
    })
  }
}

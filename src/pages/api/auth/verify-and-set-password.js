// pages/api/auth/verify-and-set-password.js
import { supabase, supabaseAdmin } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { accessToken, refreshToken } = req.body

  if (!accessToken || !refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Access token and refresh token are required'
    })
  }

  try {
    console.log('🔐 Starting email verification and password setting...')

    // Step 1: Get user from access token
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(accessToken)

    if (getUserError || !user) {
      console.error('❌ Error getting user from token:', getUserError)
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    console.log('✅ User retrieved from token:', user.id)

    // Step 2: Get the admin-set password from user metadata
    const adminSetPassword = user.user_metadata?.admin_set_password

    if (!adminSetPassword) {
      console.warn('⚠️ No admin password found in metadata, skipping password set')
    }

    // Step 3: Verify the user's email (mark as confirmed)
    console.log('📧 Marking email as confirmed for user:', user.id)
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
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

    // Step 4: Set the user's password if admin set one
    if (adminSetPassword) {
      console.log('🔑 Setting admin password for user:', user.id)
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: adminSetPassword,
          // Clear the admin_set_password from metadata after using it
          user_metadata: {
            ...user.user_metadata,
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

      console.log('✅ Password set successfully for user:', user.id)
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified and password set successfully',
      userId: user.id
    })

  } catch (error) {
    console.error('💥 Exception verifying and setting password:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to verify email and set password'
    })
  }
}

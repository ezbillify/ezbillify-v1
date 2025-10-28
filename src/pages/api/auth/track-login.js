// pages/api/auth/track-login.js
// API endpoint to track user login - called by mobile app after successful authentication

import { supabase, supabaseAdmin } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Get the access token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      })
    }

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('❌ Error verifying user:', userError)
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    console.log('✅ Tracking login for user:', user.id)

    // Get current login count
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('login_count')
      .eq('id', user.id)
      .single()

    // Update last_login and increment login_count
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        login_count: (userData?.login_count || 0) + 1
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating login tracking:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update login tracking'
      })
    }

    console.log('✅ Login tracked successfully for user:', user.id)

    return res.status(200).json({
      success: true,
      message: 'Login tracked successfully'
    })

  } catch (error) {
    console.error('💥 Exception tracking login:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to track login'
    })
  }
}

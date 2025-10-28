// pages/api/debug/user-info.js
import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Get the user ID from the authenticated user
    const userId = req.user.id
    
    // Fetch user information
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        company:companies(name)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user info:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user information'
      })
    }

    return res.status(200).json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('User info API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

export default withAuth(handler)
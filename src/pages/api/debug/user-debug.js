// pages/api/debug/user-debug.js
import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../middleware/auth'

async function handler(req, res) {
  try {
    const userId = req.user.id
    const companyId = req.user.company_id
    
    console.log('API Debug - User info:', { userId, companyId })
    
    // Fetch user's own profile
    const { data: ownProfile, error: ownProfileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('API Debug - Own profile:', { data: ownProfile, error: ownProfileError })
    
    // Fetch email for own profile
    let ownProfileWithEmail = ownProfile;
    if (ownProfile && !ownProfileError) {
      try {
        const { data: authUserData, error: authError } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', userId)
          .single()
        
        if (!authError) {
          ownProfileWithEmail = { ...ownProfile, email: authUserData?.email || null }
        }
      } catch (emailError) {
        console.error('Error fetching email for own profile:', emailError)
      }
    }
    
    // Fetch all users in company
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
    
    console.log('API Debug - Company users:', { data: companyUsers, error: companyUsersError })
    
    // For each user, fetch their email from auth.users
    const companyUsersWithEmail = await Promise.all(companyUsers?.map(async (user) => {
      try {
        const { data: authUserData, error: authError } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', user.id)
          .single()
        
        if (authError) {
          console.error('Error fetching auth user data:', authError)
          return { ...user, email: null }
        }
        
        return { ...user, email: authUserData?.email || null }
      } catch (err) {
        console.error('Error fetching email for user:', user.id, err)
        return { ...user, email: null }
      }
    })) || []
    
    res.status(200).json({
      success: true,
      userId,
      companyId,
      ownProfile: ownProfileWithEmail,
      companyUsers: companyUsersWithEmail,
      errors: {
        ownProfileError,
        companyUsersError
      }
    })
  } catch (error) {
    console.error('API Debug - Error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
}

export default withAuth(handler)
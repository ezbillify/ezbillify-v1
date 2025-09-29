// pages/api/settings/users.js
import { supabase } from '../../../lib/supabase'
import { withAuth } from '../../../lib/middleware/auth'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getUsers(req, res)
      case 'POST':
        return await createUser(req, res)
      case 'PUT':
        return await updateUser(req, res)
      case 'DELETE':
        return await deleteUser(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('User management API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getUsers(req, res) {
  const { company_id, role, is_active, search } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query
  let query = supabase
    .from('users')
    .select('*')
    .eq('company_id', company_id)

  if (role && ['admin', 'workforce'].includes(role)) {
    query = query.eq('role', role)
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true')
  }

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      first_name.ilike.%${searchTerm}%,
      last_name.ilike.%${searchTerm}%,
      phone.ilike.%${searchTerm}%
    `)
  }

  query = query.order('created_at', { ascending: false })

  const { data: users, error } = await query

  if (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    })
  }

  return res.status(200).json({
    success: true,
    data: users || []
  })
}

async function createUser(req, res) {
  const {
    company_id,
    email,
    password,
    first_name,
    last_name,
    phone,
    role = 'workforce',
    permissions = {},
    is_active = true
  } = req.body

  if (!company_id || !email || !password || !first_name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, email, password, and first name are required'
    })
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    })
  }

  // Validate role
  if (!['admin', 'workforce'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Role must be either admin or workforce'
    })
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long'
    })
  }

  try {
    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return res.status(400).json({
        success: false,
        error: `Failed to create user account: ${authError.message}`
      })
    }

    // Create user profile
    const userData = {
      id: authUser.user.id,
      company_id,
      first_name: first_name.trim(),
      last_name: last_name?.trim(),
      phone: phone?.trim(),
      role,
      permissions,
      is_active,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (userError) {
      // Rollback auth user creation if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      
      console.error('Error creating user profile:', userError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile'
      })
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    })

  } catch (error) {
    console.error('Error in user creation:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    })
  }
}

async function updateUser(req, res) {
  const { user_id } = req.query
  const updateData = req.body

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    })
  }

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    })
  }

  // Validate role if provided
  if (updateData.role && !['admin', 'workforce'].includes(updateData.role)) {
    return res.status(400).json({
      success: false,
      error: 'Role must be either admin or workforce'
    })
  }

  // Prepare update data
  const allowedFields = [
    'first_name', 'last_name', 'phone', 'avatar_url', 'role', 'permissions', 'is_active'
  ]

  const finalUpdateData = {}
  
  allowedFields.forEach(field => {
    if (updateData.hasOwnProperty(field)) {
      let value = updateData[field]
      
      if (['first_name', 'last_name', 'phone'].includes(field) && value) {
        value = value.trim()
      }
      
      finalUpdateData[field] = value
    }
  })

  finalUpdateData.updated_at = new Date().toISOString()

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(finalUpdateData)
    .eq('id', user_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating user:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update user'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  })
}

async function deleteUser(req, res) {
  const { user_id, company_id } = req.body

  if (!user_id || !company_id) {
    return res.status(400).json({
      success: false,
      error: 'User ID and company ID are required'
    })
  }

  // Check if user exists
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    })
  }

  try {
    // Deactivate user instead of hard delete
    const { error: deactivateError } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (deactivateError) {
      console.error('Error deactivating user:', deactivateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate user'
      })
    }

    // Optionally delete from Supabase Auth (uncomment if needed)
    // await supabase.auth.admin.deleteUser(user_id)

    return res.status(200).json({
      success: true,
      message: `User "${user.first_name} ${user.last_name}" deactivated successfully`
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    })
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default withAuth(handler)
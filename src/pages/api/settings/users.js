// pages/api/settings/users.js
import { supabase, supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

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

  // Build query using admin client to bypass RLS
  let query = supabaseAdmin
    .from('users')
    .select('*')
    .eq('company_id', company_id)

  if (role && ['admin', 'workforce'].includes(role)) {
    query = query.eq('role', role)
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true')
  }

  // Apply search filter for user fields (excluding email for now)
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

  // For each user, fetch their email using the admin client's auth API
  const usersWithEmail = await Promise.all(users?.map(async (user) => {
    try {
      // Use admin client to get user details from auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id)
      
      if (authError) {
        console.error('Error fetching auth user data for user ID:', user.id, authError)
        // Return user data without email if we can't fetch it
        return { ...user, email: null }
      }
      
      return { ...user, email: authUser?.user?.email || null }
    } catch (err) {
      console.error('Error fetching email for user:', user.id, err)
      // Return user data without email if we encounter an error
      return { ...user, email: null }
    }
  })) || []

  // Filter users based on search term for email (if search is provided)
  let filteredUsers = usersWithEmail || []
  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase()
    filteredUsers = filteredUsers.filter(user => 
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm)) ||
      (user.phone && user.phone.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email && user.email.toLowerCase().includes(searchTerm))
    )
  }

  return res.status(200).json({
    success: true,
    data: filteredUsers
  })
}

async function checkUserLimit(company_id, role) {
  try {
    // Only check limit for workforce users
    if (role !== 'workforce') {
      return { withinLimit: true };
    }

    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('role', 'workforce')

    if (error) throw error
    
    // Allow up to 2 workforce users
    const withinLimit = count < 2
    return { withinLimit, currentCount: count };
  } catch (err) {
    console.error('Error checking user limit:', err)
    return { withinLimit: false, error: err.message };
  }
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
    // Check if company exists
    console.log('Checking if company exists:', company_id);
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      console.error('Company not found:', companyError);
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    // Check user limit for workforce users
    if (role === 'workforce') {
      const { withinLimit, currentCount, error: limitError } = await checkUserLimit(company_id, role);
      
      if (limitError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to check user limit'
        });
      }
      
      if (!withinLimit) {
        return res.status(400).json({
          success: false,
          error: 'Maximum of 2 workforce users allowed per company',
          details: `Current workforce users: ${currentCount}/2`
        });
      }
    }

    // Clean up any existing auth user with this email (prevents token conflicts when testing)
    console.log('🔍 Checking for existing auth user with email:', email);
    try {
      // Try to find existing user by email
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (!listError && existingUsers?.users) {
        const existingAuthUser = existingUsers.users.find(u => u.email === email);

        if (existingAuthUser) {
          console.log('⚠️ Found existing auth user, deleting to prevent token conflicts:', existingAuthUser.id);

          // Delete from auth.users
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);

          if (deleteAuthError) {
            console.error('❌ Error deleting existing auth user:', deleteAuthError);
          } else {
            console.log('✅ Deleted existing auth user successfully');
          }

          // Also delete from users table if exists
          try {
            await supabaseAdmin
              .from('users')
              .delete()
              .eq('id', existingAuthUser.id);
            console.log('✅ Deleted existing user profile successfully');
          } catch (profileDeleteErr) {
            console.error('⚠️ Error deleting user profile (might not exist):', profileDeleteErr);
          }
        } else {
          console.log('✅ No existing auth user found, proceeding with invite');
        }
      }
    } catch (cleanupErr) {
      console.error('⚠️ Error during cleanup (proceeding anyway):', cleanupErr);
      // Don't fail the whole operation, just log and continue
    }

    // Use inviteUserByEmail - this is the ONLY method that sends emails via Supabase
    // IMPORTANT: We store the password in metadata and set it AFTER email confirmation
    // Setting password before confirmation invalidates the invite token!
    console.log('📧 Inviting user with email (this will send the invitation email):', email);
    let invitedUser;
    try {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: first_name.trim(),
          last_name: last_name?.trim(),
          phone: phone?.trim(),
          role,
          company_id,
          admin_set_password: password // Store password in metadata to set after confirmation
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      });

      if (inviteError) {
        console.error('❌ Error inviting user:', inviteError);
        return res.status(400).json({
          success: false,
          error: `Failed to invite user: ${inviteError.message}`
        })
      }

      invitedUser = inviteData.user;
      console.log('✅ Invitation email sent successfully to:', email, '| User ID:', invitedUser.id);
      console.log('⏳ Password will be set automatically after user confirms email');
    } catch (inviteErr) {
      console.error('💥 Exception during user invitation:', inviteErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to send invitation email. Please check your Supabase SMTP configuration.'
      })
    }

    // DO NOT set password here - it invalidates the invite token!
    // Password will be set automatically in the callback page after email confirmation

    // Create user profile (without email since it's in auth.users)
    const userData = {
      id: invitedUser.id,
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

    console.log('Creating user profile with data:', userData);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (userError) {
      console.error('Error creating user profile:', userError);
      console.error('User data that failed:', userData);

      // Rollback auth user creation if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log('Rolled back auth user creation');
      } catch (deleteError) {
        console.error('Error deleting auth user during rollback:', deleteError);
      }

      return res.status(500).json({
        success: false,
        error: `Failed to create user profile: ${userError.message}`
      })
    }

    console.log('User profile created successfully - invitation email sent automatically to:', email);

    // Add email to the response for the frontend
    const userWithEmail = {
      ...user,
      email: email.trim()
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully. A confirmation email has been sent to the user.',
      data: userWithEmail,
      emailSent: true
    })

  } catch (error) {
    console.error('Error in user creation:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to create user: ${error.message}`
    })
  }
}

// Function to log fallback email content
async function logFallbackEmail(userEmail, password, firstName, companyId) {
  try {
    // Get company name for the email
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company for email:', companyError);
      throw companyError;
    }

    const companyName = company?.name || 'Your Company';

    // Create email content
    const emailSubject = `Welcome to ${companyName} - Your Account Credentials`;
    const emailBody = `
=== FALLBACK EMAIL CONTENT (Email service may not be configured) ===
To: ${userEmail}
Subject: ${emailSubject}

Hello ${firstName},

Welcome to ${companyName}!

An account has been created for you on the ${companyName} platform.

Your login credentials are:
Email: ${userEmail}
Password: ${password}

You can login at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

Please change your password after your first login for security purposes.

Best regards,
The ${companyName} Team
=== END EMAIL CONTENT ===
    `;

    console.log(emailBody);
  } catch (error) {
    console.error('Error in logFallbackEmail:', error);
    throw error;
  }
}

// Function to send welcome email with credentials
async function sendWelcomeEmail(userEmail, password, firstName, companyId) {
  try {
    // Get company name for the email
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company for email:', companyError);
      throw companyError;
    }

    const companyName = company?.name || 'Your Company';

    // Create email content
    const emailSubject = `Welcome to ${companyName} - Your Account Credentials`;
    const emailBody = `
      Hello ${firstName},

      Welcome to ${companyName}!

      An account has been created for you on the ${companyName} platform.

      Your login credentials are:
      Email: ${userEmail}
      Password: ${password}

      You can login at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

      Please change your password after your first login for security purposes.

      Best regards,
      The ${companyName} Team
    `;

    // For now, we'll just log the email content
    // In a real implementation, you would integrate with an email service like:
    // - SendGrid
    // - Nodemailer with SMTP
    // - AWS SES
    // - Supabase Email (if configured)
    
    console.log('=== WELCOME EMAIL CONTENT ===');
    console.log('To:', userEmail);
    console.log('Subject:', emailSubject);
    console.log('Body:', emailBody);
    console.log('=== END EMAIL CONTENT ===');

    // In a production environment, you would uncomment one of these approaches:
    
    // Option 1: Using a simple SMTP service with Nodemailer
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: emailSubject,
      text: emailBody
    });
    */

    // Option 2: Using a service like SendGrid
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to: userEmail,
      from: process.env.FROM_EMAIL,
      subject: emailSubject,
      text: emailBody
    });
    */

    console.log(`Welcome email "sent" to ${userEmail} (logged for development)`);
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    throw error;
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

  // Check if user exists using admin client
  const { data: existingUser, error: fetchError } = await supabaseAdmin
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

  const { data: updatedUser, error: updateError } = await supabaseAdmin
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

  // Check if user exists using admin client
  const { data: user, error: fetchError } = await supabaseAdmin
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
    // Deactivate user instead of hard delete using admin client
    const { error: deactivateError } = await supabaseAdmin
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
    // await supabaseAdmin.auth.admin.deleteUser(user_id)

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
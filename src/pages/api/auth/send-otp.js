// pages/api/auth/send-otp.js
// FIXED: Don't create users automatically, only allow existing users

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  try {
    // Create Supabase client with service role (for server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 🔑 FIRST: Check if user already exists in auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error checking users:', listError)
      return res.status(500).json({ 
        message: 'Failed to verify email. Please try again.' 
      })
    }

    // Check if email exists in auth users
    const userExists = users.some(user => user.email === email)

    if (!userExists) {
      console.log('User not found for email:', email)
      return res.status(400).json({ 
        message: 'Email not found. Please create an account first.' 
      })
    }

    // 🔑 ONLY IF USER EXISTS: Send OTP (don't create new user)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,  // ✅ FIXED: Don't create users
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (error) {
      console.error('Send OTP error:', error)
      return res.status(400).json({ 
        message: error.message || 'Failed to send OTP. Please try again.'
      })
    }

    return res.status(200).json({ 
      success: true,
      message: 'OTP sent successfully to your email'
    })
  } catch (error) {
    console.error('Send OTP exception:', error)
    return res.status(500).json({ 
      message: 'An error occurred. Please try again.' 
    })
  }
}
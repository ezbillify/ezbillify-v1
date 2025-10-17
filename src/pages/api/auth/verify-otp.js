// pages/api/auth/verify-otp.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email, otp } = req.body

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' })
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

    // Verify OTP using Supabase's native verifyOtp method
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    })

    if (error) {
      console.error('Verify OTP error:', error)
      return res.status(401).json({ 
        message: error.message || 'Invalid or expired verification code'
      })
    }

    if (!data?.session) {
      return res.status(401).json({ 
        message: 'Failed to create session'
      })
    }

    // Return session tokens so client can store them
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }
    })
  } catch (error) {
    console.error('Verify OTP exception:', error)
    return res.status(500).json({ 
      message: 'An error occurred. Please try again.' 
    })
  }
}
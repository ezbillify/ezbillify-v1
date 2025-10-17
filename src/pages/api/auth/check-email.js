// pages/api/auth/check-email.js
// Check if email exists in Supabase auth

import { supabase } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Try to send OTP - if email doesn't exist, Supabase will let us know
    // We use this as a way to verify email existence without exposing auth details
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false // Don't create user if doesn't exist
      }
    })

    // If error mentions user not found, email doesn't exist
    if (error?.message?.includes('user') && error?.message?.includes('not found')) {
      return res.status(200).json({ exists: false })
    }

    // Any other error or no error means email exists (or we should assume it does)
    return res.status(200).json({ exists: true })
  } catch (error) {
    console.error('Error checking email:', error)
    // If error, assume email exists to be safe
    return res.status(200).json({ exists: true })
  }
}
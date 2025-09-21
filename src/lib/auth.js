// lib/auth.js
import { supabase } from '../services/utils/supabase'

export const auth = {
  // Sign up user
  async signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Sign in user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Reset password
  async resetPassword(email, redirectTo = null) {
    const options = redirectTo ? { redirectTo } : {}
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, options)
    return { data, error }
  },

  // Update password
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  },

  // Update user profile
  async updateProfile(updates) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })
    return { data, error }
  },

  // Verify OTP
  async verifyOTP(email, token, type = 'email') {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
    })
    return { data, error }
  },

  // Resend OTP
  async resendOTP(email, type = 'signup') {
    const { data, error } = await supabase.auth.resend({
      type,
      email
    })
    return { data, error }
  }
}

export default auth
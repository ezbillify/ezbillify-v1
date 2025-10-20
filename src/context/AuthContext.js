// context/AuthContext.js - FIXED VERSION with OTP Support
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers, dbHelpers, handleSupabaseError } from '../services/utils/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('AuthContext - Initializing...')
        
        // Get initial session
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        console.log('AuthContext - Initial session:', !!currentSession)
        
        if (!mounted) return

        if (currentSession?.user) {
          console.log('AuthContext - User found, setting up...')
          setSession(currentSession)
          setUser(currentSession.user)
          
          // Fetch user data in parallel
          const [profileResult, companyResult] = await Promise.all([
            fetchUserProfile(currentSession.user.id),
            fetchUserCompany(currentSession.user.id)
          ])
          
          if (!mounted) return
          
          console.log('AuthContext - Profile and company loaded:', { 
            profile: !!profileResult, 
            company: !!companyResult 
          })
          
          setUserProfile(profileResult)
          setCompany(companyResult)
        } else {
          console.log('AuthContext - No session, clearing state')
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setCompany(null)
        }
      } catch (error) {
        console.error('AuthContext - Error initializing auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
          console.log('AuthContext - Initialization complete')
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('AuthContext - Auth state change:', event, !!currentSession)
        
        if (!mounted) return

        // Only handle auth changes after initial load
        if (!initialized) return

        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          console.log('AuthContext - User signed out, clearing state')
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setCompany(null)
        } else if (currentSession?.user && event === 'SIGNED_IN') {
          // Only refetch on actual sign in
          console.log('AuthContext - User signed in, refetching data')
          setSession(currentSession)
          setUser(currentSession.user)
          
          const [profileResult, companyResult] = await Promise.all([
            fetchUserProfile(currentSession.user.id),
            fetchUserCompany(currentSession.user.id)
          ])
          
          if (mounted) {
            setUserProfile(profileResult)
            setCompany(companyResult)
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          // Update session on token refresh WITHOUT refetching profile/company
          console.log('AuthContext - Token refreshed, updating session only')
          setSession(currentSession)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized])

  // FIXED: Simple sync getAccessToken that doesn't trigger re-fetches
  const getAccessToken = () => {
    if (!session?.access_token) {
      console.log('AuthContext - No access token available in current session')
      return null
    }
    
    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at
    const bufferTime = 5 * 60 // 5 minutes
    
    if (expiresAt && (now + bufferTime) >= expiresAt) {
      console.log('AuthContext - Token is expired or expiring soon')
      return null
    }
    
    console.log('AuthContext - Returning valid access token')
    return session.access_token
  }

  const fetchUserProfile = async (userId) => {
    try {
      console.log('AuthContext - Fetching user profile for:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('AuthContext - Error fetching user profile:', error)
        return null
      }
      
      console.log('AuthContext - User profile fetched:', !!data)
      return data
    } catch (error) {
      console.error('AuthContext - Error fetching user profile:', error)
      return null
    }
  }

  const fetchUserCompany = async (userId) => {
    try {
      console.log('AuthContext - Fetching user company for:', userId)
      
      // Get user's company_id first
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError || !userProfile?.company_id) {
        console.log('AuthContext - No company_id found for user')
        return null
      }

      // Then get the company details
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('AuthContext - Error fetching company:', error)
        return null
      }
      
      console.log('AuthContext - Company fetched:', data?.name || 'Unknown')
      return data
    } catch (error) {
      console.error('AuthContext - Error fetching company:', error)
      return null
    }
  }

  // Sign In function
  const signIn = async (email, password) => {
    try {
      console.log('AuthContext - Signing in user:', email)
      
      const { data, error } = await authHelpers.signIn(email, password)

      if (error) {
        console.error('AuthContext - Sign in error:', error)
        return { error: handleSupabaseError(error) }
      }

      console.log('AuthContext - Sign in successful')
      return { data, error: null }
    } catch (error) {
      console.error('AuthContext - Sign in exception:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  // Sign Up function
  const signUp = async (email, password, userData) => {
    try {
      console.log('AuthContext - Signing up user:', email)
      
      const { data, error } = await authHelpers.signUp(email, password, {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      })

      if (error) {
        console.error('AuthContext - Sign up error:', error)
        return { error: handleSupabaseError(error) }
      }

      if (data.user && !data.session) {
        return { 
          data, 
          error: null,
          requiresVerification: true,
          message: 'Please check your email and click the verification link to complete registration.'
        }
      }

      console.log('AuthContext - Sign up successful')
      return { data, error: null }
    } catch (error) {
      console.error('AuthContext - Sign up exception:', error)
      return { error: 'Registration failed. Please try again.' }
    }
  }

  // 🔑 NEW: Verify OTP function - For OTP login
  const verifyOTP = async (email, otpCode) => {
    try {
      console.log('AuthContext - Verifying OTP for:', email)
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      })

      if (error) {
        console.error('AuthContext - OTP verification error:', error)
        return { error: handleSupabaseError(error) }
      }

      console.log('AuthContext - OTP verified successfully')
      
      // Set session and user after OTP verification
      if (data?.session && data?.user) {
        setSession(data.session)
        setUser(data.user)
        
        // Fetch user profile and company
        const [profileResult, companyResult] = await Promise.all([
          fetchUserProfile(data.user.id),
          fetchUserCompany(data.user.id)
        ])
        
        setUserProfile(profileResult)
        setCompany(companyResult)
        
        console.log('AuthContext - User profile and company loaded after OTP')
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('AuthContext - OTP verification exception:', error)
      return { error: 'OTP verification failed. Please try again.' }
    }
  }

  // Create company function - NOW CALLS API TO AUTO-CREATE BRANCH
  const createCompany = async (companyData) => {
    try {
      console.log('AuthContext - Creating company:', companyData.name)
      
      if (!user?.id) {
        return { success: false, error: 'No authenticated user found' }
      }

      // Call API endpoint that creates company AND branch
      const response = await fetch('/api/companies/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(companyData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('AuthContext - Create company error:', result.error)
        return { 
          success: false, 
          error: result.error || 'Failed to create company' 
        }
      }

      console.log('AuthContext - Company and branch created successfully')
      
      const company = result.data.company
      const branch = result.data.branch

      console.log('AuthContext - Now creating user profile')

      const userProfileData = {
        id: user.id,
        company_id: company.id,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        phone: user.user_metadata?.phone || null,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newProfile, error: createProfileError } = await supabase
        .from('users')
        .insert(userProfileData)
        .select()
        .single()

      if (createProfileError) {
        console.error('AuthContext - Create user profile error:', createProfileError)
        
        if (createProfileError.code === '23505') {
          console.log('AuthContext - User profile exists, updating with company_id')
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('users')
            .update({ 
              company_id: company.id,
              role: 'admin',
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single()

          if (updateError) {
            console.error('AuthContext - Update user profile error:', updateError)
            return { success: false, error: 'Failed to link user to company: ' + handleSupabaseError(updateError) }
          }

          setUserProfile(updatedProfile)
        } else {
          let errorMessage = 'Failed to create user profile: '
          if (createProfileError.code === '23503') {
            errorMessage = 'Database constraint error. Please contact support.'
          } else {
            errorMessage += handleSupabaseError(createProfileError)
          }
          return { success: false, error: errorMessage }
        }
      } else {
        setUserProfile(newProfile)
      }

      setCompany(company)
      
      console.log('AuthContext - Company setup complete with branch:', branch?.id)
      
      return { success: true, company, branch, error: null }
    } catch (error) {
      console.error('AuthContext - Create company exception:', error)
      return { success: false, error: 'Failed to create company: ' + error.message }
    }
  }

  // Reset Password function
  const resetPassword = async (email) => {
    try {
      const { data, error } = await authHelpers.resetPassword(email)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      return { 
        data, 
        error: null,
        message: 'Password reset email sent! Please check your inbox.'
      }
    } catch (error) {
      return { error: 'Failed to send reset email. Please try again.' }
    }
  }

  // Sign Out function
  const signOut = async () => {
    try {
      console.log('AuthContext - Signing out user')
      
      const { error } = await authHelpers.signOut()
      
      if (error) {
        console.error('AuthContext - Sign out error:', error)
      } else {
        console.log('AuthContext - Sign out successful')
      }
      
      return { error }
    } catch (error) {
      console.error('AuthContext - Sign out exception:', error)
      return { error: 'Sign out failed' }
    }
  }

  // Update company function
  const updateCompany = async (companyId, updates) => {
    try {
      if (!company || company.id !== companyId) {
        return { success: false, error: 'You do not have permission to update this company.' }
      }

      const { data: updatedCompany, error: companyError } = await supabase
        .from('companies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()
        .single()

      if (companyError) {
        return { success: false, error: handleSupabaseError(companyError) }
      }

      setCompany(updatedCompany)
      
      return { success: true, company: updatedCompany, error: null }
    } catch (error) {
      return { success: false, error: 'Failed to update company. Please try again.' }
    }
  }

  // Update user profile function
  const updateUserProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in.' }
      }

      const { data: updatedProfile, error: profileError } = await dbHelpers.updateUserProfile(user.id, {
        ...updates,
        updated_at: new Date().toISOString()
      })

      if (profileError) {
        return { success: false, error: handleSupabaseError(profileError) }
      }

      setUserProfile(updatedProfile)
      
      return { success: true, profile: updatedProfile, error: null }
    } catch (error) {
      return { success: false, error: 'Failed to update profile. Please try again.' }
    }
  }

  // Computed values
  const isAdmin = userProfile?.role === 'admin'
  const isWorkforce = userProfile?.role === 'workforce'
  const isAuthenticated = !!user && !!session
  const hasCompany = !!company

  // Get user display name helper function
  const getUserDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`.trim()
    }
    if (userProfile?.first_name) {
      return userProfile.first_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const value = {
    user,
    session,
    userProfile,
    company,
    loading,
    initialized,
    isAuthenticated,
    hasCompany,
    isAdmin,
    isWorkforce,
    getUserDisplayName,
    getAccessToken,
    signIn,
    signUp,
    verifyOTP,
    resetPassword,
    signOut,
    createCompany,
    updateCompany,
    updateUserProfile,
    fetchUserCompany,
    fetchUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
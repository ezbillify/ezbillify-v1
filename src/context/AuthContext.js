// context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers, dbHelpers, handleSupabaseError } from '../services/utils/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [initialized, setInitialized] = useState(false) // Add this flag

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          // Fetch user data in parallel
          const [profileResult, companyResult] = await Promise.all([
            fetchUserProfile(session.user.id),
            fetchUserCompany(session.user.id)
          ])
          
          if (!mounted) return
          
          setUserProfile(profileResult)
          setCompany(companyResult)
        } else {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Only handle auth changes after initial load
        if (!initialized) return

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
        } else if (session?.user && event !== 'TOKEN_REFRESHED') {
          // Only refetch on actual sign in, not token refresh
          setUser(session.user)
          
          const [profileResult, companyResult] = await Promise.all([
            fetchUserProfile(session.user.id),
            fetchUserCompany(session.user.id)
          ])
          
          if (mounted) {
            setUserProfile(profileResult)
            setCompany(companyResult)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  const fetchUserCompany = async (userId) => {
    try {
      // Get user's company_id first
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError || !userProfile?.company_id) {
        return null
      }

      // Then get the company details
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error fetching company:', error)
      return null
    }
  }

  // Sign In function
  const signIn = async (email, password) => {
    try {
      const { data, error } = await authHelpers.signIn(email, password)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      // Don't manually fetch here - let onAuthStateChange handle it
      return { data, error: null }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  // Sign Up function
  const signUp = async (email, password, userData) => {
    try {
      const { data, error } = await authHelpers.signUp(email, password, {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      })

      if (error) {
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

      return { data, error: null }
    } catch (error) {
      return { error: 'Registration failed. Please try again.' }
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
      const { error } = await authHelpers.signOut()
      // State will be cleared by onAuthStateChange
      return { error }
    } catch (error) {
      return { error: 'Sign out failed' }
    }
  }

  // Create company function
  const createCompany = async (companyData) => {
    try {
      const { data: company, error: companyError } = await dbHelpers.createCompany({
        ...companyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (companyError) {
        return { success: false, error: handleSupabaseError(companyError) }
      }

      // Update user with company_id
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          company_id: company.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (userError) {
        return { success: false, error: handleSupabaseError(userError) }
      }

      // Update local state
      setCompany(company)
      
      // Update user profile
      const updatedProfile = { ...userProfile, company_id: company.id }
      setUserProfile(updatedProfile)
      
      return { success: true, company, error: null }
    } catch (error) {
      return { success: false, error: 'Failed to create company. Please try again.' }
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
  const isAuthenticated = !!user
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
    userProfile,
    company,
    loading,
    initialized,
    isAuthenticated,
    hasCompany,
    isAdmin,
    isWorkforce,
    getUserDisplayName,
    signIn,
    signUp,
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
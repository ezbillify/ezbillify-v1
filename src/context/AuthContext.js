// context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers, dbHelpers, handleSupabaseError } from '../services/utils/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [company, setCompany] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserCompany(session.user.id)
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
        setInitializing(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserCompany(session.user.id)
          await fetchUserProfile(session.user.id)
        } else {
          setCompany(null)
          setUserProfile(null)
        }
        
        setLoading(false)
        setInitializing(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      // Simplified profile fetch without complex JOIN
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
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

      if (userError || !userProfile || !userProfile.company_id) {
        setCompany(null)
        return
      }

      // Then get the company details
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company:', error)
        setCompany(null)
      } else {
        setCompany(data)
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      setCompany(null)
    }
  }

  // Sign In function for your login page
  const signIn = async (email, password) => {
    try {
      const { data, error } = await authHelpers.signIn(email, password)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      if (data.user) {
        await fetchUserCompany(data.user.id)
        await fetchUserProfile(data.user.id)
        return { data, error: null }
      }

      return { data, error: null }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  // FIXED Sign Up function - Let the trigger handle user profile creation
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

      // If user needs email confirmation
      if (data.user && !data.session) {
        return { 
          data, 
          error: null,
          requiresVerification: true,
          message: 'Please check your email and click the verification link to complete registration.'
        }
      }

      // User profile will be created automatically by the database trigger
      // No need to create it manually anymore
      
      // If we have a session, fetch the user profile that was just created
      if (data.user && data.session) {
        // Give the trigger a moment to complete
        setTimeout(async () => {
          await fetchUserProfile(data.user.id)
        }, 1000)
      }

      return { data, error: null }
    } catch (error) {
      return { error: 'Registration failed. Please try again.' }
    }
  }

  // Reset Password function for your forgot-password page
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
      if (!error) {
        setUser(null)
        setCompany(null)
        setUserProfile(null)
      }
      return { error }
    } catch (error) {
      return { error: 'Sign out failed' }
    }
  }

  // FIXED Create company function - simplified to avoid hanging
  const createCompany = async (companyData) => {
    try {
      console.log('Creating company with data:', companyData)
      
      // Create company first
      const { data: company, error: companyError } = await dbHelpers.createCompany({
        ...companyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      console.log('Company creation result:', { company, companyError })

      if (companyError) {
        console.error('Company creation error:', companyError)
        return { success: false, error: handleSupabaseError(companyError) }
      }

      console.log('Updating user with company_id:', company.id)

      // Update user with company_id
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          company_id: company.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      console.log('User update result:', { userError })

      if (userError) {
        console.error('User update error:', userError)
        return { success: false, error: handleSupabaseError(userError) }
      }

      // Set company immediately and return success
      setCompany(company)
      
      // Update user profile in background without blocking
      setTimeout(async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          if (data) setUserProfile(data)
        } catch (err) {
          console.log('Profile refresh error:', err)
        }
      }, 500)
      
      console.log('Company creation successful!')
      return { success: true, company, error: null }
    } catch (error) {
      console.error('Unexpected error in createCompany:', error)
      return { success: false, error: 'Failed to create company. Please try again.' }
    }
  }

  // Update company function
  const updateCompany = async (companyId, updates) => {
    try {
      // Check if user has permission to update company
      if (!company || company.id !== companyId) {
        return { success: false, error: 'You do not have permission to update this company.' }
      }

      // Update company in database
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

      // Update local state
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

  // Check if user is admin (your schema shows role defaulting to 'admin')
  const isAdmin = userProfile?.role === 'admin'
  const isWorkforce = userProfile?.role === 'workforce'

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
    initializing,
    isAuthenticated: !!user,
    hasCompany: !!company,
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

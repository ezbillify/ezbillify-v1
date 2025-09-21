// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, authHelpers, dbHelpers, handleSupabaseError } from '../services/utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { session } = await authHelpers.getSession()
        
        if (session?.user && mounted) {
          await handleUserSession(session.user)
        } else if (mounted) {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitializing(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth event:', event)
        
        if (session?.user) {
          await handleUserSession(session.user)
        } else {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
          
          // Redirect to login if on protected route
          const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
          if (!publicRoutes.includes(router.pathname)) {
            router.push('/login')
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [router])

  // Handle user session and load profile/company
  const handleUserSession = async (user) => {
    try {
      setUser(user)
      
      // Load user profile with company data
      const { data: profile, error: profileError } = await dbHelpers.getUserProfile(user.id)
      
      if (profileError) {
        console.error('Error loading user profile:', profileError)
        // If user doesn't have a profile, create one
        if (profileError.code === 'PGRST116') { // No rows returned
          const { data: newProfile, error: createError } = await dbHelpers.createUserProfile({
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: 'admin',
            is_active: true
          })
          
          if (createError) {
            console.error('Error creating user profile:', createError)
            return
          }
          
          setUserProfile(newProfile)
        }
        return
      }

      setUserProfile(profile)
      
      if (profile?.company_id && profile?.companies) {
        setCompany(profile.companies)
      }
      
    } catch (error) {
      console.error('Error handling user session:', error)
    }
  }

  // Sign up function
  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true)
      
      const { data, error } = await authHelpers.signUp(email, password, {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      })

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      // If email confirmation is required, return success message
      if (data.user && !data.session) {
        return { 
          success: true,
          message: 'Registration successful! Please check your email to verify your account.',
          requiresVerification: true 
        }
      }

      return { success: true, user: data.user }
    } catch (error) {
      return { error: 'Registration failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      
      const { data, error } = await authHelpers.signIn(email, password)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      return { success: true, user: data.user }
    } catch (error) {
      return { error: 'Login failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true)
      
      const { error } = await authHelpers.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        return { error: 'Sign out failed' }
      }

      // Clear state
      setUser(null)
      setUserProfile(null)
      setCompany(null)
      
      // Redirect to login
      router.push('/login')
      
      return { success: true }
    } catch (error) {
      return { error: 'Sign out failed' }
    } finally {
      setLoading(false)
    }
  }

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { data, error } = await authHelpers.resetPassword(email)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox.' 
      }
    } catch (error) {
      return { error: 'Failed to send reset email' }
    }
  }

  // Update password function
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await authHelpers.updatePassword(newPassword)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      return { success: true, message: 'Password updated successfully' }
    } catch (error) {
      return { error: 'Failed to update password' }
    }
  }

  // Create company function
  const createCompany = async (companyData) => {
    try {
      if (!user) {
        return { error: 'No authenticated user' }
      }

      // Create company
      const { data: company, error: companyError } = await dbHelpers.createCompany({
        ...companyData,
        status: 'active',
        subscription_plan: 'basic'
      })

      if (companyError) {
        return { error: handleSupabaseError(companyError) }
      }

      // Update user profile with company_id
      const { data: updatedProfile, error: profileError } = await dbHelpers.updateUserProfile(
        user.id,
        { 
          company_id: company.id,
          first_name: userProfile?.first_name || user.user_metadata?.first_name,
          last_name: userProfile?.last_name || user.user_metadata?.last_name
        }
      )

      if (profileError) {
        return { error: handleSupabaseError(profileError) }
      }

      // Update state
      setCompany(company)
      setUserProfile({ ...updatedProfile, companies: company })

      return { success: true, company }
    } catch (error) {
      return { error: 'Failed to create company' }
    }
  }

  // Update company function
  const updateCompany = async (updates) => {
    try {
      if (!company?.id) {
        return { error: 'No company found' }
      }

      const { data: updatedCompany, error } = await dbHelpers.updateCompany(company.id, updates)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setCompany(updatedCompany)
      return { success: true, company: updatedCompany }
    } catch (error) {
      return { error: 'Failed to update company' }
    }
  }

  // Check authentication status
  const isAuthenticated = !!user
  const hasCompany = !!company
  const isAdmin = userProfile?.role === 'admin'
  const isWorkforce = userProfile?.role === 'workforce'

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.first_name || userProfile?.last_name) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
    }
    return user?.email || 'User'
  }

  const value = {
    // State
    user,
    userProfile,
    company,
    loading,
    initializing,
    
    // Status checks
    isAuthenticated,
    hasCompany,
    isAdmin,
    isWorkforce,
    
    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    createCompany,
    updateCompany,
    
    // Helpers
    getUserDisplayName,
    
    // Refresh functions
    refreshProfile: () => handleUserSession(user),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext

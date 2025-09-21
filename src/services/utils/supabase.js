// src/services/utils/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build time, create a mock client if env vars are missing
let supabase

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Missing Supabase environment variables!')
    console.log('Add these to your .env.local file:')
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  }
  
  // Create a mock client for build time
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      updateUser: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          limit: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
          order: () => ({ 
            limit: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
          })
        }),
        insert: () => ({ 
          select: () => ({ 
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          })
        }),
        update: () => ({ 
          eq: () => ({ 
            select: () => ({ 
              single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          })
        }),
        gte: () => ({ 
          lte: () => ({ 
            eq: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
          })
        })
      }),
      upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {}
    }),
    removeChannel: () => {}
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      enabled: true
    }
  })
}

// Helper functions for auth
export const authHelpers = {
  // Sign up new user
  signUp: async (email, password, userData = {}) => {
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
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out user
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Reset password
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { data, error }
  },

  // Update user password
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }
}

// Database helpers with RLS
export const dbHelpers = {
  // Company operations
  createCompany: async (companyData) => {
    const { data, error } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single()
    return { data, error }
  },

  getCompany: async (companyId) => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()
    return { data, error }
  },

  updateCompany: async (companyId, updates) => {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single()
    return { data, error }
  },

  // User profile operations
  createUserProfile: async (userData) => {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    return { data, error }
  },

  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        companies (
          id,
          name,
          email,
          gstin,
          business_type,
          logo_url,
          billing_currency,
          timezone,
          status,
          subscription_plan
        )
      `)
      .eq('id', userId)
      .single()
    return { data, error }
  },

  updateUserProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Check if user has company
  checkUserCompany: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('company_id, companies(name, status)')
      .eq('id', userId)
      .single()
    return { data, error }
  }
}

// Real-time subscriptions
export const realtimeHelpers = {
  // Subscribe to company data changes
  subscribeToCompany: (companyId, callback) => {
    return supabase
      .channel(`company:${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'companies',
        filter: `id=eq.${companyId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to sales documents
  subscribeToSalesDocuments: (companyId, callback) => {
    return supabase
      .channel(`sales_docs:${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sales_documents',
        filter: `company_id=eq.${companyId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to payments
  subscribeToPayments: (companyId, callback) => {
    return supabase
      .channel(`payments:${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `company_id=eq.${companyId}`
      }, callback)
      .subscribe()
  },

  // Unsubscribe from channel
  unsubscribe: (channel) => {
    return supabase.removeChannel(channel)
  }
}

// Error handling utility
export const handleSupabaseError = (error) => {
  if (!error) return null
  
  // Common error mappings for user-friendly messages
  const errorMessages = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please check your email and click the confirmation link.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Invalid email': 'Please enter a valid email address.',
    'Too many requests': 'Too many attempts. Please try again later.',
    'Network request failed': 'Network error. Please check your connection.',
    'Supabase not configured': 'Database connection not available. Please contact support.'
  }

  return errorMessages[error.message] || error.message || 'An unexpected error occurred.'
}

// Storage helpers for file uploads
export const storageHelpers = {
  // Upload company logo
  uploadLogo: async (companyId, file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/logo.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) return { data: null, error }
    
    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName)
    
    return { data: { path: data.path, publicUrl }, error: null }
  },

  // Upload letterhead
  uploadLetterhead: async (companyId, file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/letterhead.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) return { data: null, error }
    
    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName)
    
    return { data: { path: data.path, publicUrl }, error: null }
  },

  // Delete file
  deleteFile: async (path) => {
    const { data, error } = await supabase.storage
      .from('company-assets')
      .remove([path])
    return { data, error }
  }
}

export { supabase }
export default supabase

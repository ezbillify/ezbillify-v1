// hooks/useAPI.js - FIXED VERSION FOR BOTH STOCK AND ITEMS
import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const executeRequest = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      
      // If result already has success/data structure from API, return as-is
      if (result && typeof result === 'object' && 'success' in result) {
        return result
      }
      
      // Otherwise wrap it
      return { success: true, data: result }
    } catch (err) {
      setError(err.message || 'An error occurred')
      return { success: false, error: err.message || 'An error occurred' }
    } finally {
      setLoading(false)
    }
  }, [])

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    let token = getAccessToken()
    
    if (!token) {
      // Try to refresh the session
      console.log('API - No valid token, attempting to refresh session')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error || !data?.session?.access_token) {
        throw new Error('Authentication required - please sign in again')
      }
      
      token = data.session.access_token
      console.log('API - Token refreshed successfully')
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    const fetchOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    }

    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  }, [getAccessToken])

  const clearError = () => setError(null)

  return {
    loading,
    error,
    executeRequest,
    authenticatedFetch,
    clearError
  }
}

export default useAPI
// hooks/useAPI.js - UPDATED VERSION
import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'

export const useAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const executeRequest = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      return { success: true, data: result }
    } catch (err) {
      setError(err.message || 'An error occurred')
      return { success: false, error: err.message || 'An error occurred' }
    } finally {
      setLoading(false)
    }
  }, [])

  // UPDATED: Helper function to make authenticated API calls with async token retrieval
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    console.log('=== AUTHENTICATED FETCH START ===');
    console.log('URL:', url);
    console.log('Options:', options);
    
    // UPDATED: Make getAccessToken async
    const token = await getAccessToken()
    
    console.log('Token from getAccessToken:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...'
    });
    
    if (!token) {
      console.error('AUTHENTICATED FETCH - No token available');
      throw new Error('No authentication token available')
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

    console.log('Final fetch options:', {
      method: fetchOptions.method || 'GET',
      url: url,
      hasAuthHeader: !!fetchOptions.headers.Authorization,
      authHeaderStart: fetchOptions.headers.Authorization?.substring(0, 30) + '...',
      hasContentType: !!fetchOptions.headers['Content-Type'],
      bodyLength: fetchOptions.body?.length || 0
    });
    console.log('=== MAKING FETCH REQUEST ===');

    const response = await fetch(url, fetchOptions)
    
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Response error data:', errorData);
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
    }

    const responseData = await response.json()
    console.log('=== AUTHENTICATED FETCH END ===');
    return responseData
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
// hooks/useAPI.js - MINIMAL OPTIMIZED VERSION
import { useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

// Global cache and request tracking
const queryCache = new Map()
const ongoingRequests = new Map()

export const useAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()
  const cacheTimerRef = useRef({})

  const clearCache = useCallback((url = null) => {
    if (url) {
      queryCache.delete(url)
    } else {
      queryCache.clear()
    }
  }, [])

  const executeRequest = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      
      if (result && typeof result === 'object' && 'success' in result) {
        return result
      }
      
      return { success: true, data: result }
    } catch (err) {
      setError(err.message || 'An error occurred')
      return { success: false, error: err.message || 'An error occurred' }
    } finally {
      setLoading(false)
    }
  }, [])

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const { skipCache = false, cacheTime = 5 * 60 * 1000 } = options
    const requestKey = `${options.method || 'GET'}-${url}`

    // ✅ 1. Return if request already in progress
    if (ongoingRequests.has(requestKey)) {
      console.log('🔄 Deduped request:', url)
      return ongoingRequests.get(requestKey)
    }

    // ✅ 2. Check cache for GET requests
    if (!skipCache && (!options.method || options.method === 'GET')) {
      if (queryCache.has(url)) {
        console.log('📦 Cache HIT:', url)
        return queryCache.get(url)
      }
    }

    // ✅ 3. Token handling
    let token = getAccessToken()
    
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession()
      token = sessionData?.session?.access_token
      
      if (!token) {
        const { data } = await supabase.auth.refreshSession()
        if (!data?.session?.access_token) {
          throw new Error('Authentication required')
        }
        token = data.session.access_token
      }
    }

    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    }

    // ✅ 4. Execute request
    const requestPromise = (async () => {
      try {
        console.log('📡 Fetching:', url)
        const response = await fetch(url, fetchOptions)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()

        // ✅ 5. Cache GET responses
        if (!options.method || options.method === 'GET') {
          queryCache.set(url, data)
          
          if (cacheTimerRef.current[url]) {
            clearTimeout(cacheTimerRef.current[url])
          }
          
          cacheTimerRef.current[url] = setTimeout(() => {
            queryCache.delete(url)
          }, cacheTime)
        }

        return data
      } finally {
        ongoingRequests.delete(requestKey)
      }
    })()

    ongoingRequests.set(requestKey, requestPromise)
    return requestPromise
  }, [getAccessToken])

  return {
    loading,
    error,
    executeRequest,
    authenticatedFetch,
    clearCache,
    clearError: () => setError(null)
  }
}

export default useAPI
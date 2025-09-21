// hooks/useAPI.js
import { useState, useCallback } from 'react'

export const useAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  const clearError = () => setError(null)

  return {
    loading,
    error,
    executeRequest,
    clearError
  }
}

export default useAPI
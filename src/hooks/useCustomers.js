// hooks/useCustomers.js - FIXED AND OPTIMIZED
import { useState, useCallback } from 'react'
import { useAPI } from './useAPI'

export const useCustomers = () => {
  const { executeRequest, authenticatedFetch, clearCache } = useAPI()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ total: 0 })

  const fetchCustomers = useCallback(async (companyId, params = {}) => {
    if (!companyId) {
      setError('Company ID is required')
      return { success: false, error: 'Company ID is required' }
    }

    setLoading(true)
    setError(null)

    try {
      const cleanParams = {
        company_id: companyId,
        limit: params.limit || 20, // ✅ OPTIMIZED: Reduced default limit for better performance
        page: params.page || 1,
        status: 'active',
        ...params
      }

      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === '' || cleanParams[key] === null || cleanParams[key] === undefined) {
          delete cleanParams[key]
        }
      })

      const queryParams = new URLSearchParams(cleanParams).toString()
      const fullUrl = `/api/customers?${queryParams}`

      console.log('📡 Fetching customers:', fullUrl)

      const response = await authenticatedFetch(fullUrl)

      if (response.success) {
        setCustomers(response.data || [])
        setPagination(response.pagination || {})
        return response
      } else {
        throw new Error(response.error || 'Failed to fetch customers')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  const fetchCustomerById = useCallback(async (customerId, companyId) => {
    if (!customerId || !companyId) {
      setError('Customer ID and Company ID are required')
      return { success: false, error: 'Customer ID and Company ID are required' }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(`/api/customers/${customerId}?company_id=${companyId}`, {
        skipCache: true // Always fresh for single customer
      })
      
      if (response.success) {
        return response
      } else {
        throw new Error(response.error || 'Failed to fetch customer')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  const createCustomer = useCallback(async (customerData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData)
      })
      
      if (response.success) {
        setCustomers(prev => [response.data, ...prev])
        clearCache(`/api/customers?company_id=${customerData.company_id}*`)
        return response
      } else {
        throw new Error(response.error || 'Failed to create customer')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, clearCache])

  const updateCustomer = useCallback(async (customerId, customerData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify(customerData)
      })
      
      if (response.success) {
        setCustomers(prev => prev.map(c => c.id === customerId ? response.data : c))
        clearCache(`/api/customers?company_id=${customerData.company_id}*`)
        return response
      } else {
        throw new Error(response.error || 'Failed to update customer')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, clearCache])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    customers,
    loading,
    error,
    pagination,
    fetchCustomers,
    fetchCustomerById,
    createCustomer,
    updateCustomer,
    clearError
  }
}

export default useCustomers
// hooks/useCustomers.js
import { useState, useCallback } from 'react'
import { useAPI } from './useAPI'

export const useCustomers = () => {
  const { executeRequest, authenticatedFetch } = useAPI()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCustomers = useCallback(async (companyId, params = {}) => {
    if (!companyId) {
      setError('Company ID is required')
      return { success: false, error: 'Company ID is required' }
    }

    setLoading(true)
    setError(null)

    try {
      // Clean up params - remove empty/falsy values
      const cleanParams = {
        company_id: companyId,
        limit: 1000,
        status: 'active', // Default to active customers
        ...params
      }

      // Remove empty string values
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === '' || cleanParams[key] === null || cleanParams[key] === undefined) {
          delete cleanParams[key]
        }
      })

      const queryParams = new URLSearchParams(cleanParams).toString()
      const fullUrl = `/api/customers?${queryParams}`

      console.log('📡 Fetching customers from:', fullUrl)
      console.log('📋 Query params:', cleanParams)

      const response = await authenticatedFetch(fullUrl)

      console.log('🔍 Customer API Response:', {
        success: response.success,
        dataCount: response.data?.length || 0,
        paginationInfo: response.pagination,
        sampleCustomer: response.data?.[0],
        allCustomerNames: response.data?.map(c => c.name).slice(0, 5)
      })

      if (response.success) {
        setCustomers(response.data || [])
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
      const response = await authenticatedFetch(`/api/customers/${customerId}?company_id=${companyId}`)
      
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
        // Refresh customers list if needed
        if (customerData.company_id) {
          await fetchCustomers(customerData.company_id)
        }
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
  }, [authenticatedFetch, fetchCustomers])

  const updateCustomer = useCallback(async (customerId, customerData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify(customerData)
      })
      
      if (response.success) {
        // Refresh customers list if needed
        if (customerData.company_id) {
          await fetchCustomers(customerData.company_id)
        }
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
  }, [authenticatedFetch, fetchCustomers])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    fetchCustomerById,
    createCustomer,
    updateCustomer,
    clearError
  }
}

export default useCustomers
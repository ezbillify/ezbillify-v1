// hooks/useInvoice.js - OPTIMIZED
import { useState, useCallback } from 'react'
import { useAPI } from './useAPI'

export const useInvoice = () => {
  const { authenticatedFetch, clearCache } = useAPI()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ total: 0 })

  // ✅ FETCH INVOICES - With pagination
  const fetchInvoices = useCallback(async (companyId, params = {}) => {
    if (!companyId) {
      setError('Company ID is required')
      return { success: false, error: 'Company ID is required' }
    }

    setLoading(true)
    setError(null)

    try {
      const cleanParams = {
        company_id: companyId,
        limit: params.limit || 50, // ✅ Pagination
        page: params.page || 1,
        ...params
      }

      // Remove empty values
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === '' || cleanParams[key] === null || cleanParams[key] === undefined) {
          delete cleanParams[key]
        }
      })

      const queryParams = new URLSearchParams(cleanParams).toString()
      const fullUrl = `/api/sales/invoices?${queryParams}`

      console.log('📡 Fetching invoices:', fullUrl)

      const response = await authenticatedFetch(fullUrl)

      if (response.success) {
        setInvoices(response.data || [])
        setPagination(response.pagination || {})
        return response
      } else {
        throw new Error(response.error || 'Failed to fetch invoices')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  // ✅ FETCH SINGLE INVOICE - For detail view
  const fetchInvoiceById = useCallback(async (invoiceId, companyId) => {
    if (!invoiceId || !companyId) {
      setError('Invoice ID and Company ID are required')
      return { success: false, error: 'Invoice ID and Company ID are required' }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(
        `/api/sales/invoices/${invoiceId}?company_id=${companyId}`,
        { skipCache: true } // Always fresh for detail view
      )
      
      if (response.success) {
        return response
      } else {
        throw new Error(response.error || 'Failed to fetch invoice')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  // ✅ CREATE INVOICE
  const createInvoice = useCallback(async (invoiceData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/sales/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
      })
      
      if (response.success) {
        // ✅ Add to list instead of full refetch
        setInvoices(prev => [response.data, ...prev])
        // Clear cache for fresh fetch next time
        clearCache(`/api/sales/invoices?company_id=${invoiceData.company_id}*`)
        return response
      } else {
        throw new Error(response.error || 'Failed to create invoice')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, clearCache])

  // ✅ UPDATE INVOICE
  const updateInvoice = useCallback(async (invoiceId, invoiceData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(
        `/api/sales/invoices/${invoiceId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invoiceData)
        }
      )
      
      if (response.success) {
        // ✅ Update in place
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? response.data : inv
        ))
        // Clear cache
        clearCache(`/api/sales/invoices?company_id=${invoiceData.company_id}*`)
        return response
      } else {
        throw new Error(response.error || 'Failed to update invoice')
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, clearCache])

  // ✅ DELETE INVOICE
  const deleteInvoice = useCallback(async (invoiceId, companyId, reason = '') => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch(
        `/api/sales/invoices/${invoiceId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ company_id: companyId, reason })
        }
      )
      
      if (response.success) {
        // ✅ Remove from list
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
        // Clear cache
        clearCache(`/api/sales/invoices?company_id=${companyId}*`)
        return response
      } else {
        throw new Error(response.error || 'Failed to delete invoice')
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
    invoices,
    loading,
    error,
    pagination,
    fetchInvoices,
    fetchInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    clearError
  }
}

export default useInvoice
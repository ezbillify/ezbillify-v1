// hooks/useInvoice.js
import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useInvoice = () => {
  const { company } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchInvoices = async (filters = {}) => {
    if (!company) return

    setLoading(true)
    try {
      let query = supabase
        .from('sales_documents')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate)
      }
      if (filters.toDate) {
        query = query.lte('created_at', filters.toDate)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createInvoice = async (invoiceData) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales_documents')
        .insert([{ 
          ...invoiceData, 
          company_id: company.id,
          document_type: 'invoice'
        }])
        .select()
        .single()

      if (error) throw error
      
      setInvoices(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateInvoice = async (invoiceId, updates) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales_documents')
        .update(updates)
        .eq('id', invoiceId)
        .select()
        .single()

      if (error) throw error

      setInvoices(prev => prev.map(invoice => 
        invoice.id === invoiceId ? data : invoice
      ))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [company])

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice
  }
}

export default useInvoice
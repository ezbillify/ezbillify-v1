// hooks/useCustomer.js
import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useCustomer = () => {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCustomers = async () => {
    if (!company) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createCustomer = async (customerData) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, company_id: company.id }])
        .select()
        .single()

      if (error) throw error
      
      setCustomers(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateCustomer = async (customerId, updates) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single()

      if (error) throw error

      setCustomers(prev => prev.map(customer => 
        customer.id === customerId ? data : customer
      ))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteCustomer = async (customerId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      setCustomers(prev => prev.filter(customer => customer.id !== customerId))
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [company])

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
  }
}

export default useCustomer
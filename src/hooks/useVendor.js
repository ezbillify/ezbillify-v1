// hooks/useVendor.js
import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useVendor = () => {
  const { company } = useAuth()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVendors = async () => {
    if (!company) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVendors(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createVendor = async (vendorData) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ ...vendorData, company_id: company.id }])
        .select()
        .single()

      if (error) throw error
      
      setVendors(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateVendor = async (vendorId, updates) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId)
        .select()
        .single()

      if (error) throw error

      setVendors(prev => prev.map(vendor => 
        vendor.id === vendorId ? data : vendor
      ))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteVendor = async (vendorId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)

      if (error) throw error

      setVendors(prev => prev.filter(vendor => vendor.id !== vendorId))
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [company])

  return {
    vendors,
    loading,
    error,
    fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor
  }
}

export default useVendor
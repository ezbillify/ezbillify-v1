// hooks/useInventory.js
import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useInventory = () => {
  const { company } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchItems = async () => {
    if (!company) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createItem = async (itemData) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{ ...itemData, company_id: company.id }])
        .select()
        .single()

      if (error) throw error
      
      setItems(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (itemId, updates) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error

      setItems(prev => prev.map(item => 
        item.id === itemId ? data : item
      ))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (itemId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== itemId))
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [company])

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem
  }
}

export default useInventory
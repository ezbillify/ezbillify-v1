// src/context/BranchContext.js
import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const BranchContext = createContext()

export function BranchProvider({ children }) {
  const { user, session, company } = useAuth()
  const { addToast } = useToast()
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch branches on component mount and when user or company changes
  useEffect(() => {
    if (user?.id && session?.access_token && company?.id) {
      console.log('🏢 BranchContext - Fetching branches for company:', company.id)
      fetchBranches()
    } else {
      console.log('⏸️ BranchContext - Waiting for auth/company:', { userId: user?.id, hasToken: !!session?.access_token, companyId: company?.id })
    }
  }, [user?.id, session?.access_token, company?.id])

  const fetchBranches = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = session?.access_token

      if (!token) {
        console.warn('No session token available')
        setError('Authentication required')
        setLoading(false)
        return
      }

      if (!company?.id) {
        console.warn('No company ID available')
        setError('Company required')
        setLoading(false)
        return
      }

      const url = `/api/branches?company_id=${company.id}`
      console.log('📡 BranchContext - Fetching from:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('📦 BranchContext - API Response:', result)
      
      // Handle both response formats: { success: true, data: [...] } or just [...]
      const data = result.success ? result.data : result
      const branchesArray = Array.isArray(data) ? data : []
      
      console.log('✅ BranchContext - Branches loaded:', branchesArray.length)
      setBranches(branchesArray)

      // Set first branch as default if none selected
      if (!selectedBranch && branchesArray.length > 0) {
        const defaultBranch = branchesArray.find(b => b.is_default) || branchesArray[0]
        setSelectedBranch(defaultBranch)
        console.log('✅ BranchContext - Default branch selected:', defaultBranch.name || defaultBranch.branch_name)
      }
    } catch (err) {
      console.error('❌ BranchContext - Error fetching branches:', err)
      setError(err.message)
      setBranches([])
    } finally {
      setLoading(false)
    }
  }

  const selectBranch = (branchId) => {
    const branch = branches.find(b => b.id === branchId)
    if (branch) {
      setSelectedBranch(branch)
    }
  }

  const addBranch = async (branchData) => {
    try {
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(branchData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create branch')
      }

      const newBranch = await response.json()
      setBranches([newBranch, ...branches])
      addToast('Branch created successfully', 'success')
      return newBranch
    } catch (err) {
      console.error('Error adding branch:', err)
      setError(err.message)
      addToast(err.message, 'error')
      throw err
    }
  }

  const updateBranch = async (branchId, branchData) => {
    try {
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(branchData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update branch')
      }

      const updatedBranch = await response.json()
      setBranches(branches.map(b => b.id === branchId ? updatedBranch : b))
      
      if (selectedBranch?.id === branchId) {
        setSelectedBranch(updatedBranch)
      }
      
      addToast('Branch updated successfully', 'success')
      return updatedBranch
    } catch (err) {
      console.error('Error updating branch:', err)
      setError(err.message)
      addToast(err.message, 'error')
      throw err
    }
  }

  const deleteBranch = async (branchId) => {
    try {
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete branch')
      }

      setBranches(branches.filter(b => b.id !== branchId))
      
      if (selectedBranch?.id === branchId) {
        setSelectedBranch(branches[0] || null)
      }

      addToast('Branch deleted successfully', 'success')
      return true
    } catch (err) {
      console.error('Error deleting branch:', err)
      setError(err.message)
      addToast(err.message, 'error')
      throw err
    }
  }

  const value = {
    branches,
    selectedBranch,
    loading,
    error,
    selectBranch,
    addBranch,
    updateBranch,
    deleteBranch,
    refetchBranches: fetchBranches
  }

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider')
  }
  return context
}
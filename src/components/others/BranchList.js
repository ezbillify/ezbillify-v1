// src/components/others/BranchList.js
import { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../shared/ui/Button'
import BranchForm from './BranchForm'
import Card from '../shared/ui/Card'

const BranchList = () => {
  const { company } = useAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)

  useEffect(() => {
    if (company?.id) {
      fetchBranches()
    }
  }, [company?.id])

  const fetchBranches = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', company.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setBranches(data || [])
    } catch (err) {
      console.error('Error fetching branches:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBranch = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch?')) return

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId)

      if (error) throw error

      setBranches(branches.filter(b => b.id !== branchId))
    } catch (err) {
      console.error('Error deleting branch:', err)
      setError(err.message)
    }
  }

  const handleBranchCreated = (newBranch) => {
    setBranches([newBranch, ...branches])
    setShowForm(false)
  }

  const handleBranchUpdated = (updatedBranch) => {
    setBranches(branches.map(b => b.id === updatedBranch.id ? updatedBranch : b))
    setEditingBranch(null)
  }

  if (!company) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">No company selected</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Branches</h2>
          <p className="text-gray-600 mt-1">Manage your business branches</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowForm(true)
            setEditingBranch(null)
          }}
          disabled={loading}
        >
          + Add Branch
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Branch Form */}
      {showForm && (
        <BranchForm
          companyId={company.id}
          branch={editingBranch}
          onSuccess={editingBranch ? handleBranchUpdated : handleBranchCreated}
          onCancel={() => {
            setShowForm(false)
            setEditingBranch(null)
          }}
        />
      )}

      {/* Loading State */}
      {loading && !branches.length && (
        <Card className="p-6 text-center">
          <p className="text-gray-600">Loading branches...</p>
        </Card>
      )}

      {/* Branches List */}
      {branches.length > 0 ? (
        <div className="space-y-4">
          {branches.map(branch => (
            <Card key={branch.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {branch.name}
                    </h3>
                    {branch.is_default && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        DEFAULT
                      </span>
                    )}
                    {branch.is_active ? (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-600">Document Prefix</p>
                      <p className="font-mono text-gray-900">{branch.document_prefix}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Next Number</p>
                      <p className="font-mono text-gray-900">{branch.document_number_counter}</p>
                    </div>
                    {branch.email && (
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="text-gray-900 truncate">{branch.email}</p>
                      </div>
                    )}
                    {branch.phone && (
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-mono text-gray-900">{branch.phone}</p>
                      </div>
                    )}
                  </div>

                  {branch.address?.street && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-gray-600 text-sm">Address</p>
                      <p className="text-gray-900 text-sm">
                        {branch.address.street}
                        {branch.address.city ? `, ${branch.address.city}` : ''}
                        {branch.address.state ? `, ${branch.address.state}` : ''}
                        {branch.address.pincode ? ` - ${branch.address.pincode}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingBranch(branch)
                      setShowForm(true)
                    }}
                  >
                    Edit
                  </Button>
                  {!branch.is_default && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteBranch(branch.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !loading ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">No branches yet. Create one to get started.</p>
        </Card>
      ) : null}
    </div>
  )
}

export default BranchList
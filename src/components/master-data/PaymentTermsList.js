import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const PaymentTermsList = ({ onEdit, onAdd }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [paymentTerms, setPaymentTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchPaymentTerms()
  }, [company?.id])

  const fetchPaymentTerms = async () => {
    try {
      setLoading(true)
      
      // First check if payment_terms table exists
      const { data, error: fetchError } = await supabase
        .from('payment_terms')
        .select('*')
        .eq('company_id', company?.id)
        .order('term_days')

      if (fetchError) {
        console.error('Payment terms table might not exist:', fetchError)
        // If table doesn't exist, show empty state
        setPaymentTerms([])
        return
      }
      
      setPaymentTerms(data || [])
    } catch (err) {
      console.error('Error fetching payment terms:', err)
      setPaymentTerms([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (paymentTermId) => {
    try {
      const { error: deleteError } = await supabase
        .from('payment_terms')
        .delete()
        .eq('id', paymentTermId)

      if (deleteError) throw deleteError

      success('Payment term deleted successfully')
      fetchPaymentTerms()
    } catch (err) {
      console.error('Error deleting payment term:', err)
      error('Failed to delete payment term')
    }
    setDeleteConfirm(null)
  }

  const filteredPaymentTerms = paymentTerms.filter(paymentTerm => {
    if (!paymentTerm.term_name) return true
    return paymentTerm.term_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (paymentTerm.description && paymentTerm.description.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const formatDaysText = (days) => {
    if (days === 0) return 'Due immediately'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payment terms..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            + Add Payment Term
          </button>
        </div>
      </div>

      {/* Payment Terms Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Terms</div>
          <div className="text-2xl font-semibold text-gray-900">{paymentTerms.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Active Terms</div>
          <div className="text-2xl font-semibold text-gray-900">
            {paymentTerms.filter(pt => pt.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Average Days</div>
          <div className="text-lg font-semibold text-gray-900">
            {paymentTerms.length > 0 
              ? Math.round(paymentTerms.reduce((sum, term) => sum + term.term_days, 0) / paymentTerms.length)
              : 0}
          </div>
        </div>
      </div>

      {/* Payment Terms Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Terms</h3>
        </div>
        
        <div className="p-6">
          {filteredPaymentTerms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {paymentTerms.length === 0 ? 'No payment terms found' : 'No payment terms match your search'}
              </div>
              {paymentTerms.length === 0 && (
                <button
                  onClick={onAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create your first payment term
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Term
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPaymentTerms.map((paymentTerm) => (
                    <tr key={paymentTerm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {paymentTerm.term_days || 'T'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{paymentTerm.term_name}</div>
                            <div className="text-sm text-gray-500">{paymentTerm.description || 'No description'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{formatDaysText(paymentTerm.term_days)}</div>
                        <div className="text-xs text-gray-500">
                          {paymentTerm.term_days === 0 ? 'Immediate payment' : `Net ${paymentTerm.term_days}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          paymentTerm.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {paymentTerm.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(paymentTerm)}
                          className="text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(paymentTerm)}
                          className="text-red-600 hover:text-red-700 px-2 py-1"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete Payment Term</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the payment term "{deleteConfirm.term_name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentTermsList
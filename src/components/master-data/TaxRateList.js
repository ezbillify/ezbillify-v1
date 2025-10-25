import { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const TaxRateList = ({ onEdit, onAdd }) => {
  const [taxRates, setTaxRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { success, error: showError } = useToast() // FIXED: Use correct destructuring

  useEffect(() => {
    fetchTaxRates()
  }, [])

  const fetchTaxRates = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Please log in to view tax rates')
        setLoading(false)
        return
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile?.company_id) {
        setError('Company information not found')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('tax_type', { ascending: true })
        .order('tax_rate', { ascending: true })

      if (fetchError) throw fetchError
      setTaxRates(data || [])
    } catch (err) {
      console.error('Error fetching tax rates:', err)
      setError('Failed to load tax rates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (taxRateId) => {
    if (!window.confirm('Are you sure you want to delete this tax rate?')) return

    try {
      const { error: deleteError } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', taxRateId)

      if (deleteError) throw deleteError
      fetchTaxRates()
      success('Tax rate deleted successfully') // FIXED: Use success method
    } catch (err) {
      showError('Failed to delete tax rate: ' + err.message) // FIXED: Use showError method
    }
  }

  const getTaxTypeBadge = (type) => {
    const colors = {
      gst: 'bg-blue-100 text-blue-800',
      vat: 'bg-green-100 text-green-800',
      service_tax: 'bg-purple-100 text-purple-800',
      excise: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchTaxRates}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['gst', 'vat', 'service_tax', 'other'].map(type => {
          const typeRates = taxRates.filter(rate => rate.tax_type === type)
          
          return (
            <div key={type} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-500">{type.toUpperCase()}</div>
              <div className="text-lg font-semibold text-gray-900">{typeRates.length}</div>
            </div>
          )
        })}
      </div>

      {/* Tax Rates List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Tax Rates</h3>
            <button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Tax Rate
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {taxRates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No tax rates found</div>
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create your first tax rate
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Components</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taxRates.map((taxRate) => (
                    <tr key={taxRate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{taxRate.tax_name}</div>
                          {taxRate.is_default && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTaxTypeBadge(taxRate.tax_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{taxRate.tax_rate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {taxRate.tax_type === 'gst' ? (
                          <div className="text-sm">
                            <div>CGST: {taxRate.cgst_rate}%</div>
                            <div>SGST: {taxRate.sgst_rate}%</div>
                            <div>IGST: {taxRate.igst_rate}%</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(taxRate)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(taxRate.id)}
                          className="text-red-600 hover:text-red-700"
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
    </div>
  )
}

export default TaxRateList
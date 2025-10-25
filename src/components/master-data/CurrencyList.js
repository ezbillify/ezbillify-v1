import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const CurrencyList = ({ onEdit, onAdd }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchCurrencies()
  }, [company?.id])

  const fetchCurrencies = async () => {
    try {
      setLoading(true)
      
      // First check if currencies table exists
      const { data, error: fetchError } = await supabase
        .from('currencies')
        .select('*')
        .eq('company_id', company?.id)
        .order('currency_code')

      if (fetchError) {
        console.error('Currencies table might not exist:', fetchError)
        // If table doesn't exist, show empty state
        setCurrencies([])
        return
      }
      
      setCurrencies(data || [])
    } catch (err) {
      console.error('Error fetching currencies:', err)
      setCurrencies([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (currencyId) => {
    try {
      const { error: deleteError } = await supabase
        .from('currencies')
        .delete()
        .eq('id', currencyId)

      if (deleteError) throw deleteError

      success('Currency deleted successfully')
      fetchCurrencies()
    } catch (err) {
      console.error('Error deleting currency:', err)
      error('Failed to delete currency')
    }
    setDeleteConfirm(null)
  }

  const filteredCurrencies = currencies.filter(currency => {
    if (!currency.currency_code) return true
    return currency.currency_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (currency.currency_name && currency.currency_name.toLowerCase().includes(searchTerm.toLowerCase()))
  })

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
      {/* Header Actions - Removed Add Currency button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search currencies..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Currency Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Currencies</div>
          <div className="text-2xl font-semibold text-gray-900">{currencies.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Base Currency</div>
          <div className="text-lg font-semibold text-gray-900">
            {currencies.find(c => c.is_base_currency)?.currency_code || 'None'}
          </div>
        </div>
      </div>

      {/* Currencies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Currencies</h3>
        </div>
        
        <div className="p-6">
          {filteredCurrencies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {currencies.length === 0 ? 'No currencies found' : 'No currencies match your search'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCurrencies.map((currency) => (
                    <tr key={currency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {currency.currency_symbol || currency.currency_code?.[0] || 'C'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-gray-900">{currency.currency_code}</div>
                              {currency.is_base_currency && (
                                <span className="text-yellow-400" title="Base currency">★</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{currency.currency_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currency.is_base_currency ? (
                          <div className="text-sm text-gray-500">Base Currency</div>
                        ) : (
                          <div>
                            <div className="font-medium">₹{parseFloat(currency.exchange_rate || 1).toFixed(6)}</div>
                            <div className="text-xs text-gray-500">per {currency.currency_code}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(currency)}
                          className="text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(currency)}
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
              <h3 className="text-lg font-medium text-gray-900">Delete Currency</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the currency "{deleteConfirm.currency_code}"? This action cannot be undone.
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

export default CurrencyList
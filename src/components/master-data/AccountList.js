import { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast' // Use your existing hook

const AccountList = ({ onEdit, onAdd }) => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { success, error: showError } = useToast() // FIXED: Destructure correctly

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user and company
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('Please log in to view accounts')
        setLoading(false)
        return
      }

      // Get user's company ID
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

      // Fetch accounts for the company
      const { data, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select(`
          *,
          parent_account:parent_account_id(account_code, account_name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('account_code')

      if (fetchError) throw fetchError

      setAccounts(data || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError('Failed to load accounts: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', accountId)

      if (deleteError) throw deleteError

      // Refresh the list
      fetchAccounts()
      success('Account deleted successfully')
    } catch (err) {
      console.error('Error deleting account:', err)
      showError('Failed to delete account: ' + err.message)
    }
  }

  const toggleAccountStatus = async (account) => {
    try {
      const { error: updateError } = await supabase
        .from('chart_of_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id)

      if (updateError) throw updateError

      // Refresh the list
      fetchAccounts()
      success(
        `Account ${!account.is_active ? 'activated' : 'deactivated'} successfully`
      )
    } catch (err) {
      console.error('Error updating account status:', err)
      showError('Failed to update account status: ' + err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getAccountTypeBadge = (type) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-purple-100 text-purple-800',
      income: 'bg-green-100 text-green-800',
      expense: 'bg-orange-100 text-orange-800',
      cogs: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
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
            onClick={fetchAccounts}
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['asset', 'liability', 'equity', 'income'].map(type => {
          const typeAccounts = accounts.filter(acc => acc.account_type === type)
          const totalBalance = typeAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
          
          return (
            <div key={type} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-500 capitalize">{type}s</div>
              <div className="text-lg font-semibold text-gray-900">{typeAccounts.length}</div>
              <div className="text-sm text-gray-600">{formatCurrency(totalBalance)}</div>
            </div>
          )
        })}
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Chart of Accounts</h3>
            <button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Account
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No accounts found</div>
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create your first account
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
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
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{account.account_code}</div>
                          <div className="text-sm text-gray-500">{account.account_name}</div>
                          {account.parent_account && (
                            <div className="text-xs text-gray-400">
                              Parent: {account.parent_account.account_code} - {account.parent_account.account_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getAccountTypeBadge(account.account_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(account.current_balance || 0)}
                        </div>
                        <div className="text-xs text-gray-500">{account.opening_balance_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(account)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleAccountStatus(account)}
                          className={account.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {account.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!account.is_system_account && (
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
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

export default AccountList
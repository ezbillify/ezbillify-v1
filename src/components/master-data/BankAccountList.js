// src/components/master-data/BankAccountList.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAPI } from '../../hooks/useAPI'
import { useToast } from '../../hooks/useToast'

const BankAccountList = ({ onEdit, onAdd }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const { loading: apiLoading, authenticatedFetch } = useAPI()
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const accountTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'current', label: 'Current' },
    { value: 'savings', label: 'Savings' },
    { value: 'overdraft', label: 'Overdraft' },
    { value: 'cc', label: 'Cash Credit' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    if (company?.id) {
      fetchBankAccounts()
    }
  }, [company?.id])

  const fetchBankAccounts = async () => {
    if (!company?.id) {
      console.error('❌ No company ID available')
      error('Company not found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🔍 Fetching bank accounts for company:', company.id)
      
      // ✅ FIXED: Removed query parameters - API uses auth middleware for company_id
      const response = await authenticatedFetch('/api/master-data/bank-accounts')
      
      console.log('📦 Bank Accounts Response:', response)
      
      if (response && response.success && response.data) {
        console.log('✅ Bank accounts loaded:', response.data.length)
        setBankAccounts(response.data)
      } else {
        console.log('⚠️ No bank accounts found')
        setBankAccounts([])
      }
    } catch (err) {
      console.error('❌ Error fetching bank accounts:', err)
      error('Failed to load bank accounts')
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bankAccountId) => {
    try {
      const response = await authenticatedFetch(
        `/api/master-data/bank-accounts/${bankAccountId}`,
        {
          method: 'DELETE'
        }
      )

      if (response && response.success) {
        success('Bank account deleted successfully')
        fetchBankAccounts()
      } else {
        error(response.error || 'Failed to delete bank account')
      }
    } catch (err) {
      console.error('Error deleting bank account:', err)
      error('Failed to delete bank account')
    }
    setDeleteConfirm(null)
  }

  const toggleBankAccountStatus = async (bankAccount) => {
    try {
      const response = await authenticatedFetch(
        `/api/master-data/bank-accounts/${bankAccount.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            ...bankAccount,
            is_active: !bankAccount.is_active
          })
        }
      )

      if (response && response.success) {
        success(
          `Bank account ${!bankAccount.is_active ? 'activated' : 'deactivated'} successfully`
        )
        fetchBankAccounts()
      } else {
        error(response.error || 'Failed to update bank account')
      }
    } catch (err) {
      console.error('Error updating bank account status:', err)
      error('Failed to update bank account status')
    }
  }

  const toggleDefaultStatus = async (bankAccount) => {
    try {
      const response = await authenticatedFetch(
        `/api/master-data/bank-accounts/${bankAccount.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            ...bankAccount,
            is_default: !bankAccount.is_default
          })
        }
      )

      if (response && response.success) {
        success(
          `Bank account ${!bankAccount.is_default ? 'set as default' : 'removed from default'}`
        )
        fetchBankAccounts()
      } else {
        error(response.error || 'Failed to update default status')
      }
    } catch (err) {
      console.error('Error updating default status:', err)
      error('Failed to update default status')
    }
  }

  const filteredBankAccounts = bankAccounts.filter(bankAccount => {
    const matchesSearch = 
      bankAccount.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bankAccount.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bankAccount.account_number?.includes(searchTerm) ||
      bankAccount.ifsc_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === '' || bankAccount.account_type === filterType
    
    return matchesSearch && matchesType
  })

  const getAccountTypeBadge = (type) => {
    const colors = {
      current: 'bg-blue-100 text-blue-800',
      savings: 'bg-green-100 text-green-800',
      overdraft: 'bg-orange-100 text-orange-800',
      cc: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    const labels = {
      current: 'Current',
      savings: 'Savings',
      overdraft: 'Overdraft',
      cc: 'Cash Credit',
      other: 'Other'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return ''
    if (accountNumber.length <= 4) return accountNumber
    return 'XXXX' + accountNumber.slice(-4)
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

  const totalBalance = bankAccounts.reduce((sum, account) => sum + (account.current_balance || 0), 0)
  const activeAccounts = bankAccounts.filter(account => account.is_active).length

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by account name, bank, number, or IFSC..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {accountTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bank Accounts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Accounts</div>
          <div className="text-2xl font-semibold text-gray-900">{bankAccounts.length}</div>
          <div className="text-sm text-gray-600">{activeAccounts} active</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Balance</div>
          <div className={`text-2xl font-semibold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Account Types</div>
          <div className="text-lg font-semibold text-gray-900">
            {new Set(bankAccounts.map(acc => acc.account_type)).size}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Default Account</div>
          <div className="text-sm text-gray-900 truncate">
            {bankAccounts.find(acc => acc.is_default)?.account_name || 'None set'}
          </div>
        </div>
      </div>

      {/* Bank Accounts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
        </div>
        
        <div className="p-6">
          {filteredBankAccounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {bankAccounts.length === 0 
                  ? 'No bank accounts found' 
                  : 'No bank accounts match your search'}
              </div>
              {bankAccounts.length === 0 && (
                <button
                  onClick={onAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add your first bank account
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Balance
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
                  {filteredBankAccounts.map((bankAccount) => (
                    <tr key={bankAccount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="font-medium text-gray-900">{bankAccount.account_name}</div>
                            {bankAccount.is_default && (
                              <span className="text-yellow-400" title="Default account">★</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{bankAccount.bank_name}</div>
                          <div className="text-xs text-gray-400">{bankAccount.branch_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-mono text-sm">{maskAccountNumber(bankAccount.account_number)}</div>
                          <div className="text-xs text-gray-500">IFSC: {bankAccount.ifsc_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getAccountTypeBadge(bankAccount.account_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${bankAccount.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(bankAccount.current_balance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            bankAccount.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {bankAccount.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {bankAccount.is_default && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(bankAccount)}
                          className="text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleDefaultStatus(bankAccount)}
                          className={`px-2 py-1 ${bankAccount.is_default ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-600 hover:text-gray-700'}`}
                          title={bankAccount.is_default ? 'Remove as default' : 'Set as default'}
                        >
                          {bankAccount.is_default ? '★' : '☆'}
                        </button>
                        <button
                          onClick={() => toggleBankAccountStatus(bankAccount)}
                          className={`px-2 py-1 ${bankAccount.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          {bankAccount.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bankAccount)}
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
              <h3 className="text-lg font-medium text-gray-900">Delete Bank Account</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the bank account "{deleteConfirm.account_name}"? This action cannot be undone.
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

export default BankAccountList
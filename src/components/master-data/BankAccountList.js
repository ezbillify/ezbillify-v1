// src/components/master-data/BankAccountList.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAPI } from '../../hooks/useAPI'
import { useToast } from '../../hooks/useToast'
import UPIQRCode from './UPIQRCode'

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

    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/master-data/bank-accounts?company_id=${company.id}`)
      
      if (response && response.success) {
        setBankAccounts(response.data || [])
      } else {
        throw new Error(response?.error || 'Failed to fetch bank accounts')
      }
    } catch (err) {
      console.error('❌ Error fetching bank accounts:', err)
      error('Failed to fetch bank accounts')
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bankAccountId) => {
    try {
      const response = await authenticatedFetch(`/api/master-data/bank-accounts/${bankAccountId}`, {
        method: 'DELETE'
      })

      if (response && response.success) {
        success('Bank account deleted successfully')
        fetchBankAccounts() // Refresh the list
      } else {
        throw new Error(response?.error || 'Failed to delete bank account')
      }
    } catch (err) {
      console.error('❌ Error deleting bank account:', err)
      error('Failed to delete bank account')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const getAccountTypeBadge = (type) => {
    const colors = {
      current: 'bg-blue-100 text-blue-800',
      savings: 'bg-green-100 text-green-800',
      overdraft: 'bg-purple-100 text-purple-800',
      cc: 'bg-yellow-100 text-yellow-800',
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

  // Filter bank accounts based on search term and type filter
  const filteredBankAccounts = bankAccounts.filter(account => {
    const matchesSearch = !searchTerm || 
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_number.includes(searchTerm) ||
      account.ifsc_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.upi_id && account.upi_id.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = !filterType || account.account_type === filterType
    
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by account name, bank, number, IFSC, or UPI ID..."
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
                      Account Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UPI
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBankAccounts.map((bankAccount) => (
                    <tr key={bankAccount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {bankAccount.account_name}
                              {bankAccount.is_default && (
                                <span className="text-yellow-400" title="Default account">★</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{bankAccount.bank_name}</div>
                            <div className="text-xs text-gray-400">{bankAccount.branch_name}</div>
                          </div>
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
                        {bankAccount.upi_id ? (
                          <UPIQRCode 
                            upiId={bankAccount.upi_id}
                            accountName={bankAccount.account_name}
                            size="sm"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">Not set</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => onEdit(bankAccount)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bankAccount)}
                          className="text-red-600 hover:text-red-900"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-2 px-7 py-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Bank Account</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the bank account <strong>{deleteConfirm.account_name}</strong>? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="mt-3 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
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
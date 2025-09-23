import { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast' // Use your existing hook

const AccountForm = ({ account = null, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false)
  const [parentAccounts, setParentAccounts] = useState([])
  const { success, error } = useToast() // FIXED: Destructure success and error directly
  
  const [formData, setFormData] = useState({
    account_code: account?.account_code || '',
    account_name: account?.account_name || '',
    account_type: account?.account_type || 'asset',
    account_subtype: account?.account_subtype || '',
    parent_account_id: account?.parent_account_id || '',
    opening_balance: account?.opening_balance || 0,
    opening_balance_type: account?.opening_balance_type || 'debit',
    description: account?.description || ''
  })

  const [errors, setErrors] = useState({})

  const accountTypes = [
    { value: 'asset', label: 'Assets' },
    { value: 'liability', label: 'Liabilities' },
    { value: 'equity', label: 'Equity' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expenses' },
    { value: 'cogs', label: 'Cost of Goods Sold' }
  ]

  const accountSubtypes = {
    asset: [
      { value: 'current_asset', label: 'Current Assets' },
      { value: 'fixed_asset', label: 'Fixed Assets' },
      { value: 'other_asset', label: 'Other Assets' }
    ],
    liability: [
      { value: 'current_liability', label: 'Current Liabilities' },
      { value: 'long_term_liability', label: 'Long Term Liabilities' },
      { value: 'other_liability', label: 'Other Liabilities' }
    ],
    equity: [
      { value: 'owners_equity', label: 'Owner\'s Equity' },
      { value: 'retained_earnings', label: 'Retained Earnings' }
    ],
    income: [
      { value: 'operating_income', label: 'Operating Income' },
      { value: 'other_income', label: 'Other Income' }
    ],
    expense: [
      { value: 'operating_expense', label: 'Operating Expenses' },
      { value: 'other_expense', label: 'Other Expenses' }
    ],
    cogs: [
      { value: 'direct_costs', label: 'Direct Costs' },
      { value: 'indirect_costs', label: 'Indirect Costs' }
    ]
  }

  useEffect(() => {
    fetchParentAccounts()
  }, [])

  const fetchParentAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userProfile?.company_id) return

      const { data, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('account_code')

      if (fetchError) throw fetchError
      setParentAccounts(data || [])
    } catch (err) {
      console.error('Error fetching parent accounts:', err)
      error('Failed to load parent accounts')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.account_code.trim()) {
      newErrors.account_code = 'Account code is required'
    }

    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required'
    }

    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required'
    }

    if (formData.opening_balance < 0) {
      newErrors.opening_balance = 'Opening balance cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    console.log('Form submitted with data:', formData)
    
    if (!validateForm()) {
      error('Please fix the form errors')
      return
    }

    setLoading(true)
    
    try {
      console.log('Getting user...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication failed: ' + authError.message)
      }
      
      if (!user) {
        console.error('No user found')
        throw new Error('User not authenticated')
      }

      console.log('User found:', user.id)

      console.log('Getting user profile...')
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        throw new Error('Failed to get user profile: ' + profileError.message)
      }

      if (!userProfile?.company_id) {
        console.error('No company found for user:', userProfile)
        throw new Error('Company not found')
      }

      console.log('Company ID:', userProfile.company_id)

      const accountData = {
        account_code: formData.account_code.trim(),
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        account_subtype: formData.account_subtype || null,
        company_id: userProfile.company_id,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        current_balance: parseFloat(formData.opening_balance) || 0,
        opening_balance_type: formData.opening_balance_type,
        parent_account_id: formData.parent_account_id || null,
        description: formData.description || null,
        is_active: true,
        is_system_account: false
      }

      console.log('Account data to save:', accountData)

      let result
      if (account?.id) {
        console.log('Updating existing account:', account.id)
        // Update existing account
        result = await supabase
          .from('chart_of_accounts')
          .update(accountData)
          .eq('id', account.id)
          .select()
      } else {
        console.log('Creating new account...')
        // Create new account
        result = await supabase
          .from('chart_of_accounts')
          .insert([accountData])
          .select()
      }

      console.log('Supabase result:', result)

      if (result.error) {
        console.error('Supabase error:', result.error)
        throw new Error('Database error: ' + result.error.message)
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('No data returned from database')
      }

      console.log('Account saved successfully:', result.data[0])
      
      success(
        account?.id ? 'Account updated successfully' : 'Account created successfully'
      )
      onSave(result.data[0])
    } catch (err) {
      console.error('Error saving account:', err)
      error('Failed to save account: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const availableSubtypes = accountSubtypes[formData.account_type] || []
  const filteredParentAccounts = parentAccounts.filter(acc => 
    acc.account_type === formData.account_type && acc.id !== account?.id
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.account_code}
            onChange={(e) => handleChange('account_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.account_code ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., 1001"
          />
          {errors.account_code && (
            <p className="mt-1 text-sm text-red-600">{errors.account_code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.account_name}
            onChange={(e) => handleChange('account_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.account_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Cash in Hand"
          />
          {errors.account_name && (
            <p className="mt-1 text-sm text-red-600">{errors.account_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.account_type}
            onChange={(e) => {
              handleChange('account_type', e.target.value)
              handleChange('account_subtype', '') // Reset subtype
              handleChange('parent_account_id', '') // Reset parent
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.account_type ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select Account Type</option>
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.account_type && (
            <p className="mt-1 text-sm text-red-600">{errors.account_type}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Subtype
          </label>
          <select
            value={formData.account_subtype}
            onChange={(e) => handleChange('account_subtype', e.target.value)}
            disabled={!formData.account_type}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select Subtype</option>
            {availableSubtypes.map(subtype => (
              <option key={subtype.value} value={subtype.value}>
                {subtype.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parent Account
          </label>
          <select
            value={formData.parent_account_id}
            onChange={(e) => handleChange('parent_account_id', e.target.value)}
            disabled={!formData.account_type}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">No Parent Account</option>
            {filteredParentAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.account_code} - {acc.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opening Balance Type
          </label>
          <select
            value={formData.opening_balance_type}
            onChange={(e) => handleChange('opening_balance_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opening Balance
          </label>
          <input
            type="number"
            value={formData.opening_balance}
            onChange={(e) => handleChange('opening_balance', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.opening_balance ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          {errors.opening_balance && (
            <p className="mt-1 text-sm text-red-600">{errors.opening_balance}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Account description (optional)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (account ? 'Update Account' : 'Create Account')}
        </button>
      </div>
    </form>
  )
}

export default AccountForm

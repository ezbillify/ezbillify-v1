// src/components/master-data/BankAccountForm.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAPI } from '../../hooks/useAPI'
import { useToast } from '../../hooks/useToast'

const BankAccountForm = ({ bankAccount = null, onSave, onCancel }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const { loading: apiLoading, authenticatedFetch } = useAPI()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    account_name: bankAccount?.account_name || '',
    bank_name: bankAccount?.bank_name || '',
    account_number: bankAccount?.account_number || '',
    ifsc_code: bankAccount?.ifsc_code || '',
    branch_name: bankAccount?.branch_name || '',
    account_type: bankAccount?.account_type || 'current',
    opening_balance: bankAccount?.opening_balance || 0,
    is_default: bankAccount?.is_default || false,
    upi_id: bankAccount?.upi_id || '', // Add UPI ID field
    upi_qr_code: bankAccount?.upi_qr_code || '' // Add UPI QR code field
  })

  const [errors, setErrors] = useState({})
  const [bankDetails, setBankDetails] = useState(null)

  const accountTypes = [
    { value: 'current', label: 'Current Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'overdraft', label: 'Overdraft Account' },
    { value: 'cc', label: 'Cash Credit' },
    { value: 'other', label: 'Other' }
  ]

  // Auto-fetch bank details from IFSC code
  const fetchBankDetails = async (ifscCode) => {
    if (ifscCode.length !== 11) return
    
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`)
      if (response.ok) {
        const data = await response.json()
        setBankDetails(data)
        setFormData(prev => ({
          ...prev,
          bank_name: data.BANK || prev.bank_name,
          branch_name: data.BRANCH || prev.branch_name
        }))
      }
    } catch (err) {
      console.error('Error fetching bank details:', err)
    }
  }

  useEffect(() => {
    if (formData.ifsc_code.length === 11) {
      fetchBankDetails(formData.ifsc_code)
    }
  }, [formData.ifsc_code])

  // Validate UPI ID format
  const validateUPIId = (upiId) => {
    if (!upiId) return true // UPI ID is optional
    // UPI ID format: xyz@bank or xyz@ybl or xyz@paytm, etc.
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/
    return upiPattern.test(upiId)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required'
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required'
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Account number is required'
    }

    if (!formData.ifsc_code.trim()) {
      newErrors.ifsc_code = 'IFSC code is required'
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code)) {
      newErrors.ifsc_code = 'Invalid IFSC code format'
    }

    if (!formData.branch_name.trim()) {
      newErrors.branch_name = 'Branch name is required'
    }

    if (formData.opening_balance < 0) {
      newErrors.opening_balance = 'Opening balance cannot be negative'
    }

    // Validate UPI ID if provided
    if (formData.upi_id && !validateUPIId(formData.upi_id)) {
      newErrors.upi_id = 'Invalid UPI ID format (e.g., xyz@bank)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      error('Please fix the form errors')
      return
    }

    if (!company?.id) {
      error('Company not found')
      return
    }

    setLoading(true)
    
    try {
      const bankData = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        current_balance: parseFloat(formData.opening_balance) || 0,
        is_active: true
      }

      let response
      if (bankAccount?.id) {
        // Update existing bank account
        console.log('🔄 Updating bank account:', bankAccount.id)
        response = await authenticatedFetch(
          `/api/master-data/bank-accounts/${bankAccount.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(bankData)
          }
        )
      } else {
        // Create new bank account
        console.log('➕ Creating new bank account')
        response = await authenticatedFetch(
          '/api/master-data/bank-accounts',
          {
            method: 'POST',
            body: JSON.stringify(bankData)
          }
        )
      }

      if (response && response.success) {
        success(
          bankAccount?.id 
            ? 'Bank account updated successfully' 
            : 'Bank account created successfully'
        )
        onSave?.(response.data)
      } else {
        throw new Error(response?.error || 'Failed to save bank account')
      }
    } catch (err) {
      console.error('❌ Error saving bank account:', err)
      error(err.message || 'Failed to save bank account')
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Account Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => handleChange('account_name', e.target.value)}
              placeholder="e.g., Primary Current Account"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.account_name ? 'border-red-300' : 'border-gray-300'
              }`}
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
              onChange={(e) => handleChange('account_type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.account_type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
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
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => handleChange('bank_name', e.target.value)}
              placeholder="e.g., State Bank of India"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.bank_name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.bank_name && (
              <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => handleChange('account_number', e.target.value)}
              placeholder="e.g., 1234567890123456"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.account_number ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.ifsc_code}
              onChange={(e) => handleChange('ifsc_code', e.target.value.toUpperCase())}
              placeholder="e.g., SBIN0001234"
              maxLength={11}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.ifsc_code ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.ifsc_code && (
              <p className="mt-1 text-sm text-red-600">{errors.ifsc_code}</p>
            )}
            {bankDetails && (
              <div className="text-xs text-green-600 mt-1">
                ✓ Valid IFSC: {bankDetails.BANK}, {bankDetails.BRANCH}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => handleChange('branch_name', e.target.value)}
              placeholder="e.g., Main Branch"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.branch_name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.branch_name && (
              <p className="mt-1 text-sm text-red-600">{errors.branch_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Balance
            </label>
            <input
              type="number"
              value={formData.opening_balance}
              onChange={(e) => handleChange('opening_balance', e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.opening_balance ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.opening_balance && (
              <p className="mt-1 text-sm text-red-600">{errors.opening_balance}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UPI ID
            </label>
            <input
              type="text"
              value={formData.upi_id}
              onChange={(e) => handleChange('upi_id', e.target.value)}
              placeholder="e.g., yourname@upi"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.upi_id ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.upi_id && (
              <p className="mt-1 text-sm text-red-600">{errors.upi_id}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Optional. Format: name@bank (e.g., john@sbi)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Account
            </label>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleChange('is_default', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Set as default bank account</span>
            </div>
          </div>
        </div>

        {/* Bank Account Preview */}
        {formData.account_number && formData.ifsc_code && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Account Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Account:</strong> {formData.account_name}</div>
              <div><strong>Bank:</strong> {formData.bank_name}</div>
              <div><strong>Account No:</strong> {formData.account_number}</div>
              <div><strong>IFSC:</strong> {formData.ifsc_code}</div>
              <div><strong>Branch:</strong> {formData.branch_name}</div>
              <div><strong>Type:</strong> {accountTypes.find(t => t.value === formData.account_type)?.label}</div>
              {formData.upi_id && <div><strong>UPI ID:</strong> {formData.upi_id}</div>}
            </div>
          </div>
        )}

        {/* IFSC Helper */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">IFSC Code Help</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• IFSC code is 11 characters long</div>
            <div>• Format: First 4 letters (Bank code) + 0 + Last 6 characters (Branch code)</div>
            <div>• Example: SBIN0001234 (State Bank of India)</div>
            <div>• We'll auto-fetch bank and branch details when you enter a valid IFSC</div>
          </div>
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
          {loading ? 'Saving...' : (bankAccount?.id ? 'Update Bank Account' : 'Add Bank Account')}
        </button>
      </div>
    </form>
  )
}

export default BankAccountForm
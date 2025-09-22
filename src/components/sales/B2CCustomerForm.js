// src/components/sales/B2CCustomerForm.js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import Select from '../shared/ui/Select'

const B2CCustomerForm = ({ customerId = null, initialData = null, onSave = null }) => {
  const router = useRouter()
  const { company } = useAuth()
  
  // FIXED: Properly destructure success and error from useToast
  const { success, error } = useToast()
  
  // Use the methods directly
  const showSuccess = success
  const showError = error
  
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    customer_type: 'b2c',
    // Personal Information
    name: '', // Full name for B2C
    display_name: '',
    // Contact Details
    email: '',
    phone: '',
    mobile: '',
    // Addresses
    billing_address: {
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    shipping_address: {
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    same_as_billing: true,
    // Business Terms (Simplified for B2C)
    credit_limit: 0,
    payment_terms: 0, // Immediate payment for B2C
    tax_preference: 'taxable',
    // Additional
    opening_balance: 0,
    opening_balance_type: 'debit',
    notes: '',
    status: 'active'
  })

  useEffect(() => {
    if (customerId && !initialData) {
      loadCustomer()
    } else if (initialData) {
      setFormData(prev => ({ 
        ...prev, 
        ...initialData,
        customer_type: 'b2c' // Ensure B2C type
      }))
    }
  }, [customerId, initialData])

  const loadCustomer = async () => {
    setLoading(true)
    try {
      const result = await customerService.getCustomer(customerId, company.id)
      
      if (result.success && result.data.customer_type === 'b2c') {
        setFormData(prev => ({
          ...prev,
          ...result.data,
          billing_address: result.data.billing_address || prev.billing_address,
          shipping_address: result.data.shipping_address || prev.shipping_address,
          same_as_billing: JSON.stringify(result.data.billing_address) === JSON.stringify(result.data.shipping_address)
        }))
      } else {
        showError('Customer not found or not a B2C customer')
      }
    } catch (err) {
      console.error('Error loading customer:', err)
      showError('Failed to load customer data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`${type}_address`]: {
        ...prev[`${type}_address`],
        [field]: value
      }
    }))

    if (type === 'billing' && formData.same_as_billing) {
      setFormData(prev => ({
        ...prev,
        shipping_address: {
          ...prev.billing_address,
          [field]: value
        }
      }))
    }
  }

  const handleSameAsBilling = (checked) => {
    setFormData(prev => ({
      ...prev,
      same_as_billing: checked,
      shipping_address: checked ? { ...prev.billing_address } : prev.shipping_address
    }))
  }

  const validateForm = () => {
    const errors = []

    if (!formData.name.trim()) errors.push('Customer name is required')
    if (!formData.phone.trim() && !formData.mobile.trim()) errors.push('At least one contact number is required')
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format')
    if (!formData.billing_address.city.trim()) errors.push('City is required for billing address')
    if (!formData.billing_address.state.trim()) errors.push('State is required for billing address')
    if (!formData.billing_address.pincode.trim()) errors.push('Pincode is required for billing address')
    else if (!/^\d{6}$/.test(formData.billing_address.pincode)) errors.push('Pincode must be 6 digits')

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      showError(errors.join(', '))
      return
    }

    setLoading(true)

    try {
      const customerData = {
        ...formData,
        display_name: formData.display_name || formData.name,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        payment_terms: parseInt(formData.payment_terms) || 0,
        opening_balance: parseFloat(formData.opening_balance) || 0
      }

      let result
      if (customerId) {
        result = await customerService.updateCustomer(customerId, customerData, company.id)
      } else {
        result = await customerService.createCustomer(customerData, company.id)
      }

      if (result.success) {
        showSuccess(`B2C customer ${customerId ? 'updated' : 'created'} successfully`)
        
        if (onSave) {
          onSave(result.data)
        } else {
          router.push('/sales/customers')
        }
      } else {
        showError(result.error)
      }
    } catch (err) {
      console.error('Error saving B2C customer:', err)
      showError('Failed to save B2C customer')
    } finally {
      setLoading(false)
    }
  }

  // Options for custom Select components
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  const paymentTermsOptions = [
    { value: 0, label: 'Immediate Payment' },
    { value: 15, label: 'Net 15 days' },
    { value: 30, label: 'Net 30 days' }
  ]

  const taxPreferenceOptions = [
    { value: 'taxable', label: 'Taxable' },
    { value: 'exempt', label: 'Tax Exempt' }
  ]

  const openingBalanceTypeOptions = [
    { value: 'debit', label: 'Debit (Customer owes you)' },
    { value: 'credit', label: 'Credit (You owe customer)' }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-green-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {customerId ? 'Edit B2C Customer' : 'Add New B2C Customer'}
              </h1>
              <p className="text-slate-600 mt-1">
                Individual consumer without GST registration
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter customer's full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Display name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <Select
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={statusOptions}
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="+91 99999 88888"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            {!formData.phone && !formData.mobile && (
              <p className="mt-2 text-sm text-amber-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                At least one contact number is required
              </p>
            )}
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Address Information</h3>
            
            {/* Billing Address */}
            <div className="mb-6">
              <h4 className="font-medium text-slate-800 mb-3">Billing Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.billing_address.address_line_1}
                    onChange={(e) => handleAddressChange('billing', 'address_line_1', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Address Line 1"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.billing_address.address_line_2}
                    onChange={(e) => handleAddressChange('billing', 'address_line_2', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Address Line 2 (optional)"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.city}
                    onChange={(e) => handleAddressChange('billing', 'city', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="City *"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.state}
                    onChange={(e) => handleAddressChange('billing', 'state', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="State *"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.pincode}
                    onChange={(e) => handleAddressChange('billing', 'pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Pincode *"
                    maxLength={6}
                    pattern="\d{6}"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.country}
                    onChange={(e) => handleAddressChange('billing', 'country', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Same as Billing Checkbox */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.same_as_billing}
                  onChange={(e) => handleSameAsBilling(e.target.checked)}
                  className="h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-slate-700">Shipping address same as billing address</span>
              </label>
            </div>

            {/* Shipping Address */}
            {!formData.same_as_billing && (
              <div>
                <h4 className="font-medium text-slate-800 mb-3">Shipping Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.shipping_address.address_line_1}
                      onChange={(e) => handleAddressChange('shipping', 'address_line_1', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Address Line 1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.shipping_address.address_line_2}
                      onChange={(e) => handleAddressChange('shipping', 'address_line_2', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Address Line 2 (optional)"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.shipping_address.city}
                      onChange={(e) => handleAddressChange('shipping', 'city', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.shipping_address.state}
                      onChange={(e) => handleAddressChange('shipping', 'state', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.shipping_address.pincode}
                      onChange={(e) => handleAddressChange('shipping', 'pincode', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Pincode"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.shipping_address.country}
                      onChange={(e) => handleAddressChange('shipping', 'country', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Business Terms (Simplified for B2C) */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Credit Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => handleInputChange('credit_limit', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-sm text-slate-500">Maximum outstanding amount allowed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Payment Terms</label>
                <Select
                  value={formData.payment_terms}
                  onChange={(value) => handleInputChange('payment_terms', parseInt(value))}
                  options={paymentTermsOptions}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Tax Preference</label>
                <Select
                  value={formData.tax_preference}
                  onChange={(value) => handleInputChange('tax_preference', value)}
                  options={taxPreferenceOptions}
                />
              </div>
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Opening Balance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => handleInputChange('opening_balance', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Type</label>
                <Select
                  value={formData.opening_balance_type}
                  onChange={(value) => handleInputChange('opening_balance_type', value)}
                  options={openingBalanceTypeOptions}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Additional notes about this customer..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSave ? onSave(null) : router.push('/sales/customers')}
              disabled={loading}
            >
              Cancel
            </Button>

            <div className="flex space-x-3">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                icon={loading ? null : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              >
                {loading ? 'Saving...' : (customerId ? 'Update B2C Customer' : 'Create B2C Customer')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default B2CCustomerForm
// src/components/sales/B2CCustomerForm.js - UPDATED WITH DISCOUNT_PERCENTAGE
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import Select from '../shared/ui/Select'
import Input from '../shared/ui/Input'
import { INDIAN_STATES_LIST, getGSTType } from '../../lib/constants'

const B2CCustomerForm = ({ customerId = null, initialData = null, onSave = null, onCancel = null }) => {
  const router = useRouter()
  const { company } = useAuth()
  const { success, error } = useToast()
  
  const showSuccess = success
  const showError = error
  
  const [loading, setLoading] = useState(false)
  const [fetchingPincode, setFetchingPincode] = useState({
    billing: false,
    shipping: false
  })
  
  const [formData, setFormData] = useState({
    customer_type: 'b2c',
    name: '',
    display_name: '',
    email: '',
    phone: '',
    mobile: '',
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
    credit_limit: 0,
    payment_terms: 0,
    tax_preference: 'taxable',
    opening_balance: 0,
    opening_balance_type: 'debit',
    discount_percentage: 0, // ✅ NEW FIELD
    notes: '',
    gst_type: null
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ 
        ...prev, 
        ...initialData,
        customer_type: 'b2c',
        billing_address: initialData.billing_address || prev.billing_address,
        shipping_address: initialData.shipping_address || prev.shipping_address,
        same_as_billing: JSON.stringify(initialData.billing_address) === JSON.stringify(initialData.shipping_address),
        discount_percentage: parseFloat(initialData.discount_percentage) || 0 // ✅ NEW
      }))
    } else if (customerId && company?.id) {
      loadCustomer()
    }
  }, [customerId, initialData, company?.id])

  useEffect(() => {
    if (formData.billing_address.state && company?.address?.state) {
      const gstType = getGSTType(company.address.state, formData.billing_address.state)
      setFormData(prev => ({ ...prev, gst_type: gstType }))
    }
  }, [formData.billing_address.state, company?.address?.state])

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
          same_as_billing: JSON.stringify(result.data.billing_address) === JSON.stringify(result.data.shipping_address),
          discount_percentage: parseFloat(result.data.discount_percentage) || 0 // ✅ NEW
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

  const fetchLocationByPincode = async (pincode, addressType) => {
    if (pincode.length !== 6) return
    
    setFetchingPincode(prev => ({ ...prev, [addressType]: true }))

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()

      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        handleAddressChange(addressType, 'city', postOffice.District, false)
        handleAddressChange(addressType, 'state', postOffice.State, false)
      }
    } catch (err) {
      console.error('Error fetching location:', err)
    } finally {
      setFetchingPincode(prev => ({ ...prev, [addressType]: false }))
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (type, field, value, shouldAutoCopy = true) => {
    setFormData(prev => ({
      ...prev,
      [`${type}_address`]: {
        ...prev[`${type}_address`],
        [field]: value
      }
    }))

    if (field === 'pincode' && value.length === 6) {
      fetchLocationByPincode(value, type)
    }

    if (shouldAutoCopy && type === 'billing' && formData.same_as_billing) {
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

    // ✅ NEW: Validate discount percentage
    const discount = parseFloat(formData.discount_percentage)
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push('Discount must be between 0 and 100')
    }

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
        opening_balance: parseFloat(formData.opening_balance) || 0,
        discount_percentage: parseFloat(formData.discount_percentage) || 0 // ✅ NEW
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

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push('/sales/customers')
    }
  }

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
              <p className="text-slate-600 mt-1">Individual consumer without GST registration</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter customer's full name"
                required
              />

              <Input
                label="Display Name"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="Display name (optional)"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="customer@example.com"
              />

              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 99999 88888"
              />

              <Input
                label="Mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                placeholder="+91 98765 43210"
              />
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
                  <Input
                    value={formData.billing_address.address_line_1}
                    onChange={(e) => handleAddressChange('billing', 'address_line_1', e.target.value)}
                    placeholder="Address Line 1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    value={formData.billing_address.address_line_2}
                    onChange={(e) => handleAddressChange('billing', 'address_line_2', e.target.value)}
                    placeholder="Address Line 2 (optional)"
                  />
                </div>
                <Input
                  value={formData.billing_address.pincode}
                  onChange={(e) => handleAddressChange('billing', 'pincode', e.target.value)}
                  placeholder="Pincode"
                  maxLength={6}
                  required
                  helperText={fetchingPincode.billing ? 'Fetching location...' : 'Enter 6-digit pincode'}
                />
                <Input
                  value={formData.billing_address.city}
                  onChange={(e) => handleAddressChange('billing', 'city', e.target.value)}
                  placeholder="City"
                  required
                />
                <Select
                  value={formData.billing_address.state}
                  onChange={(value) => handleAddressChange('billing', 'state', value)}
                  options={INDIAN_STATES_LIST}
                  searchable
                  placeholder="Select state"
                  required
                />
                <Input
                  value={formData.billing_address.country}
                  onChange={(e) => handleAddressChange('billing', 'country', e.target.value)}
                  placeholder="Country"
                />
              </div>

              {/* GST Type Indicator */}
              {formData.billing_address.state && company?.address?.state && (
                <div className={`mt-4 p-3 rounded-lg border ${
                  formData.gst_type === 'intrastate'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {formData.gst_type === 'intrastate' ? (
                      <>
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-green-900">Same State - Intrastate Supply</p>
                          <p className="text-xs text-green-700 mt-0.5">CGST + SGST will apply on invoices</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-900">Different State - Interstate Supply</p>
                          <p className="text-xs text-blue-700 mt-0.5">IGST will apply on invoices</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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
                    <Input
                      value={formData.shipping_address.address_line_1}
                      onChange={(e) => handleAddressChange('shipping', 'address_line_1', e.target.value)}
                      placeholder="Address Line 1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      value={formData.shipping_address.address_line_2}
                      onChange={(e) => handleAddressChange('shipping', 'address_line_2', e.target.value)}
                      placeholder="Address Line 2 (optional)"
                    />
                  </div>
                  <Input
                    value={formData.shipping_address.pincode}
                    onChange={(e) => handleAddressChange('shipping', 'pincode', e.target.value)}
                    placeholder="Pincode"
                    maxLength={6}
                    helperText={fetchingPincode.shipping ? 'Fetching location...' : ''}
                  />
                  <Input
                    value={formData.shipping_address.city}
                    onChange={(e) => handleAddressChange('shipping', 'city', e.target.value)}
                    placeholder="City"
                  />
                  <Select
                    value={formData.shipping_address.state}
                    onChange={(value) => handleAddressChange('shipping', 'state', value)}
                    options={INDIAN_STATES_LIST}
                    searchable
                    placeholder="Select state"
                  />
                  <Input
                    value={formData.shipping_address.country}
                    onChange={(e) => handleAddressChange('shipping', 'country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Business Terms */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Terms & Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Credit Limit (₹)"
                type="number"
                value={formData.credit_limit}
                onChange={(e) => handleInputChange('credit_limit', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                helperText="Maximum outstanding allowed (0 = unlimited)"
              />

              <Select
                label="Payment Terms"
                value={formData.payment_terms}
                onChange={(value) => handleInputChange('payment_terms', parseInt(value))}
                options={paymentTermsOptions}
              />

              {/* ✅ NEW: Discount Percentage Field */}
              <Input
                label="Customer Discount (%)"
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => handleInputChange('discount_percentage', e.target.value)}
                placeholder="0.00"
                min="0"
                max="100"
                step="0.01"
                helperText="Fixed discount applied to all invoices (0-100%)"
              />

              <Select
                label="Tax Preference"
                value={formData.tax_preference}
                onChange={(value) => handleInputChange('tax_preference', value)}
                options={taxPreferenceOptions}
              />
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Opening Balance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Amount (₹)"
                type="number"
                value={formData.opening_balance}
                onChange={(e) => handleInputChange('opening_balance', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />

              <Select
                label="Type"
                value={formData.opening_balance_type}
                onChange={(value) => handleInputChange('opening_balance_type', value)}
                options={openingBalanceTypeOptions}
              />
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
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Saving...' : (customerId ? 'Update B2C Customer' : 'Create B2C Customer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default B2CCustomerForm
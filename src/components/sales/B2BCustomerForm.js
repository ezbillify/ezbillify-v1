// src/components/sales/B2BCustomerForm.js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'

const B2BCustomerForm = ({ customerId = null, initialData = null, onSave = null }) => {
  const router = useRouter()
  const { company } = useAuth()
  
  // FIXED: Properly destructure success and error from useToast
  const { success, error } = useToast()
  
  // Use the methods directly
  const showSuccess = success
  const showError = error
  
  const [loading, setLoading] = useState(false)
  const [validatingGSTIN, setValidatingGSTIN] = useState(false)
  const [gstinError, setGstinError] = useState('')
  
  const [formData, setFormData] = useState({
    customer_type: 'b2b',
    // Company Information
    company_name: '',
    name: '', // Contact person name
    display_name: '',
    designation: '',
    // Contact Details
    email: '',
    phone: '',
    mobile: '',
    website: '',
    // Business Details
    gstin: '',
    pan: '',
    business_type: 'private_limited',
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
    // Business Terms
    credit_limit: 0,
    payment_terms: 30,
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
        customer_type: 'b2b' // Ensure B2B type
      }))
    }
  }, [customerId, initialData])

  const loadCustomer = async () => {
    try {
      setLoading(true)
      const result = await customerService.getCustomer(customerId, company.id)
      
      if (result.success && result.data.customer_type === 'b2b') {
        setFormData(prev => ({
          ...prev,
          ...result.data,
          billing_address: result.data.billing_address || prev.billing_address,
          shipping_address: result.data.shipping_address || prev.shipping_address,
          same_as_billing: JSON.stringify(result.data.billing_address) === JSON.stringify(result.data.shipping_address)
        }))
      } else {
        showError('Customer not found or not a B2B customer')
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
    
    if (field === 'gstin') {
      setGstinError('')
    }
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

  const validateGSTIN = async (gstin) => {
    if (!gstin || gstin.length !== 15) return
    
    try {
      setValidatingGSTIN(true)
      setGstinError('')
      
      const result = await customerService.validateGSTIN(gstin, customerId, company.id)
      
      if (result.success && result.data.isValid) {
        setFormData(prev => ({ ...prev, pan: result.data.pan }))
      } else if (!result.success || !result.data.isValid) {
        setGstinError(result.data?.message || 'Invalid GSTIN')
      }
    } catch (err) {
      console.error('GSTIN validation error:', err)
      setGstinError('Failed to validate GSTIN')
    } finally {
      setValidatingGSTIN(false)
    }
  }

  const handleGSTINBlur = () => {
    if (formData.gstin) {
      validateGSTIN(formData.gstin)
    }
  }

  const validateForm = () => {
    const errors = []

    if (!formData.company_name.trim()) errors.push('Company name is required')
    if (!formData.name.trim()) errors.push('Contact person name is required')
    if (formData.gstin && gstinError) errors.push('Invalid GSTIN')
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format')
    if (!formData.phone.trim() && !formData.mobile.trim()) errors.push('At least one contact number is required')

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      showError(errors.join(', '))
      return
    }

    try {
      setLoading(true)

      const customerData = {
        ...formData,
        display_name: formData.display_name || formData.company_name,
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
        showSuccess(`B2B customer ${customerId ? 'updated' : 'created'} successfully`)
        
        if (onSave) {
          onSave(result.data)
        } else {
          router.push('/sales/customers')
        }
      } else {
        showError(result.error || 'Failed to save customer')
      }
    } catch (err) {
      console.error('Error saving B2B customer:', err)
      showError('Failed to save B2B customer')
    } finally {
      setLoading(false)
    }
  }

  const businessTypes = [
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    { value: 'partnership', label: 'Partnership Firm' },
    { value: 'proprietorship', label: 'Sole Proprietorship' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'other', label: 'Other' }
  ]

  const paymentTermsOptions = [
    { value: 0, label: 'Immediate Payment' },
    { value: 15, label: 'Net 15 days' },
    { value: 30, label: 'Net 30 days' },
    { value: 45, label: 'Net 45 days' },
    { value: 60, label: 'Net 60 days' },
    { value: 90, label: 'Net 90 days' }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
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
        <div className="px-6 py-4 border-b border-slate-200 bg-blue-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {customerId ? 'Edit B2B Customer' : 'Add New B2B Customer'}
              </h1>
              <p className="text-slate-600 mt-1">
                Business customer with GST registration and credit terms
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Primary contact person"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Display name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Job title/designation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Business Type</label>
                <select
                  value={formData.business_type}
                  onChange={(e) => handleInputChange('business_type', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {businessTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="company@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+91 99999 88888"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://company.com"
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

          {/* GST & Business Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">GST & Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">GSTIN</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                    onBlur={handleGSTINBlur}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      gstinError ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  {validatingGSTIN && (
                    <div className="absolute right-3 top-3.5">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {gstinError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {gstinError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">PAN</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Tax Preference</label>
                <select
                  value={formData.tax_preference}
                  onChange={(e) => handleInputChange('tax_preference', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {taxPreferenceOptions.map(pref => (
                    <option key={pref.value} value={pref.value}>{pref.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Business Terms */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Terms & Credit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Credit Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => handleInputChange('credit_limit', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-sm text-slate-500">Maximum outstanding amount allowed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {paymentTermsOptions.map(term => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
              </div>
            </div>
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Address Line 1"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.billing_address.address_line_2}
                    onChange={(e) => handleAddressChange('billing', 'address_line_2', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Address Line 2 (optional)"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.city}
                    onChange={(e) => handleAddressChange('billing', 'city', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.state}
                    onChange={(e) => handleAddressChange('billing', 'state', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.pincode}
                    onChange={(e) => handleAddressChange('billing', 'pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pincode"
                    maxLength={6}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.billing_address.country}
                    onChange={(e) => handleAddressChange('billing', 'country', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Pincode"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.shipping_address.country}
                      onChange={(e) => handleAddressChange('shipping', 'country', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            )}
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
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Type</label>
                <select
                  value={formData.opening_balance_type}
                  onChange={(e) => handleInputChange('opening_balance_type', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {openingBalanceTypeOptions.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes about this B2B customer..."
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
                {loading ? 'Saving...' : (customerId ? 'Update B2B Customer' : 'Create B2B Customer')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default B2BCustomerForm
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const CompanyProfile = () => {
  const { company, user, updateCompany } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    gstin: '',
    pan: '',
    tan: '',
    cin: '',
    business_type: 'proprietorship',
    billing_currency: 'INR',
    timezone: 'Asia/Kolkata',
    financial_year_start: '2024-04-01',
    
    // Address fields
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    billing_address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      same_as_address: true
    },
    shipping_address: {
      street: '',
      city: '',
      state: '',
      country: 'India', 
      pincode: '',
      same_as_address: true
    }
  })

  const [errors, setErrors] = useState({})

  const businessTypes = [
    { value: 'proprietorship', label: 'Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'other', label: 'Other' }
  ]

  const currencies = [
    { value: 'INR', label: '₹ Indian Rupee (INR)' },
    { value: 'USD', label: '$ US Dollar (USD)' },
    { value: 'EUR', label: '€ Euro (EUR)' },
    { value: 'GBP', label: '£ British Pound (GBP)' }
  ]

  const timezones = [
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' }
  ]

  useEffect(() => {
    if (company) {
      loadCompanyData()
    }
  }, [company])

  const loadCompanyData = () => {
    setFormData({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      gstin: company.gstin || '',
      pan: company.pan || '',
      tan: company.tan || '',
      cin: company.cin || '',
      business_type: company.business_type || 'proprietorship',
      billing_currency: company.billing_currency || 'INR',
      timezone: company.timezone || 'Asia/Kolkata',
      financial_year_start: company.financial_year_start || '2024-04-01',
      
      address: {
        street: company.address?.street || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        country: company.address?.country || 'India',
        pincode: company.address?.pincode || ''
      },
      billing_address: {
        street: company.billing_address?.street || '',
        city: company.billing_address?.city || '',
        state: company.billing_address?.state || '',
        country: company.billing_address?.country || 'India',
        pincode: company.billing_address?.pincode || '',
        same_as_address: company.billing_address?.same_as_address ?? true
      },
      shipping_address: {
        street: company.shipping_address?.street || '',
        city: company.shipping_address?.city || '',
        state: company.shipping_address?.state || '',
        country: company.shipping_address?.country || 'India',
        pincode: company.shipping_address?.pincode || '',
        same_as_address: company.shipping_address?.same_as_address ?? true
      }
    })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format'
    }

    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
      newErrors.pan = 'Invalid PAN format'
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

    setSaving(true)
    
    try {
      // Prepare address data
      const addressData = { ...formData.address }
      let billingAddressData = { ...formData.billing_address }
      let shippingAddressData = { ...formData.shipping_address }

      // Copy main address if same_as_address is true
      if (billingAddressData.same_as_address) {
        billingAddressData = { ...addressData, same_as_address: true }
      }
      
      if (shippingAddressData.same_as_address) {
        shippingAddressData = { ...addressData, same_as_address: true }
      }

      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        website: formData.website.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        pan: formData.pan.trim().toUpperCase(),
        tan: formData.tan.trim().toUpperCase(),
        cin: formData.cin.trim().toUpperCase(),
        business_type: formData.business_type,
        billing_currency: formData.billing_currency,
        timezone: formData.timezone,
        financial_year_start: formData.financial_year_start,
        address: addressData,
        billing_address: billingAddressData,
        shipping_address: shippingAddressData,
        updated_at: new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id)
        .select()

      if (updateError) throw updateError

      // Update the auth context
      await updateCompany(data[0])

      success('Company profile updated successfully')
    } catch (err) {
      console.error('Error updating company profile:', err)
      error('Failed to update company profile')
    } finally {
      setSaving(false)
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

  const handleAddressChange = (addressType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Company Profile</h2>
        <p className="text-gray-600">Manage your company information and business details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="company@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                value={formData.business_type}
                onChange={(e) => handleChange('business_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {businessTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.gstin ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              {errors.gstin && (
                <p className="mt-1 text-sm text-red-600">{errors.gstin}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pan ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="AAAAA0000A"
                maxLength={10}
              />
              {errors.pan && (
                <p className="mt-1 text-sm text-red-600">{errors.pan}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TAN</label>
              <input
                type="text"
                value={formData.tan}
                onChange={(e) => handleChange('tan', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AAAA00000A"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
              <input
                type="text"
                value={formData.cin}
                onChange={(e) => handleChange('cin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="U12345MH2023PTC123456"
                maxLength={21}
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
              <select
                value={formData.billing_currency}
                onChange={(e) => handleChange('billing_currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map(timezone => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start</label>
              <input
                type="date"
                value={formData.financial_year_start}
                onChange={(e) => handleChange('financial_year_start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
          
          <div className="space-y-6">
            {/* Main Address */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Registered Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <textarea
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('address', 'street', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('address', 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('address', 'state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleAddressChange('address', 'country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => handleAddressChange('address', 'pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.billing_address.same_as_address}
                  onChange={(e) => handleAddressChange('billing_address', 'same_as_address', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="font-medium text-gray-900">Billing address same as registered address</label>
              </div>
              
              {!formData.billing_address.same_as_address && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <textarea
                      value={formData.billing_address.street}
                      onChange={(e) => handleAddressChange('billing_address', 'street', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.billing_address.city}
                      onChange={(e) => handleAddressChange('billing_address', 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.billing_address.state}
                      onChange={(e) => handleAddressChange('billing_address', 'state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.billing_address.country}
                      onChange={(e) => handleAddressChange('billing_address', 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.billing_address.pincode}
                      onChange={(e) => handleAddressChange('billing_address', 'pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.shipping_address.same_as_address}
                  onChange={(e) => handleAddressChange('shipping_address', 'same_as_address', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="font-medium text-gray-900">Shipping address same as registered address</label>
              </div>
              
              {!formData.shipping_address.same_as_address && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <textarea
                      value={formData.shipping_address.street}
                      onChange={(e) => handleAddressChange('shipping_address', 'street', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.shipping_address.city}
                      onChange={(e) => handleAddressChange('shipping_address', 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.shipping_address.state}
                      onChange={(e) => handleAddressChange('shipping_address', 'state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.shipping_address.country}
                      onChange={(e) => handleAddressChange('shipping_address', 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.shipping_address.pincode}
                      onChange={(e) => handleAddressChange('shipping_address', 'pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={loadCompanyData}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Tax Information Help</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• GSTIN: 15-digit Goods and Services Tax Identification Number</div>
            <div>• PAN: 10-character Permanent Account Number</div>
            <div>• TAN: 10-character Tax Deduction Account Number</div>
            <div>• CIN: 21-character Corporate Identity Number</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Profile Completion</h4>
          <div className="text-sm text-green-700">
            <div>Keep your company profile updated to ensure:</div>
            <div>• Accurate invoice generation</div>
            <div>• GST compliance</div>
            <div>• Professional document appearance</div>
            <div>• Proper tax calculations</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyProfile
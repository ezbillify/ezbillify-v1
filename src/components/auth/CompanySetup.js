// src/components/auth/CompanySetup.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { storageHelpers } from '../../services/utils/supabase'

const CompanySetup = () => {
  const { createCompany, user, loading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [letterheadFile, setLetterheadFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [letterheadPreview, setLetterheadPreview] = useState(null)

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: user?.email || '',
    phone: '',
    
    // Business Details
    gstin: '',
    pan: '',
    tan: '',
    cin: '',
    business_type: 'proprietorship',
    
    // Primary Address
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    
    // Billing Address
    billing_address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    
    // Shipping Address
    shipping_address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    
    // Configuration
    billing_currency: 'INR',
    timezone: 'Asia/Kolkata',
    financial_year_start: '2024-04-01',
    
    // Flags for address copying
    sameBillingAddress: false,
    sameShippingAddress: false
  })

  // Business type options
  const businessTypes = [
    { value: 'proprietorship', label: 'Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    { value: 'one_person_company', label: 'One Person Company (OPC)' },
    { value: 'section_8_company', label: 'Section 8 Company' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'other', label: 'Other' }
  ]

  // Currency options
  const currencies = [
    { value: 'INR', label: 'Indian Rupee (₹)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' }
  ]

  // Timezone options
  const timezones = [
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' }
  ]

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))

      // Handle address copying
      if (name === 'sameBillingAddress' && checked) {
        setFormData(prev => ({
          ...prev,
          billing_address: { ...prev.address }
        }))
      }
      
      if (name === 'sameShippingAddress' && checked) {
        setFormData(prev => ({
          ...prev,
          shipping_address: { ...prev.address }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Handle nested address changes
  const handleAddressChange = (addressType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }))

    // Auto-copy to billing/shipping if checkboxes are checked
    if (addressType === 'address') {
      if (formData.sameBillingAddress) {
        setFormData(prev => ({
          ...prev,
          billing_address: {
            ...prev.billing_address,
            [field]: value
          }
        }))
      }
      
      if (formData.sameShippingAddress) {
        setFormData(prev => ({
          ...prev,
          shipping_address: {
            ...prev.shipping_address,
            [field]: value
          }
        }))
      }
    }
  }

  // Handle file uploads
  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [type]: 'Please upload a valid image file (JPEG, PNG, or GIF)'
      }))
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [type]: 'File size must be less than 5MB'
      }))
      return
    }

    if (type === 'logo') {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    } else {
      setLetterheadFile(file)
      setLetterheadPreview(URL.createObjectURL(file))
    }

    // Clear errors
    setErrors(prev => ({
      ...prev,
      [type]: ''
    }))
  }

  // Validation functions
  const validateGSTIN = (gstin) => {
    if (!gstin) return true // Optional field
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstinRegex.test(gstin)
  }

  const validatePAN = (pan) => {
    if (!pan) return true // Optional field
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan)
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(phone.replace(/\D/g, ''))
  }

  // Form validation
  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Company name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number'
    }

    // GSTIN validation
    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Please enter a valid GSTIN (15 characters)'
    }

    // PAN validation
    if (formData.pan && !validatePAN(formData.pan)) {
      newErrors.pan = 'Please enter a valid PAN (10 characters)'
    }

    // Address validation (at least primary address)
    if (!formData.address.street.trim()) {
      newErrors['address.street'] = 'Street address is required'
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required'
    }
    if (!formData.address.state.trim()) {
      newErrors['address.state'] = 'State is required'
    }
    if (!formData.address.pincode.trim()) {
      newErrors['address.pincode'] = 'Pincode is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare company data
      const companyData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin.trim() || null,
        pan: formData.pan.trim() || null,
        tan: formData.tan.trim() || null,
        cin: formData.cin.trim() || null,
        business_type: formData.business_type,
        address: formData.address,
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
        billing_currency: formData.billing_currency,
        timezone: formData.timezone,
        financial_year_start: formData.financial_year_start
      }

      // Create company
      const { success, company, error } = await createCompany(companyData)

      if (!success) {
        setErrors({ submit: error })
        return
      }

      // Upload files if provided
      if (logoFile) {
        const { data: logoData, error: logoError } = await storageHelpers.uploadLogo(company.id, logoFile)
        if (!logoError && logoData) {
          // Update company with logo URL
          // This would need to be handled in your updateCompany function
        }
      }

      if (letterheadFile) {
        const { data: letterheadData, error: letterheadError } = await storageHelpers.uploadLetterhead(company.id, letterheadFile)
        if (!letterheadError && letterheadData) {
          // Update company with letterhead URL
        }
      }

      // Redirect to dashboard
      router.push('/dashboard')

    } catch (error) {
      console.error('Company setup error:', error)
      setErrors({ submit: 'Failed to create company. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
      if (letterheadPreview) URL.revokeObjectURL(letterheadPreview)
    }
  }, [logoPreview, letterheadPreview])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Company Setup
            </h1>
            <p className="text-gray-600">
              Set up your company profile to start using EzBillify
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="company@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type
                  </label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Business Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AAAAA0000A"
                    maxLength={10}
                  />
                  {errors.pan && <p className="mt-1 text-sm text-red-600">{errors.pan}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TAN Number
                  </label>
                  <input
                    type="text"
                    name="tan"
                    value={formData.tan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AAAA00000A"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CIN Number
                  </label>
                  <input
                    type="text"
                    name="cin"
                    value={formData.cin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="U12345KA2023PTC123456"
                    maxLength={21}
                  />
                </div>
              </div>
            </div>

            {/* Primary Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Primary Address *
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('address', 'street', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter street address"
                  />
                  {errors['address.street'] && <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('address', 'city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter city"
                  />
                  {errors['address.city'] && <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('address', 'state', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter state"
                  />
                  {errors['address.state'] && <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => handleAddressChange('address', 'pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter pincode"
                    maxLength={6}
                  />
                  {errors['address.pincode'] && <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleAddressChange('address', 'country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter country"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Billing Address
                </h2>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="sameBillingAddress"
                    checked={formData.sameBillingAddress}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Same as primary address</span>
                </label>
              </div>

              {!formData.sameBillingAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.billing_address.street}
                      onChange={(e) => handleAddressChange('billing_address', 'street', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter billing street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.billing_address.city}
                      onChange={(e) => handleAddressChange('billing_address', 'city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.billing_address.state}
                      onChange={(e) => handleAddressChange('billing_address', 'state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter state"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.billing_address.pincode}
                      onChange={(e) => handleAddressChange('billing_address', 'pincode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter pincode"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.billing_address.country}
                      onChange={(e) => handleAddressChange('billing_address', 'country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Shipping Address
                </h2>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="sameShippingAddress"
                    checked={formData.sameShippingAddress}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Same as primary address</span>
                </label>
              </div>

              {!formData.sameShippingAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.street}
                      onChange={(e) => handleAddressChange('shipping_address', 'street', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter shipping street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.city}
                      onChange={(e) => handleAddressChange('shipping_address', 'city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.state}
                      onChange={(e) => handleAddressChange('shipping_address', 'state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter state"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.pincode}
                      onChange={(e) => handleAddressChange('shipping_address', 'pincode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter pincode"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.country}
                      onChange={(e) => handleAddressChange('shipping_address', 'country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Settings */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Configuration Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Currency
                  </label>
                  <select
                    name="billing_currency"
                    value={formData.billing_currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Financial Year Start
                  </label>
                  <input
                    type="date"
                    name="financial_year_start"
                    value={formData.financial_year_start}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Company Assets (Optional)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400">
                    <div className="space-y-1 text-center">
                      {logoPreview ? (
                        <div className="mb-4">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="mx-auto h-32 w-32 object-contain"
                          />
                        </div>
                      ) : (
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload logo</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'logo')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>
                  {errors.logo && <p className="mt-1 text-sm text-red-600">{errors.logo}</p>}
                </div>

                {/* Letterhead Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Letterhead Template
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400">
                    <div className="space-y-1 text-center">
                      {letterheadPreview ? (
                        <div className="mb-4">
                          <img
                            src={letterheadPreview}
                            alt="Letterhead preview"
                            className="mx-auto h-32 w-24 object-contain"
                          />
                        </div>
                      ) : (
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M9 12h30m-30 4h30m-30 4h30M9 24h12"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload letterhead</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'letterhead')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>
                  {errors.letterhead && <p className="mt-1 text-sm text-red-600">{errors.letterhead}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col items-center space-y-4">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.submit}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Company...
                  </div>
                ) : (
                  'Complete Setup & Continue'
                )}
              </button>

              <p className="text-sm text-gray-500 text-center">
                By completing setup, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CompanySetup

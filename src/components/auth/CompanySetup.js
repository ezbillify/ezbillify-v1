// src/components/auth/CompanySetup.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { storageHelpers, supabase } from '../../services/utils/supabase'
import Select from '../shared/ui/Select'
import Input from '../shared/ui/Input'
import Button from '../shared/ui/Button'
import LogoUpload from '../shared/LogoUpload'
import {
  INDIAN_STATES_LIST,
  BUSINESS_TYPES_LIST,
  CURRENCIES_LIST,
  TIMEZONES_LIST
} from '../../lib/constants'

const CompanySetup = () => {
  const { createCompany, user, loading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [logoThermalFile, setLogoThermalFile] = useState(null)
  const [letterheadFile, setLetterheadFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoThermalPreview, setLogoThermalPreview] = useState(null)
  const [letterheadPreview, setLetterheadPreview] = useState(null)
  const [fetchingPincode, setFetchingPincode] = useState({
    address: false,
    billing_address: false,
    shipping_address: false
  })

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
    gstin: '',
    pan: '',
    tan: '',
    cin: '',
    business_type: 'proprietorship',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    billing_address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    shipping_address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    billing_currency: 'INR',
    timezone: 'Asia/Kolkata',
    financial_year_start: '2024-04-01',
    sameBillingAddress: false,
    sameShippingAddress: false
  })

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
    } catch (error) {
      console.error('Error fetching location:', error)
    } finally {
      setFetchingPincode(prev => ({ ...prev, [addressType]: false }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }))
      if (name === 'sameBillingAddress' && checked) {
        setFormData(prev => ({ ...prev, billing_address: { ...prev.address } }))
      }
      if (name === 'sameShippingAddress' && checked) {
        setFormData(prev => ({ ...prev, shipping_address: { ...prev.address } }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleAddressChange = (addressType, field, value, shouldAutoCopy = true) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: { ...prev[addressType], [field]: value }
    }))

    if (field === 'pincode' && value.length === 6) {
      fetchLocationByPincode(value, addressType)
    }

    if (shouldAutoCopy && addressType === 'address') {
      if (formData.sameBillingAddress) {
        setFormData(prev => ({ 
          ...prev, 
          billing_address: { ...prev.billing_address, [field]: value } 
        }))
      }
      if (formData.sameShippingAddress) {
        setFormData(prev => ({ 
          ...prev, 
          shipping_address: { ...prev.shipping_address, [field]: value } 
        }))
      }
    }
  }

  const handleLogoChange = (file, error) => {
    if (error) {
      setErrors(prev => ({ ...prev, logo: error }))
      setLogoFile(null)
      setLogoPreview(null)
      return
    }

    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      setErrors(prev => ({ ...prev, logo: '' }))
    } else {
      setLogoFile(null)
      setLogoPreview(null)
    }
  }

  const handleLogoThermalChange = (file, error) => {
    if (error) {
      setErrors(prev => ({ ...prev, logoThermal: error }))
      setLogoThermalFile(null)
      setLogoThermalPreview(null)
      return
    }

    if (file) {
      setLogoThermalFile(file)
      setLogoThermalPreview(URL.createObjectURL(file))
      setErrors(prev => ({ ...prev, logoThermal: '' }))
    } else {
      setLogoThermalFile(null)
      setLogoThermalPreview(null)
    }
  }

  const handleLetterheadChange = (file, error) => {
    if (error) {
      setErrors(prev => ({ ...prev, letterhead: error }))
      setLetterheadFile(null)
      setLetterheadPreview(null)
      return
    }

    if (file) {
      setLetterheadFile(file)
      setLetterheadPreview(URL.createObjectURL(file))
      setErrors(prev => ({ ...prev, letterhead: '' }))
    } else {
      setLetterheadFile(null)
      setLetterheadPreview(null)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Company name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email'
    }
    
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number'
    }

    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN'
    }
    
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
      newErrors.pan = 'Invalid PAN'
    }

    if (!formData.address.street.trim()) newErrors['address.street'] = 'Street is required'
    if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required'
    if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required'
    if (!formData.address.pincode.trim()) newErrors['address.pincode'] = 'Pincode is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
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

      const { success, company, error } = await createCompany(companyData)

      if (!success) {
        setErrors({ submit: error })
        return
      }

      // Upload logos and save URLs to database
      const updates = {}

      if (logoFile) {
        const { data: logoData, error: logoError } = await storageHelpers.uploadLogo(company.id, logoFile)
        if (!logoError && logoData?.publicUrl) {
          updates.logo_url = logoData.publicUrl
        }
      }

      if (logoThermalFile) {
        const { data: thermalData, error: thermalError } = await storageHelpers.uploadThermalLogo(company.id, logoThermalFile)
        if (!thermalError && thermalData?.publicUrl) {
          updates.logo_thermal_url = thermalData.publicUrl
        }
      }

      if (letterheadFile) {
        const { data: letterheadData, error: letterheadError } = await storageHelpers.uploadLetterhead(company.id, letterheadFile)
        if (!letterheadError && letterheadData?.publicUrl) {
          updates.letterhead_url = letterheadData.publicUrl
        }
      }

      // Update company record with logo URLs if any were uploaded
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('companies')
          .update(updates)
          .eq('id', company.id)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Company setup error:', error)
      setErrors({ submit: 'Failed to create company. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
      if (logoThermalPreview) URL.revokeObjectURL(logoThermalPreview)
      if (letterheadPreview) URL.revokeObjectURL(letterheadPreview)
    }
  }, [logoPreview, logoThermalPreview, letterheadPreview])

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
                <Input 
                  label="Company Name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="Enter company name" 
                  required 
                  error={errors.name} 
                />
                <Input 
                  label="Email Address" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  placeholder="company@example.com" 
                  required 
                  error={errors.email} 
                />
                <Input 
                  label="Phone Number" 
                  name="phone" 
                  type="tel" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  placeholder="+91 98765 43210" 
                  required 
                  error={errors.phone} 
                />
                <Select 
                  label="Business Type" 
                  value={formData.business_type} 
                  onChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))} 
                  options={BUSINESS_TYPES_LIST} 
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Business Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="GSTIN" 
                  name="gstin" 
                  value={formData.gstin} 
                  onChange={handleInputChange} 
                  placeholder="22AAAAA0000A1Z5" 
                  maxLength={15} 
                  error={errors.gstin} 
                />
                <Input 
                  label="PAN Number" 
                  name="pan" 
                  value={formData.pan} 
                  onChange={handleInputChange} 
                  placeholder="AAAAA0000A" 
                  maxLength={10} 
                  error={errors.pan} 
                />
                <Input 
                  label="TAN Number" 
                  name="tan" 
                  value={formData.tan} 
                  onChange={handleInputChange} 
                  placeholder="AAAA00000A" 
                  maxLength={10} 
                />
                <Input 
                  label="CIN Number" 
                  name="cin" 
                  value={formData.cin} 
                  onChange={handleInputChange} 
                  placeholder="U12345KA2023PTC123456" 
                  maxLength={21} 
                />
              </div>
            </div>

            {/* Primary Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Primary Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input 
                    label="Street Address" 
                    value={formData.address.street} 
                    onChange={(e) => handleAddressChange('address', 'street', e.target.value)} 
                    placeholder="Enter street address" 
                    required 
                    error={errors['address.street']} 
                  />
                </div>
                <Input 
                  label="Pincode" 
                  value={formData.address.pincode} 
                  onChange={(e) => handleAddressChange('address', 'pincode', e.target.value)} 
                  placeholder="Enter pincode" 
                  maxLength={6} 
                  required 
                  error={errors['address.pincode']} 
                  helperText={fetchingPincode.address ? 'Fetching location...' : 'Enter 6-digit pincode'} 
                />
                <Input 
                  label="City" 
                  value={formData.address.city} 
                  onChange={(e) => handleAddressChange('address', 'city', e.target.value)} 
                  placeholder="City" 
                  required 
                  error={errors['address.city']} 
                />
                <Select 
                  label="State" 
                  value={formData.address.state} 
                  onChange={(value) => handleAddressChange('address', 'state', value)} 
                  options={INDIAN_STATES_LIST} 
                  searchable 
                  placeholder="Select state" 
                  required 
                  error={errors['address.state']} 
                />
                <Input 
                  label="Country" 
                  value={formData.address.country} 
                  onChange={(e) => handleAddressChange('address', 'country', e.target.value)} 
                  placeholder="Country" 
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Billing Address
                </h2>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="sameBillingAddress" 
                    checked={formData.sameBillingAddress} 
                    onChange={handleInputChange} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                  />
                  <span className="ml-2 text-sm text-gray-600">Same as primary</span>
                </label>
              </div>
              {!formData.sameBillingAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input 
                      label="Street Address" 
                      value={formData.billing_address.street} 
                      onChange={(e) => handleAddressChange('billing_address', 'street', e.target.value)} 
                      placeholder="Enter billing street" 
                    />
                  </div>
                  <Input 
                    label="Pincode" 
                    value={formData.billing_address.pincode} 
                    onChange={(e) => handleAddressChange('billing_address', 'pincode', e.target.value)} 
                    maxLength={6} 
                    helperText={fetchingPincode.billing_address ? 'Fetching...' : ''} 
                  />
                  <Input 
                    label="City" 
                    value={formData.billing_address.city} 
                    onChange={(e) => handleAddressChange('billing_address', 'city', e.target.value)} 
                  />
                  <Select 
                    label="State" 
                    value={formData.billing_address.state} 
                    onChange={(value) => handleAddressChange('billing_address', 'state', value)} 
                    options={INDIAN_STATES_LIST} 
                    searchable 
                  />
                  <Input 
                    label="Country" 
                    value={formData.billing_address.country} 
                    onChange={(e) => handleAddressChange('billing_address', 'country', e.target.value)} 
                  />
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Shipping Address
                </h2>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="sameShippingAddress" 
                    checked={formData.sameShippingAddress} 
                    onChange={handleInputChange} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                  />
                  <span className="ml-2 text-sm text-gray-600">Same as primary</span>
                </label>
              </div>
              {!formData.sameShippingAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input 
                      label="Street Address" 
                      value={formData.shipping_address.street} 
                      onChange={(e) => handleAddressChange('shipping_address', 'street', e.target.value)} 
                      placeholder="Enter shipping street" 
                    />
                  </div>
                  <Input 
                    label="Pincode" 
                    value={formData.shipping_address.pincode} 
                    onChange={(e) => handleAddressChange('shipping_address', 'pincode', e.target.value)} 
                    maxLength={6} 
                    helperText={fetchingPincode.shipping_address ? 'Fetching...' : ''} 
                  />
                  <Input 
                    label="City" 
                    value={formData.shipping_address.city} 
                    onChange={(e) => handleAddressChange('shipping_address', 'city', e.target.value)} 
                  />
                  <Select 
                    label="State" 
                    value={formData.shipping_address.state} 
                    onChange={(value) => handleAddressChange('shipping_address', 'state', value)} 
                    options={INDIAN_STATES_LIST} 
                    searchable 
                  />
                  <Input 
                    label="Country" 
                    value={formData.shipping_address.country} 
                    onChange={(e) => handleAddressChange('shipping_address', 'country', e.target.value)} 
                  />
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select 
                  label="Currency" 
                  value={formData.billing_currency} 
                  onChange={(value) => setFormData(prev => ({ ...prev, billing_currency: value }))} 
                  options={CURRENCIES_LIST} 
                  searchable 
                />
                <Select 
                  label="Timezone" 
                  value={formData.timezone} 
                  onChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))} 
                  options={TIMEZONES_LIST} 
                  searchable 
                />
                <Input 
                  label="Financial Year Start" 
                  name="financial_year_start" 
                  type="date" 
                  value={formData.financial_year_start} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>

            {/* File Uploads */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Company Assets (Optional)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload your company logos and letterhead. These will appear on invoices and other documents.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUpload
                  label="Company Logo"
                  description="Regular color logo for documents and website"
                  preview={logoPreview}
                  onFileSelect={handleLogoChange}
                  error={errors.logo}
                />

                <LogoUpload
                  label="Thermal Print Logo"
                  description="Black & white logo optimized for thermal receipt printers"
                  preview={logoThermalPreview}
                  onFileSelect={handleLogoThermalChange}
                  error={errors.logoThermal}
                />

                <div className="md:col-span-2">
                  <LogoUpload
                    label="Letterhead"
                    description="Full page letterhead design (optional)"
                    preview={letterheadPreview}
                    onFileSelect={handleLetterheadChange}
                    error={errors.letterhead}
                    helpText="PNG, JPG, or GIF up to 500KB"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center space-y-4">
              {errors.submit && (
                <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                  {errors.submit}
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                fullWidth 
                loading={isSubmitting} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Company...' : 'Complete Setup & Continue'}
              </Button>

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
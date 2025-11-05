// src/components/others/CompanyProfile.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, storageHelpers } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'
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

const CompanyProfile = () => {
  const { company, user, updateCompany } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingThermalLogo, setUploadingThermalLogo] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoThermalFile, setLogoThermalFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoThermalPreview, setLogoThermalPreview] = useState(null)
  const [fetchingPincode, setFetchingPincode] = useState({
    address: false,
    billing_address: false,
    shipping_address: false
  })
  
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

  useEffect(() => {
    if (company) {
      loadCompanyData()
    }
  }, [company])

  const loadCompanyData = () => {
    console.log('🔍 Loading company data:', {
      logo_url: company.logo_url,
      logo_thermal_url: company.logo_thermal_url,
      letterhead_url: company.letterhead_url
    })

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

    // Load existing logos
    setLogoPreview(company.logo_url || null)
    setLogoThermalPreview(company.logo_thermal_url || null)

    console.log('✅ Logo previews set:', {
      logoPreview: company.logo_url || null,
      logoThermalPreview: company.logo_thermal_url || null
    })
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
      const addressData = { ...formData.address }
      let billingAddressData = { ...formData.billing_address }
      let shippingAddressData = { ...formData.shipping_address }

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
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleAddressChange = (addressType, field, value, shouldAutoCopy = true) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }))

    if (field === 'pincode' && value.length === 6) {
      fetchLocationByPincode(value, addressType)
    }

    if (shouldAutoCopy && addressType === 'address') {
      if (formData.billing_address.same_as_address) {
        setFormData(prev => ({
          ...prev,
          billing_address: { ...prev.billing_address, [field]: value }
        }))
      }
      if (formData.shipping_address.same_as_address) {
        setFormData(prev => ({
          ...prev,
          shipping_address: { ...prev.shipping_address, [field]: value }
        }))
      }
    }
  }

  const handleLogoChange = (file, err) => {
    if (err) {
      error(err)
      return
    }

    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    } else {
      setLogoFile(null)
      setLogoPreview(company.logo_url || null)
    }
  }

  const handleLogoThermalChange = (file, err) => {
    if (err) {
      error(err)
      return
    }

    if (file) {
      setLogoThermalFile(file)
      setLogoThermalPreview(URL.createObjectURL(file))
    } else {
      setLogoThermalFile(null)
      setLogoThermalPreview(company.logo_thermal_url || null)
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return

    setUploadingLogo(true)
    try {
      console.log('📤 Uploading logo for company:', company.id)
      const { data, error: uploadError } = await storageHelpers.uploadLogo(company.id, logoFile)

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      console.log('✅ Logo uploaded to storage:', data)

      const { error: dbError } = await supabase
        .from('companies')
        .update({ logo_url: data.publicUrl })
        .eq('id', company.id)

      if (dbError) {
        console.error('❌ Database update error:', dbError)
        throw dbError
      }

      console.log('✅ Database updated with logo URL:', data.publicUrl)

      await updateCompany(company.id, { logo_url: data.publicUrl })

      // Update preview with uploaded URL (add timestamp to force refresh)
      const urlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`
      setLogoPreview(urlWithTimestamp)
      setLogoFile(null)

      console.log('✅ Preview updated:', urlWithTimestamp)
      success('Logo uploaded successfully')
    } catch (err) {
      console.error('❌ Error uploading logo:', err)
      error('Failed to upload logo: ' + (err.message || 'Unknown error'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleUploadThermalLogo = async () => {
    if (!logoThermalFile) return

    setUploadingThermalLogo(true)
    try {
      console.log('📤 Uploading thermal logo for company:', company.id)
      const { data, error: uploadError } = await storageHelpers.uploadThermalLogo(company.id, logoThermalFile)

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      console.log('✅ Thermal logo uploaded to storage:', data)

      const { error: dbError } = await supabase
        .from('companies')
        .update({ logo_thermal_url: data.publicUrl })
        .eq('id', company.id)

      if (dbError) {
        console.error('❌ Database update error:', dbError)
        throw dbError
      }

      console.log('✅ Database updated with thermal logo URL:', data.publicUrl)

      await updateCompany(company.id, { logo_thermal_url: data.publicUrl })

      // Update preview with uploaded URL (add timestamp to force refresh)
      const urlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`
      setLogoThermalPreview(urlWithTimestamp)
      setLogoThermalFile(null)

      console.log('✅ Thermal preview updated:', urlWithTimestamp)
      success('Thermal logo uploaded successfully')
    } catch (err) {
      console.error('❌ Error uploading thermal logo:', err)
      error('Failed to upload thermal logo: ' + (err.message || 'Unknown error'))
    } finally {
      setUploadingThermalLogo(false)
    }
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
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter company name"
              required
              error={errors.name}
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="company@example.com"
              required
              error={errors.email}
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
            />

            <Input
              label="Website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://company.com"
            />

            <Select
              label="Business Type"
              value={formData.business_type}
              onChange={(value) => handleChange('business_type', value)}
              options={BUSINESS_TYPES_LIST}
            />
          </div>
        </div>

        {/* Company Logos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Company Logos</h3>
          <p className="text-sm text-gray-600 mb-6">
            Upload your company logos. The thermal logo will be used for receipt printing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <LogoUpload
                label="Company Logo"
                description="Regular color logo for documents and website"
                preview={logoPreview}
                onFileSelect={handleLogoChange}
              />
              {logoFile && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={handleUploadLogo}
                    loading={uploadingLogo}
                    disabled={uploadingLogo}
                    variant="primary"
                    size="sm"
                    fullWidth
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <LogoUpload
                label="Thermal Print Logo"
                description="Black & white logo optimized for thermal receipt printers"
                preview={logoThermalPreview}
                onFileSelect={handleLogoThermalChange}
              />
              {logoThermalFile && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={handleUploadThermalLogo}
                    loading={uploadingThermalLogo}
                    disabled={uploadingThermalLogo}
                    variant="primary"
                    size="sm"
                    fullWidth
                  >
                    {uploadingThermalLogo ? 'Uploading...' : 'Upload Thermal Logo'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              error={errors.gstin}
            />

            <Input
              label="PAN"
              value={formData.pan}
              onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
              placeholder="AAAAA0000A"
              maxLength={10}
              error={errors.pan}
            />

            <Input
              label="TAN"
              value={formData.tan}
              onChange={(e) => handleChange('tan', e.target.value.toUpperCase())}
              placeholder="AAAA00000A"
              maxLength={10}
            />

            <Input
              label="CIN"
              value={formData.cin}
              onChange={(e) => handleChange('cin', e.target.value.toUpperCase())}
              placeholder="U12345MH2023PTC123456"
              maxLength={21}
            />
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Base Currency"
              value={formData.billing_currency}
              onChange={(value) => handleChange('billing_currency', value)}
              options={CURRENCIES_LIST}
              searchable
            />

            <Select
              label="Timezone"
              value={formData.timezone}
              onChange={(value) => handleChange('timezone', value)}
              options={TIMEZONES_LIST}
              searchable
            />

            <Input
              label="Financial Year Start"
              type="date"
              value={formData.financial_year_start}
              onChange={(e) => handleChange('financial_year_start', e.target.value)}
            />
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
                  <Input
                    label="Street Address"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('address', 'street', e.target.value)}
                    placeholder="Enter street address"
                  />
                </div>
                <Input
                  label="Pincode"
                  value={formData.address.pincode}
                  onChange={(e) => handleAddressChange('address', 'pincode', e.target.value)}
                  placeholder="Enter pincode"
                  maxLength={6}
                  helperText={fetchingPincode.address ? 'Fetching location...' : 'Enter 6-digit pincode'}
                />
                <Input
                  label="City"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('address', 'city', e.target.value)}
                  placeholder="City"
                />
                <Select
                  label="State"
                  value={formData.address.state}
                  onChange={(value) => handleAddressChange('address', 'state', value)}
                  options={INDIAN_STATES_LIST}
                  searchable
                  placeholder="Select state"
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
                    <Input
                      label="Street Address"
                      value={formData.billing_address.street}
                      onChange={(e) => handleAddressChange('billing_address', 'street', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Pincode"
                    value={formData.billing_address.pincode}
                    onChange={(e) => handleAddressChange('billing_address', 'pincode', e.target.value)}
                    maxLength={6}
                    helperText={fetchingPincode.billing_address ? 'Fetching location...' : ''}
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
                    <Input
                      label="Street Address"
                      value={formData.shipping_address.street}
                      onChange={(e) => handleAddressChange('shipping_address', 'street', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Pincode"
                    value={formData.shipping_address.pincode}
                    onChange={(e) => handleAddressChange('shipping_address', 'pincode', e.target.value)}
                    maxLength={6}
                    helperText={fetchingPincode.shipping_address ? 'Fetching location...' : ''}
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
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={loadCompanyData}
              disabled={saving}
              variant="outline"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              variant="primary"
            >
              Save Changes
            </Button>
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
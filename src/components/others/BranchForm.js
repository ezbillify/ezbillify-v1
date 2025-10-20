// src/components/others/BranchForm.js
import { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'
import Input from '../shared/ui/Input'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

const BranchForm = ({ companyId, branch, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    document_prefix: branch?.document_prefix || '',
    email: branch?.email || '',
    phone: branch?.phone || '',
    street: branch?.address?.street || '',
    city: branch?.address?.city || '',
    state: branch?.address?.state || '',
    pincode: branch?.address?.pincode || '',
    country: branch?.address?.country || 'India',
    is_active: branch?.is_active !== undefined ? branch.is_active : true,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [fetchingPincode, setFetchingPincode] = useState(false)

  const fetchLocationByPincode = async (pincode) => {
    if (pincode.length !== 6) return

    setFetchingPincode(true)

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()

      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        setFormData(prev => ({
          ...prev,
          city: postOffice.District,
          state: postOffice.State
        }))
      }
    } catch (err) {
      console.error('Error fetching location:', err)
    } finally {
      setFetchingPincode(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required'
    }

    if (!formData.document_prefix.trim()) {
      newErrors.document_prefix = 'Document prefix is required'
    } else if (formData.document_prefix.length > 10) {
      newErrors.document_prefix = 'Prefix must be 10 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Auto-fetch location when pincode is entered
    if (name === 'pincode' && value.length === 6) {
      fetchLocationByPincode(value)
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const branchData = {
        company_id: companyId,
        name: formData.name.trim(),
        document_prefix: formData.document_prefix.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
        },
        billing_address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
        },
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      }

      if (branch?.id) {
        // Update existing branch
        const { data, error: updateError } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', branch.id)
          .select()
          .single()

        if (updateError) throw updateError

        onSuccess(data)
      } else {
        // Create new branch
        const { data, error: createError } = await supabase
          .from('branches')
          .insert([
            {
              ...branchData,
              document_number_counter: 1,
              is_default: false,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (createError) throw createError

        onSuccess(data)
      }
    } catch (err) {
      console.error('Error saving branch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 bg-blue-50 border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {branch ? 'Edit Branch' : 'Add New Branch'}
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Branch Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Mumbai Branch"
            error={errors.name}
          />

          <Input
            label="Document Prefix"
            name="document_prefix"
            value={formData.document_prefix}
            onChange={handleInputChange}
            placeholder="e.g., MUM"
            maxLength={10}
            error={errors.document_prefix}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="branch@company.com"
          />

          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="10-digit phone number"
          />
        </div>

        {/* Address Section */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Address</h4>
          
          <Input
            label="Street Address"
            name="street"
            value={formData.street}
            onChange={handleInputChange}
            placeholder="Enter street address"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
              placeholder="Enter 6-digit pincode"
              maxLength={6}
              helperText={fetchingPincode ? 'Fetching location...' : ''}
            />

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="City (auto-filled)"
              disabled={fetchingPincode}
            />

            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="State (auto-filled)"
              disabled={fetchingPincode}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Country"
            />
          </div>
        </div>

        {/* Status */}
        <div className="border-t pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {branch ? 'Update Branch' : 'Create Branch'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default BranchForm
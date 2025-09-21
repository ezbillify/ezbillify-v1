// src/components/shared/forms/AddressForm.js
import React from 'react'
import FormField from './FormField'

const AddressForm = ({ 
  address = {}, 
  onChange, 
  prefix = '',
  required = false,
  className = '',
  countries = [
    { value: 'India', label: 'India' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Australia', label: 'Australia' }
  ],
  showCountry = true,
  errors = {}
}) => {
  const handleChange = (field, value) => {
    onChange({
      ...address,
      [field]: value
    })
  }

  const getFieldName = (field) => `${prefix}${field}`
  const getFieldError = (field) => errors[getFieldName(field)]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Street Address */}
      <FormField 
        label="Street Address" 
        required={required}
        error={getFieldError('street')}
        className="md:col-span-2"
      >
        <input
          type="text"
          name={getFieldName('street')}
          value={address.street || ''}
          onChange={(e) => handleChange('street', e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          placeholder="Enter street address"
        />
      </FormField>

      {/* City */}
      <FormField 
        label="City" 
        required={required}
        error={getFieldError('city')}
      >
        <input
          type="text"
          name={getFieldName('city')}
          value={address.city || ''}
          onChange={(e) => handleChange('city', e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          placeholder="Enter city"
        />
      </FormField>

      {/* State */}
      <FormField 
        label="State" 
        required={required}
        error={getFieldError('state')}
      >
        <input
          type="text"
          name={getFieldName('state')}
          value={address.state || ''}
          onChange={(e) => handleChange('state', e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          placeholder="Enter state"
        />
      </FormField>

      {/* Pincode */}
      <FormField 
        label="Pincode" 
        required={required}
        error={getFieldError('pincode')}
      >
        <input
          type="text"
          name={getFieldName('pincode')}
          value={address.pincode || ''}
          onChange={(e) => handleChange('pincode', e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          placeholder="Enter pincode"
          maxLength={6}
          pattern="[0-9]{6}"
        />
      </FormField>

      {/* Country */}
      {showCountry && (
        <FormField 
          label="Country" 
          required={required}
          error={getFieldError('country')}
        >
          <select
            name={getFieldName('country')}
            value={address.country || 'India'}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            {countries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </FormField>
      )}
    </div>
  )
}

export default AddressForm
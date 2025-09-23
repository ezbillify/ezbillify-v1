import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const UnitForm = ({ unit = null, onSave, onCancel }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [baseUnits, setBaseUnits] = useState([])
  
  const [formData, setFormData] = useState({
    unit_name: unit?.unit_name || '',
    unit_symbol: unit?.unit_symbol || '',
    unit_type: unit?.unit_type || 'count',
    base_unit_id: unit?.base_unit_id || '',
    conversion_factor: unit?.conversion_factor || 1
  })

  const [errors, setErrors] = useState({})

  const unitTypes = [
    { value: 'count', label: 'Count/Quantity' },
    { value: 'weight', label: 'Weight' },
    { value: 'volume', label: 'Volume' },
    { value: 'length', label: 'Length' },
    { value: 'area', label: 'Area' },
    { value: 'time', label: 'Time' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    fetchBaseUnits()
  }, [formData.unit_type])

  const fetchBaseUnits = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('units')
        .select('id, unit_name, unit_symbol, unit_type')
        .or(`company_id.eq.${company?.id},company_id.is.null`)
        .eq('unit_type', formData.unit_type)
        .eq('is_active', true)
        .order('unit_name')

      if (fetchError) throw fetchError
      setBaseUnits(data || [])
    } catch (err) {
      console.error('Error fetching base units:', err)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.unit_name.trim()) {
      newErrors.unit_name = 'Unit name is required'
    }

    if (!formData.unit_symbol.trim()) {
      newErrors.unit_symbol = 'Unit symbol is required'
    }

    if (!formData.unit_type) {
      newErrors.unit_type = 'Unit type is required'
    }

    if (formData.conversion_factor <= 0) {
      newErrors.conversion_factor = 'Conversion factor must be greater than 0'
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

    setLoading(true)
    
    try {
      const unitData = {
        unit_name: formData.unit_name.trim(),
        unit_symbol: formData.unit_symbol.trim().toUpperCase(),
        unit_type: formData.unit_type,
        company_id: company?.id,
        conversion_factor: parseFloat(formData.conversion_factor),
        base_unit_id: formData.base_unit_id || null,
        is_active: true
      }

      let result
      if (unit?.id) {
        // Update existing unit
        result = await supabase
          .from('units')
          .update(unitData)
          .eq('id', unit.id)
          .select()
      } else {
        // Create new unit
        result = await supabase
          .from('units')
          .insert([unitData])
          .select()
      }

      if (result.error) throw result.error

      success(
        unit?.id ? 'Unit updated successfully' : 'Unit created successfully'
      )

      onSave?.(result.data[0])
    } catch (err) {
      console.error('Error saving unit:', err)
      error(err.message || 'Failed to save unit')
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

    // Reset base unit when type changes
    if (field === 'unit_type') {
      setFormData(prev => ({
        ...prev,
        base_unit_id: '',
        conversion_factor: 1
      }))
    }
  }

  const filteredBaseUnits = baseUnits.filter(baseUnit => 
    baseUnit.id !== unit?.id // Don't allow selecting itself as base unit
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unit_name}
              onChange={(e) => handleChange('unit_name', e.target.value)}
              placeholder="e.g., Kilogram, Pieces, Meter"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.unit_name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.unit_name && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unit_symbol}
              onChange={(e) => handleChange('unit_symbol', e.target.value)}
              placeholder="e.g., KG, PCS, MTR"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.unit_symbol ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.unit_symbol && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_symbol}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit_type}
              onChange={(e) => handleChange('unit_type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.unit_type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select Unit Type</option>
              {unitTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.unit_type && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Unit
            </label>
            <select
              value={formData.base_unit_id}
              onChange={(e) => handleChange('base_unit_id', e.target.value)}
              disabled={!formData.unit_type}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">No Base Unit (Primary)</option>
              {filteredBaseUnits.map(baseUnit => (
                <option key={baseUnit.id} value={baseUnit.id}>
                  {baseUnit.unit_name} ({baseUnit.unit_symbol})
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Select a base unit for conversion calculations
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conversion Factor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.conversion_factor}
              onChange={(e) => handleChange('conversion_factor', e.target.value)}
              placeholder="1"
              step="0.000001"
              min="0.000001"
              disabled={!formData.base_unit_id}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                errors.conversion_factor ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.conversion_factor && (
              <p className="mt-1 text-sm text-red-600">{errors.conversion_factor}</p>
            )}
            {formData.base_unit_id && (
              <div className="text-xs text-gray-500 mt-1">
                1 {formData.unit_symbol} = {formData.conversion_factor} {baseUnits.find(u => u.id === formData.base_unit_id)?.unit_symbol}
              </div>
            )}
          </div>
        </div>

        {/* Unit Conversion Preview */}
        {formData.base_unit_id && formData.conversion_factor > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Conversion Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>1 {formData.unit_symbol} = {formData.conversion_factor} {baseUnits.find(u => u.id === formData.base_unit_id)?.unit_symbol}</div>
              <div>10 {formData.unit_symbol} = {(10 * parseFloat(formData.conversion_factor)).toFixed(6)} {baseUnits.find(u => u.id === formData.base_unit_id)?.unit_symbol}</div>
              <div>100 {formData.unit_symbol} = {(100 * parseFloat(formData.conversion_factor)).toFixed(6)} {baseUnits.find(u => u.id === formData.base_unit_id)?.unit_symbol}</div>
            </div>
          </div>
        )}

        {/* Common Unit Examples */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Common Unit Examples</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium">Weight</div>
              <div>KG (base), GM (0.001), QTL (100)</div>
            </div>
            <div>
              <div className="font-medium">Length</div>
              <div>MTR (base), CM (0.01), KM (1000)</div>
            </div>
            <div>
              <div className="font-medium">Volume</div>
              <div>LTR (base), ML (0.001), GAL (3.785)</div>
            </div>
            <div>
              <div className="font-medium">Count</div>
              <div>PCS (base), DOZ (12), BOX (varies)</div>
            </div>
            <div>
              <div className="font-medium">Area</div>
              <div>SQFT (base), SQMT (10.764), ACRE (43560)</div>
            </div>
            <div>
              <div className="font-medium">Time</div>
              <div>HR (base), DAY (24), MIN (0.0167)</div>
            </div>
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
          {loading ? 'Saving...' : (unit?.id ? 'Update Unit' : 'Create Unit')}
        </button>
      </div>
    </form>
  )
}

export default UnitForm
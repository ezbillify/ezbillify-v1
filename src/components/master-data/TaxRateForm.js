import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import Button from '../shared/ui/Button'
import Input from '../shared/ui/Input'
import Select from '../shared/ui/Select'
import FormField from '../shared/forms/FormField'
import FormSection from '../shared/forms/FormSection'
import ValidationMessage from '../shared/forms/ValidationMessage'
import { useToast } from '../../hooks/useToast'

const TaxRateForm = ({ taxRate = null, onSave, onCancel }) => {
  const { company } = useAuth()
  const { success, error } = useToast() // FIXED: Use correct destructuring
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    tax_name: taxRate?.tax_name || '',
    tax_type: taxRate?.tax_type || 'gst',
    tax_rate: taxRate?.tax_rate || 0,
    cgst_rate: taxRate?.cgst_rate || 0,
    sgst_rate: taxRate?.sgst_rate || 0,
    igst_rate: taxRate?.igst_rate || 0,
    cess_rate: taxRate?.cess_rate || 0,
    is_default: taxRate?.is_default || false
  })

  const [errors, setErrors] = useState({})

  const taxTypes = [
    { value: 'gst', label: 'GST (Goods & Services Tax)' },
    { value: 'vat', label: 'VAT (Value Added Tax)' },
    { value: 'service_tax', label: 'Service Tax' },
    { value: 'excise', label: 'Excise Duty' },
    { value: 'customs', label: 'Customs Duty' },
    { value: 'cess', label: 'Cess' },
    { value: 'other', label: 'Other Tax' }
  ]

  const commonGSTRates = [
    { rate: 0, cgst: 0, sgst: 0, igst: 0, label: '0% (Exempt)' },
    { rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, label: '5% GST' },
    { rate: 12, cgst: 6, sgst: 6, igst: 12, label: '12% GST' },
    { rate: 18, cgst: 9, sgst: 9, igst: 18, label: '18% GST' },
    { rate: 28, cgst: 14, sgst: 14, igst: 28, label: '28% GST' }
  ]

  useEffect(() => {
    // Auto-calculate GST split when tax_rate changes
    if (formData.tax_type === 'gst' && formData.tax_rate > 0) {
      const rate = parseFloat(formData.tax_rate)
      const half = rate / 2
      setFormData(prev => ({
        ...prev,
        cgst_rate: half,
        sgst_rate: half,
        igst_rate: rate
      }))
    }
  }, [formData.tax_rate, formData.tax_type])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.tax_name.trim()) {
      newErrors.tax_name = 'Tax name is required'
    }

    if (!formData.tax_type) {
      newErrors.tax_type = 'Tax type is required'
    }

    if (formData.tax_rate < 0 || formData.tax_rate > 100) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100'
    }

    if (formData.tax_type === 'gst') {
      const totalGST = parseFloat(formData.cgst_rate) + parseFloat(formData.sgst_rate)
      if (Math.abs(totalGST - parseFloat(formData.tax_rate)) > 0.01) {
        newErrors.cgst_rate = 'CGST + SGST should equal total tax rate'
      }

      if (Math.abs(parseFloat(formData.igst_rate) - parseFloat(formData.tax_rate)) > 0.01) {
        newErrors.igst_rate = 'IGST should equal total tax rate'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      error('Please fix the form errors') // FIXED: Use error method
      return
    }

    setLoading(true)
    
    try {
      // If setting as default, first remove default from other tax rates
      if (formData.is_default) {
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('company_id', company?.id)
          .eq('tax_type', formData.tax_type)
      }

      const taxData = {
        ...formData,
        company_id: company?.id,
        tax_rate: parseFloat(formData.tax_rate),
        cgst_rate: parseFloat(formData.cgst_rate) || 0,
        sgst_rate: parseFloat(formData.sgst_rate) || 0,
        igst_rate: parseFloat(formData.igst_rate) || 0,
        cess_rate: parseFloat(formData.cess_rate) || 0
      }

      let result
      if (taxRate?.id) {
        // Update existing tax rate
        result = await supabase
          .from('tax_rates')
          .update(taxData)
          .eq('id', taxRate.id)
          .select()
      } else {
        // Create new tax rate
        result = await supabase
          .from('tax_rates')
          .insert([taxData])
          .select()
      }

      if (result.error) throw result.error

      success( // FIXED: Use success method
        taxRate?.id ? 'Tax rate updated successfully' : 'Tax rate created successfully'
      )

      onSave?.(result.data[0])
    } catch (err) {
      console.error('Error saving tax rate:', err)
      error(err.message || 'Failed to save tax rate') // FIXED: Use error method
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
  }

  const applyCommonGSTRate = (rate) => {
    setFormData(prev => ({
      ...prev,
      tax_rate: rate.rate,
      cgst_rate: rate.cgst,
      sgst_rate: rate.sgst,
      igst_rate: rate.igst
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Tax Rate Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Tax Name" required>
            <Input
              value={formData.tax_name}
              onChange={(e) => handleChange('tax_name', e.target.value)}
              placeholder="e.g., GST 18%"
              error={!!errors.tax_name}
            />
            <ValidationMessage message={errors.tax_name} />
          </FormField>

          <FormField label="Tax Type" required>
            <Select
              value={formData.tax_type}
              onChange={(value) => handleChange('tax_type', value)}
              error={!!errors.tax_type}
            >
              <option value="">Select Tax Type</option>
              {taxTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <ValidationMessage message={errors.tax_type} />
          </FormField>

          <FormField label="Tax Rate (%)" required>
            <Input
              type="number"
              value={formData.tax_rate}
              onChange={(e) => handleChange('tax_rate', e.target.value)}
              placeholder="18.00"
              step="0.01"
              min="0"
              max="100"
              error={!!errors.tax_rate}
            />
            <ValidationMessage message={errors.tax_rate} />
          </FormField>

          <FormField label="Default Rate">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleChange('is_default', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Set as default for this tax type</span>
            </div>
          </FormField>
        </div>

        {/* Common GST Rates Quick Select */}
        {formData.tax_type === 'gst' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select Common GST Rates
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {commonGSTRates.map((rate, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyCommonGSTRate(rate)}
                  className="text-xs"
                >
                  {rate.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* GST Components */}
        {formData.tax_type === 'gst' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <FormField label="CGST Rate (%)">
              <Input
                type="number"
                value={formData.cgst_rate}
                onChange={(e) => handleChange('cgst_rate', e.target.value)}
                placeholder="9.00"
                step="0.01"
                min="0"
                error={!!errors.cgst_rate}
              />
              <ValidationMessage message={errors.cgst_rate} />
            </FormField>

            <FormField label="SGST Rate (%)">
              <Input
                type="number"
                value={formData.sgst_rate}
                onChange={(e) => handleChange('sgst_rate', e.target.value)}
                placeholder="9.00"
                step="0.01"
                min="0"
                error={!!errors.sgst_rate}
              />
            </FormField>

            <FormField label="IGST Rate (%)">
              <Input
                type="number"
                value={formData.igst_rate}
                onChange={(e) => handleChange('igst_rate', e.target.value)}
                placeholder="18.00"
                step="0.01"
                min="0"
                error={!!errors.igst_rate}
              />
              <ValidationMessage message={errors.igst_rate} />
            </FormField>

            <FormField label="Cess Rate (%)">
              <Input
                type="number"
                value={formData.cess_rate}
                onChange={(e) => handleChange('cess_rate', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </FormField>
          </div>
        )}

        {/* Tax Calculation Preview */}
        {formData.tax_rate > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Tax Calculation Preview</h4>
            <div className="text-sm text-gray-600">
              <div>On ₹1,000 taxable amount:</div>
              {formData.tax_type === 'gst' ? (
                <div className="mt-1">
                  <div>CGST ({formData.cgst_rate}%): ₹{((1000 * parseFloat(formData.cgst_rate || 0)) / 100).toFixed(2)}</div>
                  <div>SGST ({formData.sgst_rate}%): ₹{((1000 * parseFloat(formData.sgst_rate || 0)) / 100).toFixed(2)}</div>
                  {formData.cess_rate > 0 && (
                    <div>Cess ({formData.cess_rate}%): ₹{((1000 * parseFloat(formData.cess_rate || 0)) / 100).toFixed(2)}</div>
                  )}
                  <div className="font-medium">Total Tax: ₹{((1000 * parseFloat(formData.tax_rate || 0)) / 100).toFixed(2)}</div>
                  <div className="font-medium">Total Amount: ₹{(1000 + (1000 * parseFloat(formData.tax_rate || 0)) / 100 + (1000 * parseFloat(formData.cess_rate || 0)) / 100).toFixed(2)}</div>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="font-medium">Tax Amount: ₹{((1000 * parseFloat(formData.tax_rate || 0)) / 100).toFixed(2)}</div>
                  <div className="font-medium">Total Amount: ₹{(1000 + (1000 * parseFloat(formData.tax_rate || 0)) / 100).toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </FormSection>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {taxRate?.id ? 'Update Tax Rate' : 'Create Tax Rate'}
        </Button>
      </div>
    </form>
  )
}

export default TaxRateForm
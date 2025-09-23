import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import Button from '../shared/ui/Button'
import Input from '../shared/ui/Input'
import FormField from '../shared/forms/FormField'
import FormSection from '../shared/forms/FormSection'
import ValidationMessage from '../shared/forms/ValidationMessage'
import { useToast } from '../../hooks/useToast'

const PaymentTermsForm = ({ paymentTerm = null, onSave, onCancel }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    term_name: paymentTerm?.term_name || '',
    term_days: paymentTerm?.term_days || 0,
    description: paymentTerm?.description || '',
    is_active: paymentTerm?.is_active !== undefined ? paymentTerm.is_active : true
  })

  const [errors, setErrors] = useState({})

  const commonTerms = [
    { name: 'Immediate', days: 0, description: 'Payment due immediately' },
    { name: 'Net 7', days: 7, description: 'Payment due within 7 days' },
    { name: 'Net 15', days: 15, description: 'Payment due within 15 days' },
    { name: 'Net 30', days: 30, description: 'Payment due within 30 days' },
    { name: 'Net 45', days: 45, description: 'Payment due within 45 days' },
    { name: 'Net 60', days: 60, description: 'Payment due within 60 days' },
    { name: 'Net 90', days: 90, description: 'Payment due within 90 days' }
  ]

  const validateForm = () => {
    const newErrors = {}

    if (!formData.term_name.trim()) {
      newErrors.term_name = 'Payment term name is required'
    }

    if (formData.term_days < 0) {
      newErrors.term_days = 'Term days cannot be negative'
    }

    if (formData.term_days > 365) {
      newErrors.term_days = 'Term days cannot exceed 365'
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
      // Ensure we have company_id
      if (!company?.id) {
        throw new Error('Company ID is required')
      }

      const paymentTermData = {
        term_name: formData.term_name.trim(),
        term_days: parseInt(formData.term_days) || 0,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        company_id: company.id
      }

      console.log('Saving payment term data:', paymentTermData)

      let result
      if (paymentTerm?.id) {
        // Update existing payment term
        result = await supabase
          .from('payment_terms')
          .update(paymentTermData)
          .eq('id', paymentTerm.id)
          .select()
      } else {
        // Create new payment term
        result = await supabase
          .from('payment_terms')
          .insert([paymentTermData])
          .select()
      }

      console.log('Supabase result:', result)

      if (result.error) {
        console.error('Supabase error:', result.error)
        throw result.error
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('No data returned from save operation')
      }

      success(
        paymentTerm?.id ? 'Payment term updated successfully' : 'Payment term created successfully'
      )

      onSave?.(result.data[0])
    } catch (err) {
      console.error('Error saving payment term:', err)
      error(err.message || 'Failed to save payment term')
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

  const selectCommonTerm = (term) => {
    setFormData(prev => ({
      ...prev,
      term_name: term.name,
      term_days: term.days,
      description: term.description
    }))
    // Clear errors when selecting common term
    setErrors({})
  }

  const getDueDatePreview = () => {
    if (formData.term_days === 0) return 'Due immediately'
    
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + parseInt(formData.term_days))
    return `Due on ${dueDate.toLocaleDateString()}`
  }

  const getCashFlowImpact = () => {
    const days = parseInt(formData.term_days) || 0
    if (days === 0) return { impact: 'Excellent', color: 'text-green-600', description: 'Immediate cash flow' }
    if (days <= 15) return { impact: 'Good', color: 'text-blue-600', description: 'Quick cash flow' }
    if (days <= 30) return { impact: 'Standard', color: 'text-yellow-600', description: 'Normal cash flow' }
    if (days <= 60) return { impact: 'Moderate', color: 'text-orange-600', description: 'Delayed cash flow' }
    return { impact: 'Poor', color: 'text-red-600', description: 'Slow cash flow' }
  }

  const cashFlowImpact = getCashFlowImpact()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Payment Term Details">
        {/* Common Terms Quick Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Select Common Payment Terms
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {commonTerms.map((term, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectCommonTerm(term)}
                className="text-xs justify-start"
              >
                {term.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Term Name" required>
            <Input
              value={formData.term_name}
              onChange={(e) => handleChange('term_name', e.target.value)}
              placeholder="e.g., Net 30, Due on Receipt"
              error={!!errors.term_name}
            />
            <ValidationMessage message={errors.term_name} />
          </FormField>

          <FormField label="Payment Days" required>
            <Input
              type="number"
              value={formData.term_days}
              onChange={(e) => handleChange('term_days', e.target.value)}
              placeholder="30"
              min="0"
              max="365"
              error={!!errors.term_days}
            />
            <ValidationMessage message={errors.term_days} />
            <div className="text-xs text-gray-500 mt-1">
              Number of days from invoice date to payment due date
            </div>
          </FormField>

          <FormField label="Description" className="md:col-span-2">
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the payment terms"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FormField>

          <FormField label="Status" className="md:col-span-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Active payment term
              </label>
            </div>
          </FormField>
        </div>

        {/* Payment Term Preview */}
        {formData.term_name && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Payment Term Preview</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div><strong>Term:</strong> {formData.term_name}</div>
                  <div><strong>Payment Days:</strong> {formData.term_days} days</div>
                  <div><strong>Description:</strong> {formData.description || 'No description'}</div>
                  <div><strong>Status:</strong> {formData.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div>
                  <div><strong>Example:</strong> Invoice dated today would be {getDueDatePreview()}</div>
                  <div><strong>Cash Flow Impact:</strong> <span className={cashFlowImpact.color}>{cashFlowImpact.impact}</span></div>
                  <div className="text-xs text-gray-500">{cashFlowImpact.description}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow Analysis */}
        {formData.term_days > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Cash Flow Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
              <div>
                <div className="font-medium">Working Capital Impact</div>
                <div>₹1,00,000 invoice = {formData.term_days} days delay</div>
                <div>Annual impact: ₹{((1000000 * formData.term_days) / 365).toLocaleString()} tied up</div>
              </div>
              <div>
                <div className="font-medium">Interest Cost</div>
                <div>At 12% annual rate</div>
                <div>Cost per invoice: ₹{((100000 * 0.12 * formData.term_days) / 365).toFixed(0)}</div>
              </div>
              <div>
                <div className="font-medium">Collection Risk</div>
                <div>{formData.term_days <= 30 ? 'Low' : formData.term_days <= 60 ? 'Medium' : 'High'} risk</div>
                <div>Longer terms = higher default risk</div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms Examples */}
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Common Payment Terms Examples</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
            <div>
              <div className="font-medium">Standard Terms</div>
              <div>• Net 30: Payment due in 30 days</div>
              <div>• Net 15: Payment due in 15 days</div>
              <div>• Due on Receipt: Payment due immediately</div>
              <div>• COD: Cash on delivery</div>
            </div>
            <div>
              <div className="font-medium">Extended Terms</div>
              <div>• Net 45: Payment due in 45 days</div>
              <div>• Net 60: Payment due in 60 days</div>
              <div>• Net 90: Payment due in 90 days</div>
              <div>• Net 120: For enterprise customers</div>
            </div>
          </div>
        </div>

        {/* Industry Best Practices */}
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Industry Best Practices</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <div>• <strong>Retail/B2C:</strong> Immediate payment or Net 7</div>
            <div>• <strong>Small Business:</strong> Net 15 to Net 30</div>
            <div>• <strong>Corporate/B2B:</strong> Net 30 to Net 45</div>
            <div>• <strong>Government:</strong> Net 30 to Net 90</div>
            <div>• <strong>Construction:</strong> Net 30 with progress payments</div>
            <div>• <strong>Wholesale:</strong> Net 30 with early payment discounts</div>
          </div>
        </div>
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
          {paymentTerm?.id ? 'Update Payment Term' : 'Create Payment Term'}
        </Button>
      </div>
    </form>
  )
}

export default PaymentTermsForm
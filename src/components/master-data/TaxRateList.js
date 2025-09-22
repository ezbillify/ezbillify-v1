// src/components/master-data/TaxRateList.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import Modal from '../shared/ui/Modal'

const TaxRateList = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [taxRates, setTaxRates] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTaxRate, setEditingTaxRate] = useState(null)

  const [formData, setFormData] = useState({
    tax_name: '',
    tax_type: 'gst',
    tax_rate: '',
    cgst_rate: '',
    sgst_rate: '',
    igst_rate: '',
    cess_rate: '',
    is_default: false
  })

  useEffect(() => {
    if (company?.id) {
      loadTaxRates()
    }
  }, [company])

  const loadTaxRates = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/master-data/tax-rates?company_id=${company.id}`)
      const result = await response.json()
      
      if (result.success) {
        setTaxRates(result.data)
      } else {
        error('Failed to load tax rates')
      }
    } catch (err) {
      console.error('Error loading tax rates:', err)
      error('Failed to load tax rates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/master-data/tax-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: company.id,
          ...formData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        success('Tax rate saved successfully')
        setShowForm(false)
        resetForm()
        loadTaxRates()
      } else {
        error(result.error || 'Failed to save tax rate')
      }
    } catch (err) {
      console.error('Error saving tax rate:', err)
      error('Failed to save tax rate')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tax_name: '',
      tax_type: 'gst',
      tax_rate: '',
      cgst_rate: '',
      sgst_rate: '',
      igst_rate: '',
      cess_rate: '',
      is_default: false
    })
    setEditingTaxRate(null)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-calculate GST rates if total rate is entered
    if (field === 'tax_rate' && formData.tax_type === 'gst') {
      const rate = parseFloat(value) || 0
      const halfRate = rate / 2
      setFormData(prev => ({
        ...prev,
        cgst_rate: halfRate,
        sgst_rate: halfRate,
        igst_rate: rate
      }))
    }
  }

  const commonTaxRates = [
    { name: 'GST 0%', rate: 0 },
    { name: 'GST 5%', rate: 5 },
    { name: 'GST 12%', rate: 12 },
    { name: 'GST 18%', rate: 18 },
    { name: 'GST 28%', rate: 28 },
  ]

  const quickAddTaxRate = (rate) => {
    setFormData({
      tax_name: `GST ${rate}%`,
      tax_type: 'gst',
      tax_rate: rate,
      cgst_rate: rate / 2,
      sgst_rate: rate / 2,
      igst_rate: rate,
      cess_rate: 0,
      is_default: rate === 18 // Make 18% default
    })
    setShowForm(true)
  }

  if (loading && taxRates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading tax rates...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tax Rates</h2>
          <p className="text-gray-600 mt-1">
            Manage GST rates and other tax configurations for invoicing
          </p>
        </div>
        
        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
        >
          Add Tax Rate
        </Button>
      </div>

      {/* Quick Add Common Rates */}
      {taxRates.length === 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup</h3>
          <p className="text-gray-600 mb-4">Add common GST rates to get started quickly:</p>
          <div className="flex flex-wrap gap-2">
            {commonTaxRates.map(rate => (
              <Button
                key={rate.rate}
                onClick={() => quickAddTaxRate(rate.rate)}
                variant="outline"
                size="sm"
              >
                {rate.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Tax Rates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {taxRates.map(taxRate => (
          <Card key={taxRate.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{taxRate.tax_name}</h3>
                  {taxRate.is_default && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-1">{taxRate.tax_rate}%</p>
                
                {taxRate.tax_type === 'gst' && (
                  <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <div>CGST: {taxRate.cgst_rate}%</div>
                    <div>SGST: {taxRate.sgst_rate}%</div>
                    <div>IGST: {taxRate.igst_rate}%</div>
                    {taxRate.cess_rate > 0 && <div>Cess: {taxRate.cess_rate}%</div>}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => {
                    setFormData(taxRate)
                    setEditingTaxRate(taxRate)
                    setShowForm(true)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tax Rate Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title={editingTaxRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Name *
            </label>
            <input
              type="text"
              value={formData.tax_name}
              onChange={(e) => handleInputChange('tax_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., GST 18%"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Type
            </label>
            <select
              value={formData.tax_type}
              onChange={(e) => handleInputChange('tax_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="gst">GST</option>
              <option value="vat">VAT</option>
              <option value="service_tax">Service Tax</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Tax Rate (%) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.tax_rate}
              onChange={(e) => handleInputChange('tax_rate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="18"
              required
            />
          </div>

          {formData.tax_type === 'gst' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CGST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cgst_rate}
                  onChange={(e) => handleInputChange('cgst_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SGST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sgst_rate}
                  onChange={(e) => handleInputChange('sgst_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IGST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.igst_rate}
                  onChange={(e) => handleInputChange('igst_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="18"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cess Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cess_rate}
                  onChange={(e) => handleInputChange('cess_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => handleInputChange('is_default', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
              Set as default tax rate
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              {editingTaxRate ? 'Update' : 'Create'} Tax Rate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TaxRateList
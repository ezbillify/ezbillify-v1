// src/components/others/DocumentNumbering.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

const DocumentNumbering = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sequences, setSequences] = useState([])

  // Document types from your schema
  const documentTypes = [
    { type: 'invoice', label: 'Sales Invoice', defaultPrefix: 'INV-' },
    { type: 'quote', label: 'Quotation', defaultPrefix: 'QUO-' },
    { type: 'sales_order', label: 'Sales Order', defaultPrefix: 'SO-' },
    { type: 'purchase_order', label: 'Purchase Order', defaultPrefix: 'PO-' },
    { type: 'bill', label: 'Purchase Bill', defaultPrefix: 'BILL-' },
    { type: 'payment_received', label: 'Payment Received', defaultPrefix: 'PR-' },
    { type: 'payment_made', label: 'Payment Made', defaultPrefix: 'PM-' },
    { type: 'credit_note', label: 'Credit Note', defaultPrefix: 'CN-' },
    { type: 'debit_note', label: 'Debit Note', defaultPrefix: 'DN-' }
  ]

  useEffect(() => {
    loadDocumentSequences()
  }, [company])

  const loadDocumentSequences = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/settings/document-numbering?company_id=${company.id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setSequences(result.data || [])
      } else {
        error(result.error || 'Failed to load document numbering settings')
      }
    } catch (err) {
      console.error('Error loading sequences:', err)
      error('Failed to load document numbering settings')
    } finally {
      setLoading(false)
    }
  }

  const getSequenceForType = (documentType) => {
    const existingSequence = sequences.find(seq => seq.document_type === documentType)
    
    if (existingSequence) {
      return existingSequence
    }
    
    // Return default sequence for new document types
    const docTypeInfo = documentTypes.find(dt => dt.type === documentType)
    return {
      document_type: documentType,
      prefix: docTypeInfo?.defaultPrefix || '',
      suffix: '',
      current_number: 1,
      padding_zeros: 3,
      reset_yearly: true,
      sample_format: ''
    }
  }

  const updateSequence = (documentType, field, value) => {
    setSequences(currentSequences => {
      const existingIndex = currentSequences.findIndex(seq => seq.document_type === documentType)
      const currentSequence = existingIndex >= 0 
        ? currentSequences[existingIndex] 
        : getSequenceForType(documentType)
      
      const updatedSequence = {
        ...currentSequence,
        [field]: value
      }
      
      // Generate sample format with updated values
      updatedSequence.sample_format = generateSampleFormat(updatedSequence)
      
      if (existingIndex >= 0) {
        // Update existing sequence
        const newSequences = [...currentSequences]
        newSequences[existingIndex] = updatedSequence
        return newSequences
      } else {
        // Add new sequence
        return [...currentSequences, updatedSequence]
      }
    })
  }

  const generateSampleFormat = (sequence) => {
    const paddedNumber = sequence.current_number.toString().padStart(sequence.padding_zeros || 3, '0')
    let result = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
    
    if (sequence.reset_yearly) {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
      
      // Financial year calculation (April to March)
      let fyStartYear, fyEndYear
      if (currentMonth >= 4) {
        // April to December - current FY
        fyStartYear = currentYear
        fyEndYear = currentYear + 1
      } else {
        // January to March - previous FY
        fyStartYear = currentYear - 1
        fyEndYear = currentYear
      }
      
      const fyStartYearShort = fyStartYear.toString().slice(-2)
      const fyEndYearShort = fyEndYear.toString().slice(-2)
      
      result += ` (FY ${fyStartYearShort}-${fyEndYearShort})`
    }
    
    return result
  }

  const saveSettings = async () => {
    if (!company?.id) {
      error('Company information not available')
      return
    }
    
    // Validate sequences
    const invalidSequences = sequences.filter(seq => 
      !seq.current_number || seq.current_number < 1 || seq.padding_zeros < 1
    )
    
    if (invalidSequences.length > 0) {
      error('Please ensure all current numbers are greater than 0 and padding is valid')
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch('/api/settings/document-numbering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: company.id,
          sequences: sequences
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        success('Document numbering settings saved successfully')
        await loadDocumentSequences() // Reload to get updated data
      } else {
        error(result.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Error saving sequences:', err)
      error('Failed to save document numbering settings')
    } finally {
      setSaving(false)
    }
  }

  const resetSequence = (documentType) => {
    const docTypeInfo = documentTypes.find(dt => dt.type === documentType)
    const docTypeName = docTypeInfo?.label || documentType
    
    if (!confirm(`Are you sure you want to reset the ${docTypeName} numbering? This will set the current number back to 1.`)) {
      return
    }

    updateSequence(documentType, 'current_number', 1)
  }

  if (loading && sequences.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading document numbering settings...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Numbering</h1>
          <p className="text-gray-600 mt-1">
            Configure automatic numbering for invoices, quotations, and other documents
          </p>
        </div>
        
        <Button
          onClick={saveSettings}
          loading={saving}
          disabled={saving || loading}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {documentTypes.map(docType => {
          const sequence = getSequenceForType(docType.type)
          
          return (
            <Card key={docType.type} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {docType.label}
                </h3>
                <Button
                  onClick={() => resetSequence(docType.type)}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                >
                  Reset
                </Button>
              </div>

              <div className="space-y-4">
                {/* Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={sequence.prefix || ''}
                    onChange={(e) => updateSequence(docType.type, 'prefix', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., INV-"
                    disabled={saving}
                  />
                </div>

                {/* Current Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={sequence.current_number || 1}
                      onChange={(e) => updateSequence(docType.type, 'current_number', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding Zeros
                    </label>
                    <select
                      value={sequence.padding_zeros || 3}
                      onChange={(e) => updateSequence(docType.type, 'padding_zeros', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    >
                      <option value={1}>1 (1, 2, 3...)</option>
                      <option value={2}>2 (01, 02, 03...)</option>
                      <option value={3}>3 (001, 002, 003...)</option>
                      <option value={4}>4 (0001, 0002, 0003...)</option>
                      <option value={5}>5 (00001, 00002, 00003...)</option>
                    </select>
                  </div>
                </div>

                {/* Suffix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    value={sequence.suffix || ''}
                    onChange={(e) => updateSequence(docType.type, 'suffix', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., /24"
                    disabled={saving}
                  />
                </div>

                {/* Reset Yearly */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`reset_yearly_${docType.type}`}
                    checked={sequence.reset_yearly || false}
                    onChange={(e) => updateSequence(docType.type, 'reset_yearly', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={saving}
                  />
                  <label htmlFor={`reset_yearly_${docType.type}`} className="ml-2 block text-sm text-gray-700">
                    Reset numbering every financial year
                  </label>
                </div>

                {/* Sample Format */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Format
                  </label>
                  <div className="text-sm font-mono text-gray-900 bg-white p-2 rounded border">
                    {generateSampleFormat(sequence)}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Financial Year Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Financial Year Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              Financial year runs from April 1st to March 31st. Document numbering will automatically reset for each financial year if "Reset yearly" is enabled.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default DocumentNumbering
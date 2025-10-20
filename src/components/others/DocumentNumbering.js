// src/components/others/DocumentNumbering.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import Input from '../shared/ui/Input'
import Select from '../shared/ui/Select'
import ConfirmDialog from '../shared/feedback/ConfirmDialog'

const DocumentNumbering = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [sequences, setSequences] = useState([])
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Document types from your schema
  const documentTypes = [
    { type: 'invoice', label: 'Sales Invoice', defaultPrefix: 'INV-' },
    { type: 'quote', label: 'Quotation', defaultPrefix: 'QUO-' },
    { type: 'sales_order', label: 'Sales Order', defaultPrefix: 'SO-' },
    { type: 'purchase_order', label: 'Purchase Order', defaultPrefix: 'PO-' },
    { type: 'bill', label: 'Purchase Bill', defaultPrefix: 'BILL-' },
    { type: 'grn', label: 'Goods Receipt Note', defaultPrefix: 'GRN-' },
    { type: 'payment_received', label: 'Payment Received', defaultPrefix: 'PR-' },
    { type: 'payment_made', label: 'Payment Made', defaultPrefix: 'PM-' },
    { type: 'credit_note', label: 'Credit Note', defaultPrefix: 'CN-' },
    { type: 'debit_note', label: 'Debit Note', defaultPrefix: 'DN-' }
  ]

  useEffect(() => {
    if (company?.id) {
      loadBranches()
    }
  }, [company?.id])

  useEffect(() => {
    if (selectedBranch?.id) {
      loadDocumentSequences()
    }
  }, [selectedBranch?.id])

  const loadBranches = async () => {
    if (!company?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/branches?company_id=${company.id}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setBranches(result.data)

        // Set default branch as selected
        const defaultBranch = result.data.find(b => b.is_default)
        if (defaultBranch) {
          setSelectedBranch(defaultBranch)
        } else if (result.data.length > 0) {
          setSelectedBranch(result.data[0])
        }
      }
    } catch (err) {
      console.error('Error loading branches:', err)
      error('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentSequences = async () => {
    if (!company?.id || !selectedBranch?.id) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/settings/document-numbering?company_id=${company.id}&branch_id=${selectedBranch.id}`
      )

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
      padding_zeros: 4,
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
    const branchPrefix = selectedBranch?.document_prefix || ''
    const paddedNumber = sequence.current_number.toString().padStart(sequence.padding_zeros || 4, '0')
    
    // Start with branch prefix and document prefix
    let result = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}`

    // Add suffix if it exists
    if (sequence.suffix) {
      result += sequence.suffix
    }

    // If reset_yearly is enabled, add financial year suffix
    if (sequence.reset_yearly) {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

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

      result += `/${fyStartYearShort}-${fyEndYearShort}`
    }

    return result
  }

  const saveSettings = async () => {
    console.log('💾 Save button clicked')

    if (!company?.id || !selectedBranch?.id) {
      console.error('❌ Missing company or branch')
      error('Company or branch information not available')
      return
    }

    // BUILD COMPLETE SEQUENCES ARRAY - INCLUDING ALL DOCUMENT TYPES
    // This ensures even unmodified sequences are saved
    const allSequences = documentTypes.map(docType => {
      const sequence = getSequenceForType(docType.type)
      return {
        document_type: sequence.document_type,
        prefix: sequence.prefix,
        suffix: sequence.suffix,
        current_number: sequence.current_number,
        padding_zeros: sequence.padding_zeros,
        reset_yearly: sequence.reset_yearly
        // Don't include sample_format - it's for display only
      }
    })

    console.log('📋 Total sequences to save:', allSequences.length, allSequences)

    // Validate sequences
    const invalidSequences = allSequences.filter(seq =>
      !seq.current_number || seq.current_number < 1 || seq.padding_zeros < 1
    )

    if (invalidSequences.length > 0) {
      console.error('❌ Invalid sequences:', invalidSequences)
      error('Please ensure all current numbers are greater than 0 and padding is valid')
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: company.id,
        branch_id: selectedBranch.id,
        sequences: allSequences
      }

      console.log('📤 Sending payload to API:', JSON.stringify(payload, null, 2))

      const response = await fetch('/api/settings/document-numbering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('📬 Response status:', response.status)
      const result = await response.json()
      console.log('📬 Response body:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Unknown error')
      }

      if (result.success) {
        console.log('✅ Save successful!')
        success(`Document numbering settings saved successfully for ${selectedBranch.name}`)
        await loadDocumentSequences() // Reload to get updated data
      } else {
        console.error('❌ API returned error:', result.error)
        error(result.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('❌ Error saving sequences:', err)
      error('Failed to save document numbering settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetSequence = (documentType) => {
    const docTypeInfo = documentTypes.find(dt => dt.type === documentType)
    const docTypeName = docTypeInfo?.label || documentType

    setConfirmDialog({
      isOpen: true,
      title: 'Reset Document Numbering',
      message: `Are you sure you want to reset the ${docTypeName} numbering for ${selectedBranch?.name}? This will set the current number back to 1.`,
      onConfirm: () => {
        updateSequence(documentType, 'current_number', 1)
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })
      }
    })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })
  }

  const handleBranchChange = (e) => {
    try {
      // Handle different event types from Select component
      const selectedId = e?.target?.value || e?.value || e

      if (selectedId) {
        const branch = branches.find(b => String(b.id) === String(selectedId))
        if (branch) {
          setSelectedBranch(branch)
        } else {
          console.warn('❌ Branch not found for id:', selectedId)
        }
      }
    } catch (err) {
      console.error('❌ Error changing branch:', err)
    }
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
          disabled={saving || loading || !selectedBranch}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Branch Selector - HIGHEST Z-INDEX */}
      {branches.length > 0 && (
        <div className="relative z-[9999]">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-end gap-6">
              <div className="flex-1">
                <Select
                  label="Select Branch to Configure"
                  name="branch_selector"
                  value={selectedBranch?.id ? String(selectedBranch.id) : ''}
                  onChange={handleBranchChange}
                  options={branches.map(branch => ({
                    value: String(branch.id),
                    label: `${branch.name} ${branch.is_default ? '(Default)' : ''}`
                  }))}
                  disabled={saving}
                />
              </div>

              {selectedBranch && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">Branch Prefix</p>
                  <p className="text-lg font-mono font-bold text-blue-600 mt-1">
                    {selectedBranch.document_prefix}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Grid - LOWER Z-INDEX */}
      {selectedBranch && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-0">
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
                    <Input
                      label="Document Prefix"
                      name={`prefix_${docType.type}`}
                      value={sequence.prefix || ''}
                      onChange={(e) => updateSequence(docType.type, 'prefix', e.target.value)}
                      placeholder="e.g., INV-"
                      disabled={saving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Full format: {selectedBranch.document_prefix}-{sequence.prefix || 'PREFIX'}-####
                    </p>
                  </div>

                  {/* Current Number & Padding */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Current Number"
                      name={`current_number_${docType.type}`}
                      type="number"
                      min="1"
                      value={sequence.current_number || 1}
                      onChange={(e) => updateSequence(docType.type, 'current_number', Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={saving}
                    />

                    <Select
                      label="Padding Zeros"
                      name={`padding_${docType.type}`}
                      value={sequence.padding_zeros || 4}
                      onChange={(e) => updateSequence(docType.type, 'padding_zeros', parseInt(e.target.value))}
                      disabled={saving}
                      options={[
                        { value: 1, label: '1 (1, 2, 3...)' },
                        { value: 2, label: '2 (01, 02, 03...)' },
                        { value: 3, label: '3 (001, 002, 003...)' },
                        { value: 4, label: '4 (0001, 0002, 0003...)' },
                        { value: 5, label: '5 (00001, 00002, 00003...)' }
                      ]}
                    />
                  </div>

                  {/* Suffix */}
                  <div>
                    <Input
                      label="Suffix (Financial Year)"
                      name={`suffix_${docType.type}`}
                      value={sequence.suffix || ''}
                      onChange={(e) => updateSequence(docType.type, 'suffix', e.target.value)}
                      placeholder="e.g., /25-26"
                      disabled={saving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for automatic FY suffix
                    </p>
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
                  <div className="bg-gray-50 p-3 rounded-md border-2 border-blue-200">
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
      )}

      {/* Financial Year Info - LOWER Z-INDEX */}
      <Card className="p-4 bg-blue-50 border-blue-200 relative z-0">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Document Numbering Format</h4>
            <p className="text-sm text-blue-700 mt-1">
              Format: <span className="font-mono font-bold">{'{Branch}-{Type}-{Number}{Suffix}'}</span>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Example: <span className="font-mono font-bold">MUM-INV-0001/25-26</span>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Financial year runs from April 1st to March 31st. Document numbering will automatically reset for each financial year if "Reset yearly" is enabled.
            </p>
          </div>
        </div>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
        confirmText="Reset"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  )
}

export default DocumentNumbering
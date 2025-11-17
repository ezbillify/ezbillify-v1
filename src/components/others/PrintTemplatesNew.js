// src/components/others/PrintTemplatesNew.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import Select from '../shared/ui/Select'
import { templateDefinitions } from './PrintTemplateDefinitions'

const PrintTemplatesNew = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPaperSize, setSelectedPaperSize] = useState('A4')
  const [selectedDocumentType, setSelectedDocumentType] = useState('invoice')
  const [currentTemplates, setCurrentTemplates] = useState({})
  const [templatePreviews, setTemplatePreviews] = useState({})

  // Document types with their common paper size preferences
  const documentTypes = [
    { 
      type: 'invoice', 
      label: 'Sales Invoice',
      commonPaperSizes: ['A4', '80mm', '58mm']
    },
    { 
      type: 'quotation', 
      label: 'Quotation',
      commonPaperSizes: ['A4', '80mm']
    },
    { 
      type: 'sales_order', 
      label: 'Sales Order',
      commonPaperSizes: ['A4', '80mm']
    },
    { 
      type: 'purchase_order', 
      label: 'Purchase Order',
      commonPaperSizes: ['A4']
    },
    { 
      type: 'bill', 
      label: 'Purchase Bill',
      commonPaperSizes: ['A4', '80mm']
    },
    { 
      type: 'payment_receipt', 
      label: 'Payment Receipt',
      commonPaperSizes: ['A4', '80mm', '58mm']
    }
  ]

  // Paper sizes with their common document types
  const paperSizes = [
    {
      size: 'A4',
      label: 'A4 (210 × 297 mm)',
      description: 'Standard business documents',
      commonDocumentTypes: ['invoice', 'quotation', 'sales_order', 'purchase_order', 'bill', 'payment_receipt']
    },
    {
      size: 'A3',
      label: 'A3 (297 × 420 mm)',
      description: 'Large format documents',
      commonDocumentTypes: ['invoice', 'quotation']
    },
    {
      size: '80mm',
      label: '80mm Thermal',
      description: 'Receipt printer format',
      commonDocumentTypes: ['invoice', 'quotation', 'sales_order', 'bill', 'payment_receipt']
    },
    {
      size: '58mm',
      label: '58mm Thermal',
      description: 'Compact receipt printer format',
      commonDocumentTypes: ['invoice', 'payment_receipt']
    },
    {
      size: 'A5',
      label: 'A5 (148 × 210 mm)',
      description: 'Compact documents',
      commonDocumentTypes: ['invoice', 'quotation']
    }
  ]

  // Load current template assignments
  const loadCurrentTemplates = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/settings/print-templates?company_id=${company.id}`)
      const result = await response.json()
      
      if (result.success) {
        // Group templates by document type
        const templateMap = {}
        result.data?.forEach(template => {
          if (!templateMap[template.document_type]) {
            templateMap[template.document_type] = []
          }
          templateMap[template.document_type].push(template)
        })
        setCurrentTemplates(templateMap)
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
      error('Failed to load template assignments')
    } finally {
      setLoading(false)
    }
  }

  // Load template HTML for preview
  const loadTemplateHTML = async (htmlFile) => {
    try {
      // First try to load the actual file
      const response = await fetch(htmlFile)
      if (response.ok) {
        return await response.text()
      }
      
      // If file doesn't exist, return a basic template
      console.log(`Template file not found: ${htmlFile}, using fallback`)
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Template Preview</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Template Preview</h1>
            <p>File: ${htmlFile}</p>
            <p>Document Type: ${selectedDocumentType}</p>
            <p>Paper Size: ${selectedPaperSize}</p>
          </div>
        </body>
        </html>
      `
    } catch (error) {
      console.error('Template loading error:', error)
      // Return a basic template as fallback
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Template Preview</title>
        </head>
        <body>
          <h1>Template Preview</h1>
          <p>Error loading template: ${error.message}</p>
        </body>
        </html>
      `
    }
  }

  // Get available templates for selected document type grouped by paper size
  const getTemplatesByPaperSize = () => {
    const templates = Object.entries(templateDefinitions)
      .map(([key, template]) => ({
        key,
        ...template
      }))
      .filter(template => {
        // Get currently assigned templates for this document type
        const assignedTemplates = getCurrentTemplates(selectedDocumentType)
        
        // If we already have 2 templates and this paper size is not one of them, don't show it
        if (assignedTemplates.length >= 2 && 
            !assignedTemplates.find(t => t.paper_size === template.paperSize)) {
          return false
        }
        
        return true
      })
    
    // Group by paper size
    const grouped = {}
    templates.forEach(template => {
      if (!grouped[template.paperSize]) {
        grouped[template.paperSize] = []
      }
      grouped[template.paperSize].push(template)
    })
    
    return grouped
  }

  // Remove assigned template
  const removeTemplate = async (templateId) => {
    if (!company?.id) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/settings/print-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      })
      
      const result = await response.json()
      
      if (result.success) {
        success('Template removed successfully')
        await loadCurrentTemplates()
      } else {
        error(result.error || 'Failed to remove template')
      }
    } catch (err) {
      console.error('Remove error:', err)
      error('Failed to remove template: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Assign template to document type
  const assignTemplate = async (templateKey, documentType) => {
    if (!company?.id) return
    
    setSaving(true)
    try {
      const templateDef = templateDefinitions[templateKey]
      if (!templateDef) {
        error('Template not found')
        setSaving(false)
        return
      }
      
      // Check if we already have 2 templates assigned for this document type
      const assignedTemplates = getCurrentTemplates(documentType)
      const samePaperSizeTemplate = assignedTemplates.find(t => t.paper_size === templateDef.paperSize)
      
      // If we're trying to assign a template with the same paper size, remove the existing one first
      if (samePaperSizeTemplate) {
        await removeTemplate(samePaperSizeTemplate.id)
      }
      // If we already have 2 different paper sizes, show an error
      else if (assignedTemplates.length >= 2) {
        error('Maximum 2 formats allowed per document type. Remove an existing format first.')
        setSaving(false)
        return
      }
      
      // Load the HTML template
      const templateHTML = await loadTemplateHTML(templateDef.htmlFile)
      
      const templateData = {
        company_id: company.id,
        template_name: `${documentTypes.find(d => d.type === documentType)?.label} - ${templateDef.name}`,
        document_type: documentType,
        template_type: 'predefined',
        template_html: templateHTML,
        paper_size: templateDef.paperSize,
        orientation: templateDef.paperSize === 'A3' ? 'landscape' : 'portrait',
        template_config: JSON.stringify({ 
          templateKey, 
          htmlFile: templateDef.htmlFile,
          paperSize: templateDef.paperSize,
          documentType: templateDef.documentType
        }),
        is_default: true,
        is_active: true
      }
      
      const response = await fetch('/api/settings/print-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        success(`Template assigned to ${documentTypes.find(d => d.type === documentType)?.label}`)
        await loadCurrentTemplates()
      } else {
        error(result.error || 'Failed to assign template')
      }
    } catch (err) {
      console.error('Assignment error:', err)
      error('Failed to assign template: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Get current templates for document type
  const getCurrentTemplates = (documentType) => {
    return currentTemplates[documentType] || []
  }

  // Load template preview
  const loadPreview = async (templateKey) => {
    if (templatePreviews[templateKey]) {
      // Already loaded
      return
    }
    
    try {
      const templateDef = templateDefinitions[templateKey]
      if (!templateDef) return
      
      const html = await loadTemplateHTML(templateDef.htmlFile)
      setTemplatePreviews(prev => ({
        ...prev,
        [templateKey]: html
      }))
    } catch (err) {
      console.error('Preview load error:', err)
    }
  }

  // Open preview window
  const openPreview = async (templateKey) => {
    const templateDef = templateDefinitions[templateKey]
    if (!templateDef) return
    
    try {
      // Load preview if not already loaded
      if (!templatePreviews[templateKey]) {
        await loadPreview(templateKey)
      }
      
      const previewHTML = templatePreviews[templateKey] || await loadTemplateHTML(templateDef.htmlFile)

      // Create realistic sample data with branch info (no currency symbols)
      const sampleData = {
        // Company & Branch
        COMPANY_NAME: 'ABC Enterprises Pvt. Ltd.',
        COMPANY_GSTIN: '07ABCDE1234F1Z5',
        COMPANY_LOGO: '',
        BRANCH_NAME: 'Delhi Branch',
        BRANCH_ADDRESS: '123 Business Street, Connaught Place, New Delhi, Delhi, 110001',
        BRANCH_PHONE: '011-12345678',
        BRANCH_EMAIL: 'delhi@abcenterprises.com',

        // Document
        DOCUMENT_TYPE: 'Sales Invoice',
        DOCUMENT_NUMBER: 'DEL/INV/2024/001',
        DOCUMENT_DATE: '27 Oct 2024',
        DUE_DATE: '26 Nov 2024',
        REFERENCE_NUMBER: 'PO-2024-123',
        PLACE_OF_SUPPLY: 'Delhi',

        // Customer
        CUSTOMER_NAME: 'XYZ Corporation Ltd.',
        CUSTOMER_ADDRESS: '456 Client Avenue, Business District, Mumbai, Maharashtra, 400001',
        CUSTOMER_GSTIN: '27XYZAB5678C1Z9',
        CUSTOMER_PHONE: '022-87654321',
        CUSTOMER_EMAIL: 'accounts@xyzcorp.com',

        // Items table (generate HTML rows)
        ITEMS_TABLE: `
          <tr>
            <td class="text-center">1</td>
            <td>Product A - High Quality</td>
            <td>8471</td>
            <td class="text-center">2</td>
            <td>PCS</td>
            <td class="text-right">5,000.00</td>
            <td class="text-center">18%</td>
            <td class="text-right">10,000.00</td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td>Product B - Standard</td>
            <td>8471</td>
            <td class="text-center">1</td>
            <td>PCS</td>
            <td class="text-right">3,000.00</td>
            <td class="text-center">18%</td>
            <td class="text-right">3,000.00</td>
          </tr>
        `,

        // Amounts (no currency symbols as per requirement)
        SUBTOTAL: '13,000.00',
        DISCOUNT_AMOUNT: '0.00',
        TAX_AMOUNT: '2,340.00',
        CGST_AMOUNT: '1,170.00',
        SGST_AMOUNT: '1,170.00',
        IGST_AMOUNT: '0.00',
        TOTAL_AMOUNT: '15,340.00',
        AMOUNT_IN_WORDS: 'Fifteen Thousand Three Hundred Forty Only',

        // Optional
        NOTES: 'Please make payment within due date.',
        TERMS_CONDITIONS: '1. Payment due within 30 days\n2. Interest @18% p.a. on delayed payments\n3. Subject to Delhi jurisdiction'
      }

      // Replace placeholders with sample data
      let processedHTML = previewHTML
      for (const [key, value] of Object.entries(sampleData)) {
        const placeholder = `{{${key}}}`
        processedHTML = processedHTML.replace(new RegExp(placeholder, 'g'), value || '')
      }
      
      // Open preview window
      const previewWindow = window.open('', '_blank', 'width=800,height=1000')
      previewWindow.document.write(processedHTML)
      previewWindow.document.close()
    } catch (error) {
      console.error('Preview error:', error)
      error('Failed to generate preview: ' + error.message)
    }
  }

  useEffect(() => {
    loadCurrentTemplates()
  }, [company?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading templates...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Templates</h1>
          <p className="text-gray-600 mt-1">
            Choose professional templates for your documents
          </p>
        </div>
      </div>

      {/* Document Type Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Document Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentTypes.map(docType => {
            const assignedTemplates = getCurrentTemplates(docType.type)
            const isSelected = selectedDocumentType === docType.type
            
            return (
              <button
                key={docType.type}
                onClick={() => setSelectedDocumentType(docType.type)}
                className={`p-4 text-left border-2 rounded-lg transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{docType.label}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Common sizes: {docType.commonPaperSizes.join(', ')}
                </div>
                {assignedTemplates.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    Assigned: {assignedTemplates.length} format{assignedTemplates.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Paper Size Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Paper Size</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {paperSizes.map(paperConfig => {
            // Check if this paper size is common for the selected document type
            const isCommon = documentTypes
              .find(dt => dt.type === selectedDocumentType)
              ?.commonPaperSizes
              .includes(paperConfig.size) || false
            
            const isSelected = selectedPaperSize === paperConfig.size
            
            return (
              <button
                key={paperConfig.size}
                onClick={() => setSelectedPaperSize(paperConfig.size)}
                className={`p-4 text-left border-2 rounded-lg transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isCommon ? 'opacity-60' : ''}`}
              >
                <div className="font-semibold">{paperConfig.label}</div>
                <div className="text-sm text-gray-600 mt-1">{paperConfig.description}</div>
                {!isCommon && (
                  <div className="text-xs text-orange-600 mt-1">Less common for this document</div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Template Gallery */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Available Templates for {documentTypes.find(d => d.type === selectedDocumentType)?.label}
          </h3>
          <div className="text-sm text-gray-600">
            {getCurrentTemplates(selectedDocumentType).length}/2 formats assigned
          </div>
        </div>
        
        {/* Show templates filtered by selected paper size */}
        {(() => {
          const allTemplatesByPaperSize = getTemplatesByPaperSize()
          const templatesForSelectedSize = allTemplatesByPaperSize[selectedPaperSize] || []

          if (templatesForSelectedSize.length === 0) {
            return (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No templates available</h3>
                <p className="text-gray-500">
                  No {selectedPaperSize} templates found for {documentTypes.find(d => d.type === selectedDocumentType)?.label}.
                </p>
              </div>
            )
          }

          // Check if this paper size format is assigned
          const assignedTemplates = getCurrentTemplates(selectedDocumentType)
          const isFormatAssigned = assignedTemplates.some(t => t.paper_size === selectedPaperSize)

          return (
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-3 text-gray-700 border-b pb-2 flex items-center justify-between">
                <span>{selectedPaperSize} Format Templates</span>
                {isFormatAssigned && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Format Assigned
                  </span>
                )}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {templatesForSelectedSize.map(template => (
                  <div key={template.key} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Template Preview */}
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <div className="text-sm text-gray-600 font-medium">{template.name}</div>
                        </div>
                      </div>

                      {/* Preview overlay */}
                      <button
                        onClick={() => openPreview(template.key)}
                        className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100"
                      >
                        <span className="bg-white px-4 py-2 rounded-md text-sm font-medium shadow-lg">
                          Preview Template
                        </span>
                      </button>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Paper: {template.paperSize}
                      </div>

                      {/* Assign Button */}
                      <Button
                        onClick={() => assignTemplate(template.key, selectedDocumentType)}
                        size="sm"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                        className="mt-3 w-full"
                      >
                        Assign Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info message if format already assigned */}
              {isFormatAssigned && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Format Already Assigned</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        A {selectedPaperSize} template is already assigned to this document type. Assigning a new template will replace the current one.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Limit warning if needed */}
              {!isFormatAssigned && assignedTemplates.length >= 2 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900">Format Limit Reached</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        You've assigned 2 formats to this document type. Remove an existing format first to assign a {selectedPaperSize} template.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
        
        {Object.keys(getTemplatesByPaperSize()).length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No templates available</h3>
            <p className="text-gray-500">
              No templates found for {documentTypes.find(d => d.type === selectedDocumentType)?.label}.
            </p>
          </div>
        )}
      </Card>

      {/* Current Assignments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Template Assignments</h3>
        
        <div className="space-y-3">
          {documentTypes.map(docType => {
            // Get all templates assigned to this document type
            const assignedTemplates = getCurrentTemplates(docType.type)
            
            return (
              <div key={docType.type} className="border rounded-lg p-4">
                <div className="font-medium text-gray-900 flex justify-between items-center">
                  <span>{docType.label}</span>
                  <span className="text-sm text-gray-500">
                    {assignedTemplates.length}/2 formats assigned
                  </span>
                </div>
                
                {assignedTemplates.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {assignedTemplates.map(template => (
                      <div 
                        key={template.id} 
                        className="flex justify-between items-center bg-gray-50 p-3 rounded"
                      >
                        <div>
                          <div className="text-sm font-medium">{template.template_name}</div>
                          <div className="text-xs text-gray-600">{template.paper_size}</div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              const config = JSON.parse(template.template_config || '{}')
                              if (config.templateKey) {
                                openPreview(config.templateKey)
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            Preview
                          </Button>
                          <Button
                            onClick={() => removeTemplate(template.id)}
                            size="sm"
                            variant="danger"
                            className="text-xs"
                            disabled={saving}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">No templates assigned</div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Info Panel */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">How to Use Print Templates</h4>
            <div className="text-sm text-blue-700 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>Choose a document type first, then select a paper size</li>
                <li>Preview templates to see which style you prefer</li>
                <li>Click "Assign" to set the template for the selected document type</li>
                <li>Templates automatically apply when printing or generating PDFs</li>
                <li>80mm and 58mm thermal templates are perfect for receipt printers</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PrintTemplatesNew
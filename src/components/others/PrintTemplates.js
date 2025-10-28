// src/components/others/PrintTemplates.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import { templateDefinitions } from './PrintTemplateDefinitions'

const PrintTemplates = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPaperSize, setSelectedPaperSize] = useState('A4')
  const [selectedDocumentType, setSelectedDocumentType] = useState('invoice')
  const [currentTemplates, setCurrentTemplates] = useState({})
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // Document types
  const documentTypes = [
    { type: 'invoice', label: 'Sales Invoice' },
    { type: 'quotation', label: 'Quotation' },
    { type: 'sales_order', label: 'Sales Order' },
    { type: 'purchase_order', label: 'Purchase Order' },
    { type: 'bill', label: 'Purchase Bill' },
    { type: 'payment_receipt', label: 'Payment Receipt' }
  ]

  // Paper sizes with available templates
  const paperSizes = [
    {
      size: 'A4',
      label: 'A4 (210 × 297 mm)',
      description: 'Standard business documents',
      templates: ['default', 'gst-compatible', 'modern']
    },
    {
      size: 'A3',
      label: 'A3 (297 × 420 mm)',
      description: 'Large format documents',
      templates: ['default', 'gst-compatible', 'modern']
    },
    {
      size: 'A5',
      label: 'A5 (148 × 210 mm)',
      description: 'Compact documents',
      templates: ['default', 'gst-compatible', 'modern']
    },
    {
      size: '80mm',
      label: '80mm Thermal',
      description: 'Receipt printer format',
      templates: ['basic', 'detailed']
    },
    {
      size: '58mm',
      label: '58mm Thermal',
      description: 'Compact receipt printer',
      templates: ['basic', 'detailed']
    }
  ]

  // Function to load template HTML from file
  const loadTemplateHTML = async (htmlFile) => {
    console.log('📁 Loading template from:', htmlFile)
    try {
      const response = await fetch(htmlFile)
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`)
      }
      return await response.text()
    } catch (error) {
      console.error('❌ Template loading error:', error)
      throw error
    }
  }

  useEffect(() => {
    loadCurrentTemplates()
  }, [company])

  const loadCurrentTemplates = async () => {
    if (!company?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/settings/print-templates?company_id=${company.id}`)
      const result = await response.json()

      if (result.success) {
        // Convert array to object keyed by document_type
        const templatesObj = {}
        result.data?.forEach(template => {
          templatesObj[template.document_type] = template
        })
        setCurrentTemplates(templatesObj)
      }
    } catch (err) {
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const assignTemplate = async (templateKey, documentType) => {
    console.log('🚀 Starting assignment:', { templateKey, documentType })

    if (!company?.id) {
      console.log('❌ No company ID')
      return
    }

    setSaving(true)
    try {
      const templateDef = templateDefinitions[templateKey]
      if (!templateDef) {
        console.log('❌ Template definition not found:', templateKey)
        error('Template not found')
        return
      }

      console.log('📁 Loading template from:', templateDef.htmlFile)

      // Load the HTML template from file
      const templateHTML = await loadTemplateHTML(templateDef.htmlFile)
      console.log('✅ Template loaded, length:', templateHTML.length)

      const templateData = {
        company_id: company.id,
        template_name: `${documentTypes.find(d => d.type === documentType)?.label} - ${templateDef.name}`,
        document_type: documentType,
        template_type: 'predefined',
        template_html: templateHTML,
        paper_size: templateDef.paperSize,
        orientation: templateDef.orientation,
        template_config: JSON.stringify({ templateKey, htmlFile: templateDef.htmlFile }),
        is_default: true,
        is_active: true
      }

      console.log('📤 Sending to API:', {
        ...templateData,
        template_html: `[HTML length: ${templateHTML.length}]`
      })

      const response = await fetch('/api/settings/print-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      console.log('📥 API Response status:', response.status)
      const result = await response.json()
      console.log('📥 API Result:', result)

      if (result.success) {
        success(`Template assigned to ${documentTypes.find(d => d.type === documentType)?.label}`)
        await loadCurrentTemplates()
      } else {
        error(result.error || 'Failed to assign template')
      }
    } catch (err) {
      console.error('💥 Assignment error:', err)
      error('Failed to assign template: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getCurrentTemplate = (documentType) => {
    return currentTemplates[documentType]
  }

  const openPreview = async (templateKey) => {
    const template = templateDefinitions[templateKey]
    if (!template) return

    try {
      // Load the HTML template
      const templateHTML = await loadTemplateHTML(template.htmlFile)

      // Create realistic sample data with branch info
      const sampleData = {
        // Company & Branch
        COMPANY_NAME: 'ABC Enterprises Pvt. Ltd.',
        COMPANY_GSTIN: '07ABCDE1234F1Z5',
        COMPANY_LOGO: '', // Empty for now
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

      // Replace placeholders
      let processedHTML = templateHTML
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        processedHTML = processedHTML.replace(regex, value || '')
      })

      // Open in new window
      const previewWindow = window.open('', '_blank', 'width=900,height=1200')
      if (previewWindow) {
        previewWindow.document.write(processedHTML)
        previewWindow.document.close()
      }

    } catch (error) {
      console.error('Preview error:', error)
      error('Failed to generate preview: ' + error.message)
    }
  }

  // Get available templates for selected paper size
  const getAvailableTemplates = () => {
    const paperConfig = paperSizes.find(p => p.size === selectedPaperSize)
    if (!paperConfig) return []

    return paperConfig.templates.map(templateId => {
      const key = `${selectedPaperSize}-${templateId}`
      return {
        key,
        ...templateDefinitions[key]
      }
    }).filter(Boolean)
  }

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

      {/* Paper Size Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Paper Size</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paperSizes.map(paperConfig => (
            <button
              key={paperConfig.size}
              onClick={() => setSelectedPaperSize(paperConfig.size)}
              className={`p-4 text-left border-2 rounded-lg transition-all ${
                selectedPaperSize === paperConfig.size
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={saving}
            >
              <div className="font-semibold text-lg">{paperConfig.label}</div>
              <div className="text-sm text-gray-600 mt-1">{paperConfig.description}</div>
              <div className="text-xs text-blue-600 mt-2">
                {paperConfig.templates.length} template{paperConfig.templates.length !== 1 ? 's' : ''} available
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Template Gallery */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Available Templates for {selectedPaperSize}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {getAvailableTemplates().map(template => (
            <div key={template.key} className="border rounded-lg overflow-hidden">
              {/* Template Preview */}
              <div className="aspect-[3/4] bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📄</div>
                    <div className="text-sm text-gray-600">{template.name}</div>
                  </div>
                </div>

                {/* Preview overlay */}
                <button
                  onClick={() => openPreview(template.key)}
                  className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100"
                >
                  <span className="bg-white px-3 py-1 rounded-md text-sm font-medium">
                    Preview
                  </span>
                </button>
              </div>

              {/* Template Info */}
              <div className="p-4">
                <h4 className="font-semibold">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>

                {/* Document Type Selector */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Assign to:</label>
                  <div className="flex">
                    <select
                      value={selectedDocumentType}
                      onChange={(e) => setSelectedDocumentType(e.target.value)}
                      className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded-l-md"
                      disabled={saving}
                    >
                      {documentTypes.map(docType => (
                        <option key={docType.type} value={docType.type}>
                          {docType.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => assignTemplate(template.key, selectedDocumentType)}
                      size="sm"
                      variant="primary"
                      loading={saving}
                      disabled={saving}
                      className="rounded-l-none text-xs"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Assignments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Template Assignments</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentTypes.map(docType => {
            const currentTemplate = getCurrentTemplate(docType.type)

            return (
              <div
                key={docType.type}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{docType.label}</div>
                  <div className="text-sm text-gray-600">
                    {currentTemplate
                      ? `${currentTemplate.template_name} (${currentTemplate.paper_size})`
                      : 'No template assigned'
                    }
                  </div>
                </div>

                {currentTemplate && (
                  <Button
                    onClick={() => {
                      const config = JSON.parse(currentTemplate.template_config || '{}')
                      if (config.templateKey) {
                        openPreview(config.templateKey)
                      }
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Preview
                  </Button>
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
                <li>Choose a paper size based on your printer and needs</li>
                <li>Preview templates to see which style you prefer</li>
                <li>Assign different templates to different document types</li>
                <li>Templates automatically apply when printing or generating PDFs</li>
                <li>80mm thermal templates are perfect for receipt printers</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PrintTemplates

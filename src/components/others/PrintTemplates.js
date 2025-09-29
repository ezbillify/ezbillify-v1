// src/components/others/PrintTemplates.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

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
      templates: ['modern', 'classic', 'professional', 'minimal']
    },
    {
      size: 'A3',
      label: 'A3 (297 × 420 mm)',
      description: 'Large format documents',
      templates: ['landscape-modern', 'landscape-classic', 'detailed-professional']
    },
    {
      size: '80mm',
      label: '80mm Thermal',
      description: 'Receipt printer format',
      templates: ['thermal-compact', 'thermal-detailed']
    },
    {
      size: 'A5',
      label: 'A5 (148 × 210 mm)',
      description: 'Compact documents',
      templates: ['compact-modern', 'compact-classic']
    }
  ]

  // Template definitions - HTML files will be loaded from public/templates/
  const templateDefinitions = {
    // A4 Templates
    'A4-modern': {
      name: 'Modern',
      description: 'Clean contemporary design with color accents',
      thumbnail: '/templates/thumbnails/A4-modern-thumb.jpg',
      htmlFile: '/templates/A4-modern.html',
      paperSize: 'A4'
    },
    'A4-classic': {
      name: 'Classic',
      description: 'Traditional business format',
      thumbnail: '/templates/thumbnails/A4-classic-thumb.jpg', 
      htmlFile: '/templates/A4-classic.html',
      paperSize: 'A4'
    },
    'A4-professional': {
      name: 'Professional',
      description: 'Corporate style with structured layout',
      thumbnail: '/templates/thumbnails/A4-professional-thumb.jpg',
      htmlFile: '/templates/A4-professional.html',
      paperSize: 'A4'
    },
    'A4-minimal': {
      name: 'Minimal',
      description: 'Clean and simple design',
      thumbnail: '/templates/thumbnails/A4-minimal-thumb.jpg',
      htmlFile: '/templates/A4-minimal.html',
      paperSize: 'A4'
    },
    // 80mm Templates
    '80mm-compact': {
      name: 'Compact',
      description: 'Essential information only',
      thumbnail: '/templates/thumbnails/80mm-compact-thumb.jpg',
      htmlFile: '/templates/80mm-compact.html',
      paperSize: '80mm'
    },
    '80mm-detailed': {
      name: 'Detailed', 
      description: 'More comprehensive receipt format',
      thumbnail: '/templates/thumbnails/80mm-detailed-thumb.jpg',
      htmlFile: '/templates/80mm-detailed.html',
      paperSize: '80mm'
    },
    // A3 Templates
    'A3-landscape-modern': {
      name: 'Landscape Modern',
      description: 'Wide format modern design',
      thumbnail: '/templates/thumbnails/A3-landscape-modern-thumb.jpg',
      htmlFile: '/templates/A3-landscape-modern.html',
      paperSize: 'A3'
    },
    'A3-landscape-classic': {
      name: 'Landscape Classic',
      description: 'Traditional wide format',
      thumbnail: '/templates/thumbnails/A3-landscape-classic-thumb.jpg',
      htmlFile: '/templates/A3-landscape-classic.html',
      paperSize: 'A3'
    },
    'A3-detailed-professional': {
      name: 'Detailed Professional',
      description: 'Comprehensive A3 layout',
      thumbnail: '/templates/thumbnails/A3-detailed-professional-thumb.jpg',
      htmlFile: '/templates/A3-detailed-professional.html',
      paperSize: 'A3'
    },
    // A5 Templates
    'A5-compact-modern': {
      name: 'Compact Modern',
      description: 'Small format modern design',
      thumbnail: '/templates/thumbnails/A5-compact-modern-thumb.jpg',
      htmlFile: '/templates/A5-compact-modern.html',
      paperSize: 'A5'
    },
    'A5-compact-classic': {
      name: 'Compact Classic',
      description: 'Traditional small format',
      thumbnail: '/templates/thumbnails/A5-compact-classic-thumb.jpg',
      htmlFile: '/templates/A5-compact-classic.html',
      paperSize: 'A5'
    }
  }

  // Function to load template HTML from file
  const loadTemplateHTML = async (htmlFile) => {
    try {
      const response = await fetch(htmlFile)
      if (!response.ok) throw new Error('Template not found')
      return await response.text()
    } catch (error) {
      console.error('Error loading template:', error)
      return '<html><body><h1>Template not found</h1><p>Please check if the template file exists.</p></body></html>'
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
        template_html: templateHTML, // This was missing!
        paper_size: templateDef.paperSize,
        orientation: templateDef.paperSize === 'A3' ? 'landscape' : 'portrait',
        template_config: JSON.stringify({ templateKey }),
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

  const openPreview = (templateKey) => {
    const template = templateDefinitions[templateKey]
    if (!template) return
    
    const previewWindow = window.open('', '_blank', 'width=800,height=1000')
    previewWindow.document.write(template.html)
    previewWindow.document.close()
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

// Template Generation Functions
function generateModernA4Template() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 15mm; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 11px; 
          line-height: 1.4; 
          color: #2d3748;
          margin: 0;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo { font-size: 24px; font-weight: bold; }
        .company-info { text-align: right; }
        .document-title {
          text-align: center;
          font-size: 28px;
          font-weight: bold;
          color: #4a5568;
          margin: 20px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .bill-ship-section {
          display: flex;
          gap: 20px;
          margin: 25px 0;
        }
        .bill-to, .ship-to {
          flex: 1;
          background: #f7fafc;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #667eea;
        }
        .section-title {
          font-weight: bold;
          color: #4a5568;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 1px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .items-table th {
          background: #4a5568;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
        }
        .items-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .items-table tr:hover {
          background: #f8f9fa;
        }
        .totals-section {
          float: right;
          width: 300px;
          margin-top: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .final-total {
          background: #667eea;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
        }
        .signature {
          text-align: center;
          margin-top: 50px;
          padding-top: 2px;
          border-top: 1px solid #4a5568;
          width: 200px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">{{COMPANY_NAME}}</div>
        <div class="company-info">
          <div>{{COMPANY_ADDRESS}}</div>
          <div>{{COMPANY_PHONE}} | {{COMPANY_EMAIL}}</div>
          <div>GSTIN: {{COMPANY_GSTIN}}</div>
        </div>
      </div>

      <div class="document-title">{{DOCUMENT_TYPE}}</div>

      <div style="display: flex; justify-content: space-between; margin: 20px 0;">
        <div><strong>{{DOCUMENT_TYPE}} #:</strong> {{DOCUMENT_NUMBER}}</div>
        <div><strong>Date:</strong> {{DOCUMENT_DATE}}</div>
        <div><strong>Due Date:</strong> {{DUE_DATE}}</div>
      </div>

      <div class="bill-ship-section">
        <div class="bill-to">
          <div class="section-title">Bill To</div>
          <div><strong>{{CUSTOMER_NAME}}</strong></div>
          <div>{{CUSTOMER_ADDRESS}}</div>
          <div>GSTIN: {{CUSTOMER_GSTIN}}</div>
        </div>
        <div class="ship-to">
          <div class="section-title">Ship To</div>
          <div>{{SHIPPING_ADDRESS}}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>HSN</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Tax</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#ITEMS}}
          <tr>
            <td><strong>{{ITEM_NAME}}</strong><br><small>{{ITEM_DESCRIPTION}}</small></td>
            <td>{{HSN_CODE}}</td>
            <td>{{QUANTITY}} {{UNIT}}</td>
            <td>₹{{RATE}}</td>
            <td>₹{{TAX_AMOUNT}}</td>
            <td><strong>₹{{TOTAL_AMOUNT}}</strong></td>
          </tr>
          {{/ITEMS}}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹{{SUBTOTAL}}</span>
        </div>
        <div class="total-row">
          <span>CGST:</span>
          <span>₹{{CGST_AMOUNT}}</span>
        </div>
        <div class="total-row">
          <span>SGST:</span>
          <span>₹{{SGST_AMOUNT}}</span>
        </div>
        <div class="total-row final-total">
          <span>Total Amount:</span>
          <span>₹{{TOTAL_AMOUNT}}</span>
        </div>
      </div>

      <div class="footer">
        <div>
          <strong>Terms & Conditions:</strong>
          <ul style="margin: 5px 0; padding-left: 15px;">
            <li>Payment due within 30 days</li>
            <li>Please quote invoice number when remitting payment</li>
          </ul>
        </div>
        <div class="signature">
          Authorized Signature
        </div>
      </div>
    </body>
    </html>
  `
}

function generateClassicA4Template() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 20mm; }
        body { 
          font-family: 'Times New Roman', serif; 
          font-size: 12px; 
          line-height: 1.5; 
          color: #000;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .document-title {
          font-size: 18px;
          font-weight: bold;
          text-decoration: underline;
          margin: 20px 0;
          text-align: center;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .items-table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        .signature-section {
          margin-top: 50px;
          float: right;
        }
      </style>
    </head>
    <body>
      <!-- Classic template content -->
    </body>
    </html>
  `
}

function generateThermalCompactTemplate() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: 80mm 200mm; margin: 2mm; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 9px; 
          line-height: 1.2;
          width: 76mm;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 3px 0; }
        .items-table { width: 100%; font-size: 8px; }
      </style>
    </head>
    <body>
      <div class="center bold">{{COMPANY_NAME}}</div>
      <div class="center">{{COMPANY_ADDRESS}}</div>
      <div class="center">{{COMPANY_PHONE}}</div>
      <div class="line"></div>
      
      <div>Receipt: {{DOCUMENT_NUMBER}}</div>
      <div>Date: {{DOCUMENT_DATE}}</div>
      <div class="line"></div>

      <table class="items-table">
        {{#ITEMS}}
        <tr>
          <td>{{ITEM_NAME}}</td>
          <td>{{QUANTITY}}</td>
          <td>₹{{TOTAL_AMOUNT}}</td>
        </tr>
        {{/ITEMS}}
      </table>

      <div class="line"></div>
      <div class="bold">Total: ₹{{TOTAL_AMOUNT}}</div>
      <div class="center">Thank You!</div>
    </body>
    </html>
  `
}

// Placeholder functions for other templates
function generateProfessionalA4Template() { return "<html><body>Professional A4 Template</body></html>" }
function generateMinimalA4Template() { return "<html><body>Minimal A4 Template</body></html>" }
function generateThermalDetailedTemplate() { return "<html><body>Thermal Detailed Template</body></html>" }
function generateA3LandscapeModernTemplate() { return "<html><body>A3 Landscape Template</body></html>" }

export default PrintTemplates

// src/components/shared/print/PrintSelectionDialog.js
import React, { useState, useEffect } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const PrintSelectionDialog = ({ 
  isOpen, 
  onClose, 
  onPrint, 
  documentType,
  documentId,
  company
}) => {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [error, setError] = useState(null)

  // Load available templates for this document type
  useEffect(() => {
    if (isOpen && documentType && company?.id) {
      loadTemplates()
    }
  }, [isOpen, documentType, company?.id])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 PrintSelectionDialog: Loading fresh templates from API')

      // Force no-cache with fetch options and timestamp
      const timestamp = new Date().getTime()
      const response = await fetch(
        `/api/settings/print-templates?company_id=${company.id}&_t=${timestamp}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      )
      const result = await response.json()

      if (result.success) {
        console.log(`✅ Loaded ${result.data?.length || 0} templates from database`)

        // Filter templates for this document type
        const docTemplates = result.data.filter(t => t.document_type === documentType)
        console.log(`📋 Found ${docTemplates.length} templates for ${documentType}`)

        if (docTemplates.length > 0) {
          console.log('Latest template:', {
            name: docTemplates[0].template_name,
            updated: docTemplates[0].updated_at,
            htmlLength: docTemplates[0].template_html?.length
          })
        }

        setTemplates(docTemplates)

        // Select the first template by default if available
        if (docTemplates.length > 0) {
          setSelectedTemplate(docTemplates[0])
        }
      } else {
        setError(result.error || 'Failed to load templates')
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!selectedTemplate) {
      setError('Please select a template')
      return
    }
    
    setLoading(true)
    try {
      await onPrint(selectedTemplate)
      onClose()
    } catch (err) {
      console.error('Print error:', err)
      setError('Failed to generate print')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Print Format">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading templates...</span>
          </div>
        ) : (
          <>
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">
                  No templates assigned for this document type.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Please assign templates in Settings {'>'} Print Templates
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Select a format to print this document:
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 text-left border rounded-lg transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{template.template_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.paper_size} format
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={loading || !selectedTemplate || templates.length === 0}
            loading={loading}
          >
            Print Document
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default PrintSelectionDialog
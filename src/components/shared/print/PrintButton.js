// src/components/shared/print/PrintButton.js
import React, { useState } from 'react'
import Button from '../ui/Button'
import printService from '../../../services/printService'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import PrintSelectionDialog from './PrintSelectionDialog'

const PrintButton = ({ 
  documentData, 
  documentType, 
  filename, 
  variant = "outline",
  size = "sm",
  children,
  onPrintComplete,
  onPrintError
}) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)

  const handlePrint = async (selectedTemplate) => {
    if (!documentData || !documentType || !company?.id) {
      error('Missing required information for printing')
      return
    }

    setLoading(true)
    try {
      // Use the selected template for printing
      await printService.printDocumentWithTemplate(
        documentData, 
        documentType, 
        company.id, 
        selectedTemplate
      )
      success('Document sent to printer')
      if (onPrintComplete) onPrintComplete()
    } catch (err) {
      console.error('Print error:', err)
      error('Failed to print document: ' + err.message)
      if (onPrintError) onPrintError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (selectedTemplate) => {
    if (!documentData || !documentType || !company?.id) {
      error('Missing required information for download')
      return
    }

    setLoading(true)
    try {
      const downloadFilename = filename || `${documentType}-${new Date().getTime()}.pdf`
      // Use the selected template for downloading
      await printService.downloadDocumentPDFWithTemplate(
        documentData, 
        documentType, 
        company.id, 
        downloadFilename,
        selectedTemplate
      )
      success('PDF downloaded successfully')
      if (onPrintComplete) onPrintComplete()
    } catch (err) {
      console.error('Download error:', err)
      error('Failed to download PDF: ' + err.message)
      if (onPrintError) onPrintError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant={variant}
          size={size}
          onClick={() => setShowPrintDialog(true)}
          loading={loading}
          disabled={loading}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          }
        >
          {children || "Print"}
        </Button>
        
        <Button
          variant={variant}
          size={size}
          onClick={() => setShowDownloadDialog(true)}
          loading={loading}
          disabled={loading}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
        >
          Download PDF
        </Button>
      </div>

      {/* Print Selection Dialog */}
      <PrintSelectionDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={handlePrint}
        documentType={documentType}
        documentId={documentData?.id}
        company={company}
      />

      {/* Download Selection Dialog */}
      <PrintSelectionDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onPrint={handleDownload}
        documentType={documentType}
        documentId={documentData?.id}
        company={company}
      />
    </>
  )
}

export default PrintButton
// pages/others/scanner.js
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/shared/ui/Button'
import Card from '../../components/shared/ui/Card'

const ScannerPage = () => {
  const router = useRouter()
  const { user, company } = useAuth()
  const { success, error } = useToast()
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check if browser supports media devices
  const isMediaDevicesSupported = () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  }

  // Start scanning
  const startScan = async () => {
    if (!isMediaDevicesSupported()) {
      error('Camera access not supported in this browser')
      return
    }

    if (!company?.id) {
      error('Please select a company first')
      return
    }

    setScanning(true)
    setScanResult(null)
    setLoading(true)

    try {
      // In a real implementation, you would integrate a QR code scanning library here
      // For demonstration, we'll simulate a scan after 2 seconds
      setTimeout(() => {
        simulateScan()
      }, 2000)
    } catch (err) {
      console.error('Error starting scan:', err)
      error('Failed to start scanner: ' + err.message)
      setScanning(false)
      setLoading(false)
    }
  }

  // Simulate a scan result
  const simulateScan = () => {
    const mockData = {
      id: 'doc_12345',
      documentType: 'invoice',
      documentNumber: 'INV-2024-001',
      date: '2024-10-27',
      amount: 1250.50,
      companyId: company?.id,
      branchId: 'branch_001',
      customerId: 'customer_001',
      timestamp: new Date().toISOString()
    }
    
    setScanResult(mockData)
    setScanning(false)
    setLoading(false)
    success('Document scanned successfully!')
  }

  // Stop scanning
  const stopScan = () => {
    setScanning(false)
    setLoading(false)
    setScanResult(null)
  }

  // View document details
  const viewDocument = () => {
    if (scanResult) {
      // Navigate to the document details page
      // This would depend on your routing structure
      success('Redirecting to document...')
      // router.push(`/sales/invoices/${scanResult.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Document Scanner</h1>
                <p className="text-sm text-gray-500">Scan QR codes from printed documents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Section */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan Document</h2>
              
              <div className="space-y-4">
                {!scanning ? (
                  <div className="text-center">
                    <Button
                      onClick={startScan}
                      loading={loading}
                      disabled={loading}
                      variant="primary"
                      className="px-6 py-3"
                    >
                      {loading ? 'Starting Scanner...' : 'Start Scanner'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Point your camera at the QR code on a printed document
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-96 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-pulse">
                          <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
                          </svg>
                        </div>
                        <p className="text-gray-600 mt-2">Scanning for QR codes...</p>
                        <p className="text-sm text-gray-500">Point camera at QR code</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={stopScan}
                        variant="outline"
                        className="px-4 py-2"
                      >
                        Stop Scanner
                      </Button>
                    </div>
                  </div>
                )}
                
                {scanResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-bold text-green-800 mb-2">Scan Successful!</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Document:</span> {scanResult.documentNumber}</p>
                      <p><span className="font-medium">Type:</span> {scanResult.documentType}</p>
                      <p><span className="font-medium">Date:</span> {scanResult.date}</p>
                      <p><span className="font-medium">Amount:</span> ₹{scanResult.amount}</p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button onClick={viewDocument} variant="primary" size="sm">
                        View Document
                      </Button>
                      <Button onClick={() => setScanResult(null)} variant="outline" size="sm">
                        Scan Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Instructions */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">1.</span>
                  <span>Click "Start Scanner" to activate your camera</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">2.</span>
                  <span>Point your camera at the QR code on a printed document</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">3.</span>
                  <span>The system will automatically detect and scan the code</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">4.</span>
                  <span>View document details or take further actions</span>
                </li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Quick access to digital copies of printed documents</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Reduce manual data entry errors</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Improve document retrieval efficiency</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScannerPage
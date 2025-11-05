// src/components/master-data/UPIQRCode.js
import { useState, useEffect } from 'react'
import { useAPI } from '../../hooks/useAPI'
import { useToast } from '../../hooks/useToast'

const UPIQRCode = ({ upiId, accountName, amount = null, note = null, size = 'md' }) => {
  const { authenticatedFetch } = useAPI()
  const { error } = useToast()
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  }

  const generateQRCode = async () => {
    if (!upiId) return

    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/master-data/bank-accounts/upi-qr', {
        method: 'POST',
        body: JSON.stringify({
          upi_id: upiId,
          amount: amount,
          note: note || `Payment to ${accountName}`
        })
      })

      if (response && response.success) {
        setQrCode(response.data.upi_qr_code)
        setShowQR(true)
      } else {
        throw new Error(response?.error || 'Failed to generate QR code')
      }
    } catch (err) {
      console.error('Error generating UPI QR code:', err)
      error('Failed to generate UPI QR code')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId)
      .then(() => {
        alert('UPI ID copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy UPI ID:', err)
        error('Failed to copy UPI ID')
      })
  }

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <span className="font-mono text-sm">{upiId}</span>
        <button
          onClick={copyToClipboard}
          className="text-blue-600 hover:text-blue-800"
          title="Copy UPI ID"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={generateQRCode}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Show QR Code"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
            </svg>
          )}
        </button>
      </div>

      {showQR && qrCode && (
        <div className="mt-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">UPI QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <img 
                src={qrCode} 
                alt={`UPI QR Code for ${upiId}`}
                className={sizeClasses[size]}
              />
              <div className="mt-4 text-center">
                <p className="font-medium">{accountName}</p>
                <p className="text-sm text-gray-600 font-mono">{upiId}</p>
                {amount && <p className="text-lg font-bold mt-2">₹{amount}</p>}
                {note && <p className="text-sm text-gray-600 mt-1">{note}</p>}
              </div>
              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>Scan this QR code with any UPI app to make payment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UPIQRCode
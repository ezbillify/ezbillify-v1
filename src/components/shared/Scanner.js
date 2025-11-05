// src/components/shared/Scanner.js
import React, { useState, useRef } from 'react'
import Button from './ui/Button'

const Scanner = ({ onScanSuccess, onScanError }) => {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Check if browser supports media devices
  const isMediaDevicesSupported = () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  }

  // Start scanning
  const startScan = async () => {
    if (!isMediaDevicesSupported()) {
      onScanError && onScanError('Camera access not supported in this browser')
      return
    }

    setScanning(true)
    setScanResult(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      // In a real implementation, you would integrate a QR code scanning library here
      // For now, we'll simulate a scan after 3 seconds
      setTimeout(() => {
        simulateScan()
      }, 3000)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setScanning(false)
      onScanError && onScanError('Failed to access camera: ' + error.message)
    }
  }

  // Simulate a scan result
  const simulateScan = () => {
    const mockData = {
      id: 'item_12345',
      code: 'ITM-0001',
      name: 'Sample Product',
      price: 299.99,
      timestamp: new Date().toISOString()
    }
    
    setScanResult(mockData)
    setScanning(false)
    
    // Stop the camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    onScanSuccess && onScanSuccess(mockData)
  }

  // Stop scanning
  const stopScan = () => {
    setScanning(false)
    
    // Stop the camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  return (
    <div className="scanner-component">
      <div className="scanner-controls">
        {!scanning ? (
          <Button onClick={startScan} variant="primary">
            Start Scanner
          </Button>
        ) : (
          <Button onClick={stopScan} variant="danger">
            Stop Scanner
          </Button>
        )}
      </div>
      
      {scanning && (
        <div className="scanner-video-container mt-4">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full max-w-md border-2 border-gray-300 rounded-lg"
          />
          <div className="scanner-overlay">
            <div className="scanner-instruction text-center text-white mt-2">
              Point camera at QR code
            </div>
          </div>
        </div>
      )}
      
      {scanResult && (
        <div className="scan-result mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-800">Scan Successful!</h3>
          <div className="mt-2">
            <p><strong>Item:</strong> {scanResult.name}</p>
            <p><strong>Code:</strong> {scanResult.code}</p>
            <p><strong>Price:</strong> ₹{scanResult.price}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Scanner
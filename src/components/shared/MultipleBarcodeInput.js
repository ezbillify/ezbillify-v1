// src/components/shared/MultipleBarcodeInput.js
// COMPLETE FIXED VERSION - Handles all validation scenarios
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import ItemConflictModal from './ItemConflictModal'

const MultipleBarcodeInput = ({
  value = [],
  onChange,
  itemId = null,
  disabled = false,
  label = 'Barcodes',
  placeholder = 'Enter or scan barcode',
  helpText = 'Press Enter to add. Supports multiple barcodes. Each barcode must be unique.'
}) => {
  const { company } = useAuth()
  const [barcodes, setBarcodes] = useState(value || [])
  const [inputValue, setInputValue] = useState('')
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState({ 
    status: null, 
    message: '', 
    existingItem: null,
    statusType: null
  })
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictData, setConflictData] = useState(null)
  const inputRef = useRef(null)
  const validationTimeoutRef = useRef(null)

  // Sync with parent value
  useEffect(() => {
    setBarcodes(value || [])
  }, [value])

  /**
   * Real-time barcode validation
   */
  const validateBarcode = async (barcode) => {
    if (!barcode || !barcode.trim()) {
      setValidation({ 
        status: null, 
        message: '',
        statusType: null
      })
      return
    }

    const cleanBarcode = barcode.trim()

    // Check for duplicates in current input list
    const duplicateInList = barcodes.some(
      bc => bc.toLowerCase() === cleanBarcode.toLowerCase()
    )
    
    if (duplicateInList) {
      setValidation({
        status: 'duplicate',
        message: '⚠️ Already in list',
        statusType: 'duplicate'
      })
      return
    }

    // Validate against database
    setValidating(true)
    try {
      const params = new URLSearchParams({
        barcode: cleanBarcode,
        company_id: company.id,
        ...(itemId && { item_id: itemId })
      })

      const response = await fetch(`/api/items/validate-barcode?${params}`)
      
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        setValidation({
          status: 'error',
          message: '⚠ Validation failed',
          statusType: 'error'
        })
        setValidating(false)
        return
      }

      console.log('✅ Validation response:', data)

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, data)
        setValidation({
          status: 'error',
          message: '⚠ Validation failed',
          statusType: 'error'
        })
        setValidating(false)
        return
      }

      if (data.success) {
        if (data.status === 'own') {
          // Allow re-adding own barcodes
          setValidation({
            status: 'own',
            message: '✓ Available',
            statusType: 'own',
            existingItem: null
          })
        } else if (data.status === 'conflict') {
          // Show conflict with item details
          setValidation({
            status: 'conflict',
            message: '✗ UNAVAILABLE',
            statusType: 'conflict',
            existingItem: data.existingItem || { 
              name: 'Unknown Item', 
              code: 'Unknown Code',
              id: data.existingItem?.id || null
            }
          })
        } else if (data.status === 'available' || data.available === true) {
          // Available
          setValidation({
            status: 'available',
            message: '✓ Available',
            statusType: 'available',
            existingItem: null
          })
        } else {
          setValidation({
            status: 'error',
            message: '⚠ Invalid response',
            statusType: 'error'
          })
        }
      } else {
        console.error('❌ Backend error:', data)
        setValidation({
          status: 'error',
          message: data.error || '⚠ Could not validate',
          statusType: 'error'
        })
      }
    } catch (error) {
      console.error('❌ Validation error:', error)
      setValidation({
        status: 'error',
        message: '⚠ Validation failed',
        statusType: 'error'
      })
    } finally {
      setValidating(false)
    }
  }

  // Debounced validation
  const handleInputChange = (e) => {
    const value = e.target.value
    setInputValue(value)

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateBarcode(value)
    }, 300)
  }

  /**
   * Add barcode to list
   */
  const addBarcode = () => {
    const cleanBarcode = inputValue.trim()

    if (!cleanBarcode) return

    // Only allow adding if available or own
    if (validation.status !== 'available' && validation.status !== 'own') {
      return
    }

    // Add to list
    const newBarcodes = [...barcodes, cleanBarcode]
    setBarcodes(newBarcodes)
    onChange(newBarcodes)

    // Clear input
    setInputValue('')
    setValidation({ 
      status: null, 
      message: '',
      statusType: null
    })

    // Focus back on input
    inputRef.current?.focus()
  }

  /**
   * Remove barcode from list
   */
  const removeBarcode = (index) => {
    const newBarcodes = barcodes.filter((_, i) => i !== index)
    setBarcodes(newBarcodes)
    onChange(newBarcodes)
  }

  /**
   * Can add barcode
   */
  const canAdd = inputValue.trim() &&
                (validation.status === 'available' || validation.status === 'own') &&
                !validating

  /**
   * Handle key down (Enter to add)
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (canAdd) {
        addBarcode()
      }
    }
  }

  /**
   * Get status color
   */
  const getStatusColor = () => {
    switch (validation.status) {
      case 'available':
      case 'own':
        return 'text-green-600'
      case 'conflict':
      case 'duplicate':
        return 'text-red-600'
      case 'error':
        return 'text-orange-600'
      default:
        return 'text-gray-500'
    }
  }

  /**
   * Generate random barcode
   */
  const generateBarcode = () => {
    let barcode = ''
    for (let i = 0; i < 12; i++) {
      barcode += Math.floor(Math.random() * 10)
    }

    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i])
      sum += (i % 2 === 0) ? digit : digit * 3
    }
    const checkDigit = (10 - (sum % 10)) % 10

    const fullBarcode = barcode + checkDigit

    // Set the generated barcode in input
    setInputValue(fullBarcode)
    // Validate it immediately
    validateBarcode(fullBarcode)
  }

  /**
   * Show conflict modal
   */
  const handleShowConflict = () => {
    if ((validation.existingItem || validation.status === 'conflict') && inputValue.trim()) {
      setConflictData({
        barcode: inputValue.trim(),
        existingItem: validation.existingItem || { 
          name: 'Unknown Item', 
          code: 'Unknown Code',
          id: validation.existingItem?.id || null
        }
      })
      setShowConflictModal(true)
    }
  }

  return (
    <div className="space-y-2">
      {/* Conflict Modal */}
      <ItemConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflictData={conflictData}
      />
      
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Input Section */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${validation.status === 'available' || validation.status === 'own' ? 'border-green-500' : ''}
              ${validation.status === 'conflict' || validation.status === 'duplicate' ? 'border-red-500' : 'border-gray-300'}
            `}
          />

          {/* Validation Status */}
          {(validating || validation.message) && (
            <div className={`absolute right-3 top-2 text-sm flex items-center gap-1 ${getStatusColor()}`}>
              {validating ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                validation.message
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={generateBarcode}
          disabled={disabled}
          className="relative inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 border border-emerald-600"
          title="Auto-generate barcode"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Generate
        </button>

        <button
          type="button"
          onClick={addBarcode}
          disabled={!canAdd || disabled}
          className={`
            relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border
            ${canAdd
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 border-blue-600'
              : 'bg-slate-300 text-slate-500 border-slate-300'}
          `}
        >
          Add
        </button>
      </div>

      {/* Help Text */}
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {/* Validation Message with Context */}
      {validation.message && !validating && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${getStatusColor()}`}>
            {validation.message}
          </p>
          {validation.status === 'conflict' && (
            <button
              type="button"
              onClick={handleShowConflict}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
            >
              View Details →
            </button>
          )}
        </div>
      )}

      {/* Barcode List */}
      {barcodes.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Added Barcodes ({barcodes.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {barcodes.map((barcode, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <span className="text-sm font-mono text-blue-900">{barcode}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeBarcode(index)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95"
                    aria-label="Remove barcode"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {barcodes.length === 0 && (
        <div className="mt-2 text-center py-4 border-2 border-dashed border-gray-200 rounded-md">
          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No barcodes added yet</p>
          <p className="text-xs text-gray-400">Enter barcode and press Add or Enter</p>
        </div>
      )}
    </div>
  )
}

export default MultipleBarcodeInput
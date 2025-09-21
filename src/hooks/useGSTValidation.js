// hooks/useGSTValidation.js
import { useState, useCallback } from 'react'

export const useGSTValidation = () => {
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)

  const validateGSTIN = useCallback(async (gstin) => {
    if (!gstin || gstin.length !== 15) {
      return { isValid: false, error: 'GSTIN must be 15 characters' }
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstinRegex.test(gstin)) {
      return { isValid: false, error: 'Invalid GSTIN format' }
    }

    setValidating(true)
    try {
      // Mock API call for GSTIN validation
      // In real implementation, call actual GST API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result = {
        isValid: true,
        businessName: 'Sample Business Name',
        address: 'Sample Address',
        status: 'Active'
      }
      
      setValidationResult(result)
      return result
    } catch (error) {
      const errorResult = { isValid: false, error: 'Validation service unavailable' }
      setValidationResult(errorResult)
      return errorResult
    } finally {
      setValidating(false)
    }
  }, [])

  const validatePAN = useCallback((pan) => {
    if (!pan || pan.length !== 10) {
      return { isValid: false, error: 'PAN must be 10 characters' }
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    if (!panRegex.test(pan)) {
      return { isValid: false, error: 'Invalid PAN format' }
    }

    return { isValid: true }
  }, [])

  const clearValidation = () => {
    setValidationResult(null)
  }

  return {
    validating,
    validationResult,
    validateGSTIN,
    validatePAN,
    clearValidation
  }
}

export default useGSTValidation
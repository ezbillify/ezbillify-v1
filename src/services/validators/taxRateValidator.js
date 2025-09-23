import { supabase } from '../utils/supabase'

export const validateTaxRateData = (taxRateData) => {
  const errors = {}

  // Required field validation
  if (!taxRateData.tax_name?.trim()) {
    errors.tax_name = 'Tax name is required'
  }

  if (!taxRateData.tax_type) {
    errors.tax_type = 'Tax type is required'
  }

  // Tax rate validation
  if (taxRateData.tax_rate === undefined || taxRateData.tax_rate === null) {
    errors.tax_rate = 'Tax rate is required'
  } else {
    const rate = parseFloat(taxRateData.tax_rate)
    if (isNaN(rate)) {
      errors.tax_rate = 'Tax rate must be a valid number'
    } else if (rate < 0 || rate > 100) {
      errors.tax_rate = 'Tax rate must be between 0 and 100'
    }
  }

  // Tax type validation
  const validTaxTypes = ['gst', 'vat', 'service_tax', 'excise', 'customs', 'cess', 'other']
  if (taxRateData.tax_type && !validTaxTypes.includes(taxRateData.tax_type)) {
    errors.tax_type = 'Invalid tax type'
  }

  // GST-specific validation
  if (taxRateData.tax_type === 'gst') {
    const totalRate = parseFloat(taxRateData.tax_rate) || 0
    const cgstRate = parseFloat(taxRateData.cgst_rate) || 0
    const sgstRate = parseFloat(taxRateData.sgst_rate) || 0
    const igstRate = parseFloat(taxRateData.igst_rate) || 0

    // CGST + SGST should equal total rate
    if (Math.abs((cgstRate + sgstRate) - totalRate) > 0.01) {
      errors.cgst_rate = 'CGST + SGST should equal total tax rate'
    }

    // IGST should equal total rate
    if (Math.abs(igstRate - totalRate) > 0.01) {
      errors.igst_rate = 'IGST should equal total tax rate'
    }

    // Individual GST rates validation
    if (cgstRate < 0 || cgstRate > 50) {
      errors.cgst_rate = 'CGST rate must be between 0 and 50'
    }

    if (sgstRate < 0 || sgstRate > 50) {
      errors.sgst_rate = 'SGST rate must be between 0 and 50'
    }

    if (igstRate < 0 || igstRate > 100) {
      errors.igst_rate = 'IGST rate must be between 0 and 100'
    }
  }

  // Cess rate validation
  if (taxRateData.cess_rate !== undefined && taxRateData.cess_rate !== null) {
    const cessRate = parseFloat(taxRateData.cess_rate)
    if (isNaN(cessRate)) {
      errors.cess_rate = 'Cess rate must be a valid number'
    } else if (cessRate < 0 || cessRate > 100) {
      errors.cess_rate = 'Cess rate must be between 0 and 100'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateTaxRateName = async (companyId, taxName, excludeId = null) => {
  try {
    let query = supabase
      .from('tax_rates')
      .select('id')
      .eq('company_id', companyId)
      .eq('tax_name', taxName)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      isUnique: data?.length === 0,
      message: data?.length > 0 ? 'Tax rate name already exists' : null
    }
  } catch (error) {
    return {
      isUnique: false,
      message: 'Error validating tax rate name'
    }
  }
}

export const validateTaxRateDeletion = async (taxRateId) => {
  try {
    // Check if tax rate is being used in items
    const { data: itemUsage } = await supabase
      .from('items')
      .select('id')
      .eq('tax_rate_id', taxRateId)
      .limit(1)

    if (itemUsage?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete tax rate that is assigned to items'
      }
    }

    // Check if tax rate is being used in sales/purchase documents
    const { data: salesUsage } = await supabase
      .from('sales_document_items')
      .select('id')
      .eq('tax_rate_id', taxRateId)
      .limit(1)

    if (salesUsage?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete tax rate that is used in transactions'
      }
    }

    return {
      canDelete: true,
      message: null
    }
  } catch (error) {
    return {
      canDelete: false,
      message: 'Error validating tax rate deletion'
    }
  }
}

export const sanitizeTaxRateData = (taxRateData) => {
  const sanitized = {
    tax_name: taxRateData.tax_name?.trim(),
    tax_type: taxRateData.tax_type,
    tax_rate: parseFloat(taxRateData.tax_rate) || 0,
    is_default: Boolean(taxRateData.is_default),
    is_active: taxRateData.is_active !== undefined ? taxRateData.is_active : true
  }

  // Add GST-specific fields if applicable
  if (taxRateData.tax_type === 'gst') {
    sanitized.cgst_rate = parseFloat(taxRateData.cgst_rate) || 0
    sanitized.sgst_rate = parseFloat(taxRateData.sgst_rate) || 0
    sanitized.igst_rate = parseFloat(taxRateData.igst_rate) || 0
  }

  // Add cess rate if provided
  if (taxRateData.cess_rate !== undefined && taxRateData.cess_rate !== null) {
    sanitized.cess_rate = parseFloat(taxRateData.cess_rate) || 0
  }

  return sanitized
}

export const calculateGSTComponents = (totalRate) => {
  const rate = parseFloat(totalRate) || 0
  const halfRate = rate / 2

  return {
    cgst_rate: halfRate,
    sgst_rate: halfRate,
    igst_rate: rate,
    total_rate: rate
  }
}

export const validateGSTComponents = (cgstRate, sgstRate, igstRate, totalRate) => {
  const cgst = parseFloat(cgstRate) || 0
  const sgst = parseFloat(sgstRate) || 0
  const igst = parseFloat(igstRate) || 0
  const total = parseFloat(totalRate) || 0

  const errors = {}

  // CGST + SGST should equal total
  if (Math.abs((cgst + sgst) - total) > 0.01) {
    errors.components = 'CGST + SGST should equal total tax rate'
  }

  // IGST should equal total
  if (Math.abs(igst - total) > 0.01) {
    errors.igst = 'IGST should equal total tax rate'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
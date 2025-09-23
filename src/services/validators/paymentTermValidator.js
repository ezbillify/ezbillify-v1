import { supabase } from '../utils/supabase'

export const validatePaymentTermData = (paymentTermData) => {
  const errors = {}

  // Required field validation
  if (!paymentTermData.term_name?.trim()) {
    errors.term_name = 'Payment term name is required'
  }

  // Term days validation
  if (paymentTermData.term_days === undefined || paymentTermData.term_days === null) {
    errors.term_days = 'Term days is required'
  } else {
    const days = parseInt(paymentTermData.term_days)
    if (isNaN(days)) {
      errors.term_days = 'Term days must be a valid number'
    } else if (days < 0) {
      errors.term_days = 'Term days cannot be negative'
    } else if (days > 365) {
      errors.term_days = 'Term days cannot exceed 365'
    }
  }

  // Term name length validation
  if (paymentTermData.term_name && paymentTermData.term_name.length > 100) {
    errors.term_name = 'Payment term name cannot exceed 100 characters'
  }

  // Description length validation
  if (paymentTermData.description && paymentTermData.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validatePaymentTermName = async (companyId, termName, excludeId = null) => {
  try {
    let query = supabase
      .from('payment_terms')
      .select('id')
      .eq('company_id', companyId)
      .eq('term_name', termName)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      isUnique: data?.length === 0,
      message: data?.length > 0 ? 'Payment term name already exists' : null
    }
  } catch (error) {
    return {
      isUnique: false,
      message: 'Error validating payment term name'
    }
  }
}

export const validatePaymentTermDeletion = async (paymentTermId) => {
  try {
    // Check if payment term is being used by customers
    const { data: customerUsage } = await supabase
      .from('customers')
      .select('id')
      .eq('payment_terms', paymentTermId)
      .limit(1)

    if (customerUsage?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete payment term that is assigned to customers'
      }
    }

    // Check if payment term is being used by vendors
    const { data: vendorUsage } = await supabase
      .from('vendors')
      .select('id')
      .eq('payment_terms', paymentTermId)
      .limit(1)

    if (vendorUsage?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete payment term that is assigned to vendors'
      }
    }

    return {
      canDelete: true,
      message: null
    }
  } catch (error) {
    return {
      canDelete: false,
      message: 'Error validating payment term deletion'
    }
  }
}

export const sanitizePaymentTermData = (paymentTermData) => {
  return {
    term_name: paymentTermData.term_name?.trim(),
    term_days: parseInt(paymentTermData.term_days) || 0,
    description: paymentTermData.description?.trim() || null,
    is_active: paymentTermData.is_active !== undefined ? paymentTermData.is_active : true
  }
}

export const calculateDueDate = (invoiceDate, termDays) => {
  const invoice = new Date(invoiceDate)
  const due = new Date(invoice)
  due.setDate(invoice.getDate() + parseInt(termDays))
  return due
}

export const getCashFlowImpact = (termDays) => {
  const days = parseInt(termDays) || 0
  
  if (days === 0) {
    return {
      impact: 'Excellent',
      color: 'green',
      description: 'Immediate cash flow - no waiting period',
      score: 100
    }
  } else if (days <= 7) {
    return {
      impact: 'Very Good',
      color: 'blue',
      description: 'Quick cash flow - minimal waiting period',
      score: 90
    }
  } else if (days <= 15) {
    return {
      impact: 'Good',
      color: 'blue',
      description: 'Good cash flow - short waiting period',
      score: 80
    }
  } else if (days <= 30) {
    return {
      impact: 'Standard',
      color: 'yellow',
      description: 'Normal cash flow - industry standard',
      score: 70
    }
  } else if (days <= 45) {
    return {
      impact: 'Moderate',
      color: 'orange',
      description: 'Moderate cash flow - some delay',
      score: 60
    }
  } else if (days <= 60) {
    return {
      impact: 'Poor',
      color: 'red',
      description: 'Delayed cash flow - significant waiting',
      score: 40
    }
  } else {
    return {
      impact: 'Very Poor',
      color: 'red',
      description: 'Very slow cash flow - long waiting period',
      score: 20
    }
  }
}

export const calculateWorkingCapitalImpact = (invoiceAmount, termDays, annualVolume = 1) => {
  const amount = parseFloat(invoiceAmount) || 0
  const days = parseInt(termDays) || 0
  
  return {
    singleInvoice: {
      amount: amount,
      days: days,
      cost: (amount * 0.12 * days) / 365 // Assuming 12% annual interest
    },
    annual: {
      volume: annualVolume,
      totalTiedUp: (amount * annualVolume * days) / 365,
      totalCost: (amount * annualVolume * 0.12 * days) / 365
    }
  }
}

export const getCollectionRisk = (termDays) => {
  const days = parseInt(termDays) || 0
  
  if (days === 0) {
    return { risk: 'None', level: 'low', percentage: 0 }
  } else if (days <= 30) {
    return { risk: 'Low', level: 'low', percentage: 2 }
  } else if (days <= 60) {
    return { risk: 'Medium', level: 'medium', percentage: 5 }
  } else if (days <= 90) {
    return { risk: 'High', level: 'high', percentage: 10 }
  } else {
    return { risk: 'Very High', level: 'high', percentage: 15 }
  }
}

export const getIndustryRecommendations = () => {
  return {
    retail: {
      name: 'Retail/B2C',
      recommended: 'Immediate to Net 7',
      days: [0, 7],
      reason: 'Consumer transactions expect quick payment'
    },
    smallBusiness: {
      name: 'Small Business B2B',
      recommended: 'Net 15 to Net 30',
      days: [15, 30],
      reason: 'Balance between cash flow and customer relationship'
    },
    corporate: {
      name: 'Corporate/Enterprise',
      recommended: 'Net 30 to Net 45',
      days: [30, 45],
      reason: 'Standard corporate payment cycles'
    },
    government: {
      name: 'Government',
      recommended: 'Net 30 to Net 90',
      days: [30, 90],
      reason: 'Government payment processes are typically longer'
    },
    construction: {
      name: 'Construction',
      recommended: 'Net 30 with progress payments',
      days: [30],
      reason: 'Project-based payments with milestone billing'
    },
    wholesale: {
      name: 'Wholesale',
      recommended: 'Net 30 with early payment discounts',
      days: [30],
      reason: 'Volume business with incentives for quick payment'
    }
  }
}
// lib/validations.js
import { VALIDATION_PATTERNS } from './constants'

// Basic validation functions
export const validators = {
  // Required field validation
  required(value, fieldName = 'Field') {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`
    }
    if (typeof value === 'string' && value.trim() === '') {
      return `${fieldName} cannot be empty`
    }
    return null
  },

  // Email validation
  email(value) {
    if (!value) return null
    if (!VALIDATION_PATTERNS.EMAIL.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  },

  // Phone number validation (Indian format)
  phone(value) {
    if (!value) return null
    const cleanPhone = value.replace(/\D/g, '')
    if (!VALIDATION_PATTERNS.PHONE.test(cleanPhone)) {
      return 'Please enter a valid 10-digit mobile number'
    }
    return null
  },

  // GSTIN validation
  gstin(value) {
    if (!value) return null
    if (!VALIDATION_PATTERNS.GSTIN.test(value.toUpperCase())) {
      return 'Please enter a valid GSTIN (15 characters)'
    }
    return null
  },

  // PAN validation
  pan(value) {
    if (!value) return null
    if (!VALIDATION_PATTERNS.PAN.test(value.toUpperCase())) {
      return 'Please enter a valid PAN (10 characters)'
    }
    return null
  },

  // Pincode validation
  pincode(value) {
    if (!value) return null
    if (!VALIDATION_PATTERNS.PINCODE.test(value)) {
      return 'Please enter a valid 6-digit pincode'
    }
    return null
  },

  // Aadhar validation
  aadhar(value) {
    if (!value) return null
    const cleanAadhar = value.replace(/\D/g, '')
    if (!VALIDATION_PATTERNS.AADHAR.test(cleanAadhar)) {
      return 'Please enter a valid 12-digit Aadhar number'
    }
    return null
  },

  // Password validation
  password(value, minLength = 6) {
    if (!value) return null
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters long`
    }
    return null
  },

  // Strong password validation
  strongPassword(value) {
    if (!value) return null
    
    const errors = []
    if (value.length < 8) errors.push('at least 8 characters')
    if (!/[A-Z]/.test(value)) errors.push('one uppercase letter')
    if (!/[a-z]/.test(value)) errors.push('one lowercase letter')
    if (!/\d/.test(value)) errors.push('one number')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('one special character')
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`
    }
    return null
  },

  // Numeric validation
  numeric(value, fieldName = 'Field') {
    if (!value && value !== 0) return null
    if (isNaN(Number(value))) {
      return `${fieldName} must be a valid number`
    }
    return null
  },

  // Positive number validation
  positiveNumber(value, fieldName = 'Field') {
    const numericError = validators.numeric(value, fieldName)
    if (numericError) return numericError
    
    if (Number(value) < 0) {
      return `${fieldName} must be a positive number`
    }
    return null
  },

  // Decimal validation
  decimal(value, maxDecimals = 2, fieldName = 'Field') {
    const numericError = validators.numeric(value, fieldName)
    if (numericError) return numericError
    
    const decimalPlaces = (value.toString().split('.')[1] || '').length
    if (decimalPlaces > maxDecimals) {
      return `${fieldName} can have maximum ${maxDecimals} decimal places`
    }
    return null
  },

  // Range validation
  range(value, min, max, fieldName = 'Field') {
    const numericError = validators.numeric(value, fieldName)
    if (numericError) return numericError
    
    const num = Number(value)
    if (num < min || num > max) {
      return `${fieldName} must be between ${min} and ${max}`
    }
    return null
  },

  // Length validation
  length(value, min, max, fieldName = 'Field') {
    if (!value) return null
    const length = value.length
    if (length < min || length > max) {
      return `${fieldName} must be between ${min} and ${max} characters`
    }
    return null
  },

  // Minimum length validation
  minLength(value, min, fieldName = 'Field') {
    if (!value) return null
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`
    }
    return null
  },

  // Maximum length validation
  maxLength(value, max, fieldName = 'Field') {
    if (!value) return null
    if (value.length > max) {
      return `${fieldName} cannot exceed ${max} characters`
    }
    return null
  },

  // Date validation
  date(value, fieldName = 'Date') {
    if (!value) return null
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return `Please enter a valid ${fieldName.toLowerCase()}`
    }
    return null
  },

  // Future date validation
  futureDate(value, fieldName = 'Date') {
    const dateError = validators.date(value, fieldName)
    if (dateError) return dateError
    
    const inputDate = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (inputDate <= today) {
      return `${fieldName} must be in the future`
    }
    return null
  },

  // Past date validation
  pastDate(value, fieldName = 'Date') {
    const dateError = validators.date(value, fieldName)
    if (dateError) return dateError
    
    const inputDate = new Date(value)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    if (inputDate >= today) {
      return `${fieldName} must be in the past`
    }
    return null
  },

  // URL validation
  url(value) {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return 'Please enter a valid URL'
    }
  },

  // UUID validation
  uuid(value, fieldName = 'ID') {
    if (!value) return null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      return `Please enter a valid ${fieldName}`
    }
    return null
  },

  // Array validation
  array(value, minItems = 0, maxItems = null, fieldName = 'List') {
    if (!Array.isArray(value)) {
      return `${fieldName} must be an array`
    }
    if (value.length < minItems) {
      return `${fieldName} must have at least ${minItems} items`
    }
    if (maxItems && value.length > maxItems) {
      return `${fieldName} cannot have more than ${maxItems} items`
    }
    return null
  },

  // Object validation
  object(value, fieldName = 'Object') {
    if (value !== null && typeof value !== 'object') {
      return `${fieldName} must be an object`
    }
    return null
  }
}

// Validation schema builder
export class ValidationSchema {
  constructor() {
    this.rules = {}
  }

  field(fieldName) {
    this.rules[fieldName] = []
    return {
      required: (message) => {
        this.rules[fieldName].push({
          validator: validators.required,
          args: [fieldName],
          message
        })
        return this
      },
      email: (message) => {
        this.rules[fieldName].push({
          validator: validators.email,
          args: [],
          message
        })
        return this
      },
      phone: (message) => {
        this.rules[fieldName].push({
          validator: validators.phone,
          args: [],
          message
        })
        return this
      },
      gstin: (message) => {
        this.rules[fieldName].push({
          validator: validators.gstin,
          args: [],
          message
        })
        return this
      },
      pan: (message) => {
        this.rules[fieldName].push({
          validator: validators.pan,
          args: [],
          message
        })
        return this
      },
      numeric: (message) => {
        this.rules[fieldName].push({
          validator: validators.numeric,
          args: [fieldName],
          message
        })
        return this
      },
      positive: (message) => {
        this.rules[fieldName].push({
          validator: validators.positiveNumber,
          args: [fieldName],
          message
        })
        return this
      },
      length: (min, max, message) => {
        this.rules[fieldName].push({
          validator: validators.length,
          args: [min, max, fieldName],
          message
        })
        return this
      },
      custom: (validatorFn, message) => {
        this.rules[fieldName].push({
          validator: validatorFn,
          args: [],
          message
        })
        return this
      }
    }
  }

  validate(data) {
    const errors = {}
    
    for (const [fieldName, rules] of Object.entries(this.rules)) {
      const value = data[fieldName]
      
      for (const rule of rules) {
        const error = rule.validator(value, ...rule.args)
        if (error) {
          errors[fieldName] = rule.message || error
          break // Stop at first error for this field
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Pre-built validation schemas
export const schemas = {
  // User registration schema
  userRegistration: () => {
    const schema = new ValidationSchema()
    return schema
      .field('firstName').required('First name is required').length(1, 50, 'First name must be 1-50 characters')
      .field('email').required('Email is required').email('Please enter a valid email')
      .field('phone').required('Phone number is required').phone('Please enter a valid 10-digit mobile number')
      .field('password').required('Password is required').custom(validators.strongPassword, 'Password must be strong')
  },

  // Company setup schema
  companySetup: () => {
    const schema = new ValidationSchema()
    return schema
      .field('name').required('Company name is required').length(2, 255, 'Company name must be 2-255 characters')
      .field('email').required('Email is required').email('Please enter a valid email')
      .field('phone').required('Phone is required').phone('Please enter a valid phone number')
      .field('gstin').gstin('Please enter a valid GSTIN')
      .field('pan').pan('Please enter a valid PAN')
  },

  // Customer schema
  customer: () => {
    const schema = new ValidationSchema()
    return schema
      .field('name').required('Customer name is required').length(2, 255, 'Name must be 2-255 characters')
      .field('customer_code').required('Customer code is required').length(1, 50, 'Customer code must be 1-50 characters')
      .field('customer_type').required('Customer type is required').custom(
        (value) => ['b2b', 'b2c'].includes(value) ? null : 'Customer type must be B2B or B2C'
      )
      .field('email').email('Please enter a valid email')
      .field('phone').phone('Please enter a valid phone number')
      .field('gstin').gstin('Please enter a valid GSTIN')
  },

  // Item schema
  item: () => {
    const schema = new ValidationSchema()
    return schema
      .field('item_name').required('Item name is required').length(2, 255, 'Item name must be 2-255 characters')
      .field('item_code').required('Item code is required').length(1, 100, 'Item code must be 1-100 characters')
      .field('selling_price').required('Selling price is required').positive('Selling price must be positive')
      .field('purchase_price').positive('Purchase price must be positive')
  },

  // Invoice schema
  invoice: () => {
    const schema = new ValidationSchema()
    return schema
      .field('customer_id').required('Customer is required').custom(validators.uuid, 'Invalid customer')
      .field('document_date').required('Invoice date is required').custom(validators.date, 'Invalid date')
      .field('items').required('At least one item is required').custom(
        (value) => Array.isArray(value) && value.length > 0 ? null : 'At least one item is required'
      )
  },

  // Payment schema
  payment: () => {
    const schema = new ValidationSchema()
    return schema
      .field('amount').required('Amount is required').positive('Amount must be positive')
      .field('payment_date').required('Payment date is required').custom(validators.date, 'Invalid date')
      .field('payment_method').required('Payment method is required')
      .field('party_name').required('Party name is required')
  }
}

// Form validation helper
export const validateForm = (data, schema) => {
  if (typeof schema === 'function') {
    schema = schema()
  }
  return schema.validate(data)
}

// Field-level validation helper
export const validateField = (value, validationRules, fieldName = 'Field') => {
  for (const rule of validationRules) {
    if (typeof rule === 'string') {
      // Simple validation rule name
      const validator = validators[rule]
      if (validator) {
        const error = validator(value, fieldName)
        if (error) return error
      }
    } else if (typeof rule === 'object') {
      // Complex validation rule with options
      const { type, ...options } = rule
      const validator = validators[type]
      if (validator) {
        const error = validator(value, ...Object.values(options), fieldName)
        if (error) return error
      }
    } else
        if (typeof rule === 'function') {
            const error = rule(value)
            if (error) return error
        }
    }
    return null
}

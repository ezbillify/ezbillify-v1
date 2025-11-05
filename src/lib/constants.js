// lib/constants.js

// Application constants
export const APP_NAME = 'EzBillify'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = "India's Best Billing Software"

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  WORKFORCE: 'workforce'
}

// Document types
export const DOCUMENT_TYPES = {
  INVOICE: 'invoice',
  QUOTATION: 'quotation',
  SALES_ORDER: 'sales_order',
  DELIVERY_NOTE: 'delivery_note',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
  PURCHASE_ORDER: 'purchase_order',
  BILL: 'bill',
  GRN: 'grn',
  PAYMENT_VOUCHER: 'payment_voucher',
  RECEIPT_VOUCHER: 'receipt_voucher'
}

// Document status
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
}

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
}

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
  UPI: 'upi',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet'
}

// GST rates
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28]

// GST Types
export const GST_TYPES = {
  INTRASTATE: 'intrastate', // CGST + SGST
  INTERSTATE: 'interstate'   // IGST
}

// Indian states with GST codes for dropdown
export const INDIAN_STATES_LIST = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh', code: '37' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh', code: '12' },
  { value: 'Assam', label: 'Assam', code: '18' },
  { value: 'Bihar', label: 'Bihar', code: '10' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh', code: '22' },
  { value: 'Goa', label: 'Goa', code: '30' },
  { value: 'Gujarat', label: 'Gujarat', code: '24' },
  { value: 'Haryana', label: 'Haryana', code: '06' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh', code: '02' },
  { value: 'Jharkhand', label: 'Jharkhand', code: '20' },
  { value: 'Karnataka', label: 'Karnataka', code: '29' },
  { value: 'Kerala', label: 'Kerala', code: '32' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh', code: '23' },
  { value: 'Maharashtra', label: 'Maharashtra', code: '27' },
  { value: 'Manipur', label: 'Manipur', code: '14' },
  { value: 'Meghalaya', label: 'Meghalaya', code: '17' },
  { value: 'Mizoram', label: 'Mizoram', code: '15' },
  { value: 'Nagaland', label: 'Nagaland', code: '13' },
  { value: 'Odisha', label: 'Odisha', code: '21' },
  { value: 'Punjab', label: 'Punjab', code: '03' },
  { value: 'Rajasthan', label: 'Rajasthan', code: '08' },
  { value: 'Sikkim', label: 'Sikkim', code: '11' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu', code: '33' },
  { value: 'Telangana', label: 'Telangana', code: '36' },
  { value: 'Tripura', label: 'Tripura', code: '16' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh', code: '09' },
  { value: 'Uttarakhand', label: 'Uttarakhand', code: '05' },
  { value: 'West Bengal', label: 'West Bengal', code: '19' },
  // Union Territories
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands', code: '35' },
  { value: 'Chandigarh', label: 'Chandigarh', code: '04' },
  { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { value: 'Delhi', label: 'Delhi', code: '07' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir', code: '01' },
  { value: 'Ladakh', label: 'Ladakh', code: '38' },
  { value: 'Lakshadweep', label: 'Lakshadweep', code: '31' },
  { value: 'Puducherry', label: 'Puducherry', code: '34' }
]

// Indian states and their GST codes (object format for lookup)
export const INDIAN_STATES = {
  'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12',
  'Assam': '18',
  'Bihar': '10',
  'Chhattisgarh': '22',
  'Goa': '30',
  'Gujarat': '24',
  'Haryana': '06',
  'Himachal Pradesh': '02',
  'Jharkhand': '20',
  'Karnataka': '29',
  'Kerala': '32',
  'Madhya Pradesh': '23',
  'Maharashtra': '27',
  'Manipur': '14',
  'Meghalaya': '17',
  'Mizoram': '15',
  'Nagaland': '13',
  'Odisha': '21',
  'Punjab': '03',
  'Rajasthan': '08',
  'Sikkim': '11',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Tripura': '16',
  'Uttar Pradesh': '09',
  'Uttarakhand': '05',
  'West Bengal': '19',
  'Andaman and Nicobar Islands': '35',
  'Chandigarh': '04',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Delhi': '07',
  'Jammu and Kashmir': '01',
  'Ladakh': '38',
  'Lakshadweep': '31',
  'Puducherry': '34'
}

// ✅ GST HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get GST state code from state name
 * @param {string} stateName - State name (e.g., "Maharashtra")
 * @returns {string|null} GST state code (e.g., "27") or null if not found
 */
export const getGSTStateCode = (stateName) => {
  return INDIAN_STATES[stateName] || null
}

/**
 * Determine GST type based on company and customer states
 * @param {string} companyState - Company's state
 * @param {string} customerState - Customer's state (billing/shipping)
 * @returns {string} 'intrastate' or 'interstate'
 * 
 * Examples:
 * getGSTType('Maharashtra', 'Maharashtra') → 'intrastate'
 * getGSTType('Maharashtra', 'Gujarat') → 'interstate'
 * getGSTType('Delhi', 'delhi') → 'intrastate' (case-insensitive)
 */
export const getGSTType = (companyState, customerState) => {
  if (!companyState || !customerState) {
    return GST_TYPES.INTRASTATE // default fallback
  }
  
  // Normalize state names for comparison
  const normalizedCompanyState = companyState.trim().toLowerCase()
  const normalizedCustomerState = customerState.trim().toLowerCase()
  
  return normalizedCompanyState === normalizedCustomerState 
    ? GST_TYPES.INTRASTATE 
    : GST_TYPES.INTERSTATE
}

/**
 * Calculate tax rates based on GST type and tax rate
 * @param {string} gstType - 'intrastate' or 'interstate'
 * @param {number} taxRate - Base tax rate (e.g., 18)
 * @returns {object} Object with cgst_rate, sgst_rate, igst_rate
 * 
 * Examples:
 * calculateTaxRates('intrastate', 18) → { cgst_rate: 9, sgst_rate: 9, igst_rate: 0 }
 * calculateTaxRates('interstate', 18) → { cgst_rate: 0, sgst_rate: 0, igst_rate: 18 }
 */
export const calculateTaxRates = (gstType, taxRate) => {
  const rate = parseFloat(taxRate) || 0

  if (gstType === GST_TYPES.INTERSTATE) {
    // Interstate: IGST only
    return {
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: rate
    }
  } else {
    // Intrastate: CGST + SGST (split equally)
    return {
      cgst_rate: rate / 2,
      sgst_rate: rate / 2,
      igst_rate: 0
    }
  }
}

/**
 * Calculate tax amounts based on rates and taxable amount
 * @param {number} taxableAmount - Amount on which tax is calculated
 * @param {number} cgstRate - CGST rate percentage
 * @param {number} sgstRate - SGST rate percentage
 * @param {number} igstRate - IGST rate percentage
 * @returns {object} Object with cgst_amount, sgst_amount, igst_amount
 * 
 * Example:
 * calculateTaxAmounts(1000, 9, 9, 0) → { cgst_amount: 90, sgst_amount: 90, igst_amount: 0 }
 */
export const calculateTaxAmounts = (taxableAmount, cgstRate, sgstRate, igstRate) => {
  const amount = parseFloat(taxableAmount) || 0

  return {
    cgst_amount: (amount * parseFloat(cgstRate)) / 100,
    sgst_amount: (amount * parseFloat(sgstRate)) / 100,
    igst_amount: (amount * parseFloat(igstRate)) / 100
  }
}

/**
 * Get total tax amount
 * @param {number} cgstAmount - CGST amount
 * @param {number} sgstAmount - SGST amount
 * @param {number} igstAmount - IGST amount
 * @returns {number} Total tax amount
 * 
 * Example:
 * getTotalTaxAmount(90, 90, 0) → 180
 */
export const getTotalTaxAmount = (cgstAmount, sgstAmount, igstAmount) => {
  return (parseFloat(cgstAmount) || 0) + 
         (parseFloat(sgstAmount) || 0) + 
         (parseFloat(igstAmount) || 0)
}

/**
 * Format tax display for UI
 * @param {object} item - Line item with tax rates
 * @returns {string} Formatted tax display
 * 
 * Examples:
 * formatTaxDisplay({ cgst_rate: 9, sgst_rate: 9, igst_rate: 0 }) → "C: 9.00% | S: 9.00%"
 * formatTaxDisplay({ cgst_rate: 0, sgst_rate: 0, igst_rate: 18 }) → "I: 18.00%"
 */
export const formatTaxDisplay = (item) => {
  if (!item) return ''
  
  if (item.igst_rate > 0) {
    return `I: ${parseFloat(item.igst_rate).toFixed(2)}%`
  } else {
    return `C: ${parseFloat(item.cgst_rate || 0).toFixed(2)}% | S: ${parseFloat(item.sgst_rate || 0).toFixed(2)}%`
  }
}

/**
 * Format tax amounts display for UI
 * @param {object} item - Line item with tax amounts
 * @returns {string} Formatted tax amounts display
 * 
 * Examples:
 * formatTaxAmountsDisplay({ cgst_amount: 90, sgst_amount: 90, igst_amount: 0 }) → "₹180.00"
 * formatTaxAmountsDisplay({ cgst_amount: 0, sgst_amount: 0, igst_amount: 180 }) → "₹180.00"
 */
export const formatTaxAmountsDisplay = (item) => {
  if (!item) return '₹0.00'
  
  const total = getTotalTaxAmount(item.cgst_amount, item.sgst_amount, item.igst_amount)
  return `₹${total.toFixed(2)}`
}

/**
 * Export all tax utilities as an object for convenience
 */
export const TAX_UTILS = {
  getGSTType,
  getGSTStateCode,
  calculateTaxRates,
  calculateTaxAmounts,
  getTotalTaxAmount,
  formatTaxDisplay,
  formatTaxAmountsDisplay
}

// Business types
export const BUSINESS_TYPES = {
  PROPRIETORSHIP: 'proprietorship',
  PARTNERSHIP: 'partnership',
  LLP: 'llp',
  PRIVATE_LIMITED: 'private_limited',
  PUBLIC_LIMITED: 'public_limited',
  OPC: 'one_person_company',
  SECTION_8: 'section_8_company',
  TRUST: 'trust',
  SOCIETY: 'society',
  OTHER: 'other'
}

// Business types for dropdown
export const BUSINESS_TYPES_LIST = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'private_limited', label: 'Private Limited Company' },
  { value: 'public_limited', label: 'Public Limited Company' },
  { value: 'one_person_company', label: 'One Person Company (OPC)' },
  { value: 'section_8_company', label: 'Section 8 Company' },
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'other', label: 'Other' }
]

// Currencies
export const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' }
}

// Currencies for dropdown
export const CURRENCIES_LIST = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' }
]

// Timezones for dropdown
export const TIMEZONES_LIST = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' }
]

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'DD/MM/YYYY HH:mm',
  TIME: 'HH:mm'
}

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[6-9]\d{9}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  AADHAR: /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/
}

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  LOGO_MAX_SIZE: 500 * 1024, // 500KB for logos
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  LOGO_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  LOGO_ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif']
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email'
  },
  COMPANIES: '/api/companies',
  CUSTOMERS: '/api/customers',
  VENDORS: '/api/vendors',
  ITEMS: '/api/items',
  SALES: '/api/sales',
  PURCHASE: '/api/purchase',
  PAYMENTS: '/api/payments',
  REPORTS: '/api/reports',
  GST: '/api/gst'
}

// Storage buckets
export const STORAGE_BUCKETS = {
  COMPANY_ASSETS: 'company-assets',
  DOCUMENTS: 'documents',
  IMAGES: 'images'
}

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.'
}

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
  SENT: 'Sent successfully',
  UPLOADED: 'Uploaded successfully'
}

// Local storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'ezbillify_user_preferences',
  THEME: 'ezbillify_theme',
  SIDEBAR_COLLAPSED: 'ezbillify_sidebar_collapsed',
  RECENT_SEARCHES: 'ezbillify_recent_searches'
}

// Default values
export const DEFAULTS = {
  CURRENCY: 'INR',
  TIMEZONE: 'Asia/Kolkata',
  DATE_FORMAT: 'DD/MM/YYYY',
  DECIMAL_PLACES: 2,
  TAX_RATE: 18,
  PAYMENT_TERMS: 30
}
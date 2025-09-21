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

// Indian states and their GST codes
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

// Currencies
export const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' }
}

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
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
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
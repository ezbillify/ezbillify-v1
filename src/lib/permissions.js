// lib/permissions.js
import { USER_ROLES } from './constants'

// Permission definitions based on your schema (admin, workforce)
export const PERMISSIONS = {
  // Company Management
  MANAGE_COMPANY: 'manage_company',
  VIEW_COMPANY_SETTINGS: 'view_company_settings',
  UPDATE_COMPANY_PROFILE: 'update_company_profile',
  
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // Customer Management
  VIEW_CUSTOMERS: 'view_customers',
  CREATE_CUSTOMER: 'create_customer',
  UPDATE_CUSTOMER: 'update_customer',
  DELETE_CUSTOMER: 'delete_customer',
  EXPORT_CUSTOMERS: 'export_customers',
  
  // Vendor Management
  VIEW_VENDORS: 'view_vendors',
  CREATE_VENDOR: 'create_vendor',
  UPDATE_VENDOR: 'update_vendor',
  DELETE_VENDOR: 'delete_vendor',
  EXPORT_VENDORS: 'export_vendors',
  
  // Item/Inventory Management
  VIEW_ITEMS: 'view_items',
  CREATE_ITEM: 'create_item',
  UPDATE_ITEM: 'update_item',
  DELETE_ITEM: 'delete_item',
  MANAGE_INVENTORY: 'manage_inventory',
  ADJUST_STOCK: 'adjust_stock',
  VIEW_STOCK_REPORTS: 'view_stock_reports',
  
  // Sales Documents
  VIEW_SALES_DOCUMENTS: 'view_sales_documents',
  CREATE_INVOICE: 'create_invoice',
  UPDATE_INVOICE: 'update_invoice',
  DELETE_INVOICE: 'delete_invoice',
  SEND_INVOICE: 'send_invoice',
  CREATE_QUOTATION: 'create_quotation',
  UPDATE_QUOTATION: 'update_quotation',
  DELETE_QUOTATION: 'delete_quotation',
  CREATE_SALES_ORDER: 'create_sales_order',
  UPDATE_SALES_ORDER: 'update_sales_order',
  DELETE_SALES_ORDER: 'delete_sales_order',
  
  // Purchase Documents
  VIEW_PURCHASE_DOCUMENTS: 'view_purchase_documents',
  CREATE_PURCHASE_ORDER: 'create_purchase_order',
  UPDATE_PURCHASE_ORDER: 'update_purchase_order',
  DELETE_PURCHASE_ORDER: 'delete_purchase_order',
  CREATE_BILL: 'create_bill',
  UPDATE_BILL: 'update_bill',
  DELETE_BILL: 'delete_bill',
  
  // Payments
  VIEW_PAYMENTS: 'view_payments',
  CREATE_PAYMENT: 'create_payment',
  UPDATE_PAYMENT: 'update_payment',
  DELETE_PAYMENT: 'delete_payment',
  RECONCILE_PAYMENTS: 'reconcile_payments',
  
  // Accounting
  VIEW_ACCOUNTING: 'view_accounting',
  MANAGE_CHART_OF_ACCOUNTS: 'manage_chart_of_accounts',
  CREATE_JOURNAL_ENTRY: 'create_journal_entry',
  UPDATE_JOURNAL_ENTRY: 'update_journal_entry',
  DELETE_JOURNAL_ENTRY: 'delete_journal_entry',
  VIEW_LEDGER: 'view_ledger',
  MANAGE_BANK_ACCOUNTS: 'manage_bank_accounts',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  GENERATE_SALES_REPORTS: 'generate_sales_reports',
  GENERATE_PURCHASE_REPORTS: 'generate_purchase_reports',
  GENERATE_INVENTORY_REPORTS: 'generate_inventory_reports',
  GENERATE_FINANCIAL_REPORTS: 'generate_financial_reports',
  GENERATE_TAX_REPORTS: 'generate_tax_reports',
  EXPORT_REPORTS: 'export_reports',
  SCHEDULE_REPORTS: 'schedule_reports',
  
  // GST & Compliance
  MANAGE_GST: 'manage_gst',
  GENERATE_GSTR: 'generate_gstr',
  FILE_GST_RETURNS: 'file_gst_returns',
  MANAGE_E_INVOICING: 'manage_e_invoicing',
  MANAGE_E_WAY_BILLS: 'manage_e_way_bills',
  
  // Master Data
  MANAGE_TAX_RATES: 'manage_tax_rates',
  MANAGE_UNITS: 'manage_units',
  MANAGE_PAYMENT_TERMS: 'manage_payment_terms',
  MANAGE_DOCUMENT_SEQUENCES: 'manage_document_sequences',
  
  // System & Integrations
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_PRINT_TEMPLATES: 'manage_print_templates',
  MANAGE_EMAIL_TEMPLATES: 'manage_email_templates',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  
  // Data Management
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  BACKUP_DATA: 'backup_data'
}

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Full access to everything
    ...Object.values(PERMISSIONS)
  ],
  
  [USER_ROLES.WORKFORCE]: [
    // Limited access for workforce users
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.UPDATE_CUSTOMER,
    
    PERMISSIONS.VIEW_ITEMS,
    PERMISSIONS.VIEW_STOCK_REPORTS,
    
    PERMISSIONS.VIEW_SALES_DOCUMENTS,
    PERMISSIONS.CREATE_INVOICE,
    PERMISSIONS.CREATE_QUOTATION,
    PERMISSIONS.SEND_INVOICE,
    
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.CREATE_PAYMENT,
    
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_SALES_REPORTS,
    
    PERMISSIONS.EXPORT_DATA
  ]
}

// Permission checker class
export class PermissionChecker {
  constructor(userRole, customPermissions = []) {
    this.userRole = userRole
    this.rolePermissions = ROLE_PERMISSIONS[userRole] || []
    this.customPermissions = customPermissions
    this.allPermissions = [...this.rolePermissions, ...customPermissions]
  }

  // Check if user has a specific permission
  hasPermission(permission) {
    return this.allPermissions.includes(permission)
  }

  // Check if user has any of the provided permissions
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission))
  }

  // Check if user has all of the provided permissions
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission))
  }

  // Get all permissions for the user
  getAllPermissions() {
    return [...this.allPermissions]
  }

  // Check if user can perform action on resource
  canPerform(action, resource, context = {}) {
    const permission = `${action}_${resource}`
    
    // Check basic permission
    if (!this.hasPermission(permission)) {
      return false
    }
    
    // Additional context-based checks
    if (context.isOwn && !this.hasPermission('manage_own_data')) {
      // Some actions might be allowed on own data even without full permission
      const ownDataActions = [
        'view_own_profile',
        'update_own_profile',
        'view_own_documents'
      ]
      return ownDataActions.includes(`${action}_own_${resource}`)
    }
    
    return true
  }

  // Check resource-level permissions
  canAccessResource(resource, action = 'view') {
    const resourcePermissions = {
      company: [PERMISSIONS.VIEW_COMPANY_SETTINGS, PERMISSIONS.MANAGE_COMPANY],
      users: [PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_USERS],
      customers: [PERMISSIONS.VIEW_CUSTOMERS, PERMISSIONS.CREATE_CUSTOMER],
      vendors: [PERMISSIONS.VIEW_VENDORS, PERMISSIONS.CREATE_VENDOR],
      items: [PERMISSIONS.VIEW_ITEMS, PERMISSIONS.CREATE_ITEM],
      sales: [PERMISSIONS.VIEW_SALES_DOCUMENTS, PERMISSIONS.CREATE_INVOICE],
      purchase: [PERMISSIONS.VIEW_PURCHASE_DOCUMENTS, PERMISSIONS.CREATE_PURCHASE_ORDER],
      payments: [PERMISSIONS.VIEW_PAYMENTS, PERMISSIONS.CREATE_PAYMENT],
      accounting: [PERMISSIONS.VIEW_ACCOUNTING, PERMISSIONS.MANAGE_CHART_OF_ACCOUNTS],
      reports: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.GENERATE_SALES_REPORTS],
      gst: [PERMISSIONS.MANAGE_GST, PERMISSIONS.GENERATE_GSTR],
      settings: [PERMISSIONS.MANAGE_SYSTEM_SETTINGS, PERMISSIONS.VIEW_COMPANY_SETTINGS]
    }
    
    const permissions = resourcePermissions[resource] || []
    return this.hasAnyPermission(permissions)
  }
}

// Helper functions
export const createPermissionChecker = (userRole, customPermissions = []) => {
  return new PermissionChecker(userRole, customPermissions)
}

export const checkPermission = (userRole, permission, customPermissions = []) => {
  const checker = createPermissionChecker(userRole, customPermissions)
  return checker.hasPermission(permission)
}

export const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || []
}

export const getUserPermissions = (userProfile) => {
  if (!userProfile || !userProfile.role) {
    return []
  }
  
  const rolePermissions = getPermissionsForRole(userProfile.role)
  const customPermissions = userProfile.permissions ? 
    Object.keys(userProfile.permissions).filter(key => userProfile.permissions[key]) : []
  
  return [...rolePermissions, ...customPermissions]
}

// Permission validation for API routes
export const validatePermission = (requiredPermission) => {
  return (userRole, customPermissions = []) => {
    const checker = createPermissionChecker(userRole, customPermissions)
    return checker.hasPermission(requiredPermission)
  }
}

// Permission groups for UI rendering
export const PERMISSION_GROUPS = {
  COMPANY_MANAGEMENT: {
    title: 'Company Management',
    permissions: [
      PERMISSIONS.MANAGE_COMPANY,
      PERMISSIONS.VIEW_COMPANY_SETTINGS,
      PERMISSIONS.UPDATE_COMPANY_PROFILE
    ]
  },
  
  USER_MANAGEMENT: {
    title: 'User Management',
    permissions: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.CREATE_USER,
      PERMISSIONS.UPDATE_USER,
      PERMISSIONS.DELETE_USER
    ]
  },
  
  SALES_MANAGEMENT: {
    title: 'Sales Management',
    permissions: [
      PERMISSIONS.VIEW_SALES_DOCUMENTS,
      PERMISSIONS.CREATE_INVOICE,
      PERMISSIONS.UPDATE_INVOICE,
      PERMISSIONS.DELETE_INVOICE,
      PERMISSIONS.SEND_INVOICE,
      PERMISSIONS.CREATE_QUOTATION,
      PERMISSIONS.CREATE_SALES_ORDER
    ]
  },
  
  PURCHASE_MANAGEMENT: {
    title: 'Purchase Management',
    permissions: [
      PERMISSIONS.VIEW_PURCHASE_DOCUMENTS,
      PERMISSIONS.CREATE_PURCHASE_ORDER,
      PERMISSIONS.CREATE_BILL,
      PERMISSIONS.UPDATE_BILL,
      PERMISSIONS.DELETE_BILL
    ]
  },
  
  INVENTORY_MANAGEMENT: {
    title: 'Inventory Management',
    permissions: [
      PERMISSIONS.VIEW_ITEMS,
      PERMISSIONS.CREATE_ITEM,
      PERMISSIONS.UPDATE_ITEM,
      PERMISSIONS.DELETE_ITEM,
      PERMISSIONS.MANAGE_INVENTORY,
      PERMISSIONS.ADJUST_STOCK
    ]
  },
  
  FINANCIAL_MANAGEMENT: {
    title: 'Financial Management',
    permissions: [
      PERMISSIONS.VIEW_PAYMENTS,
      PERMISSIONS.CREATE_PAYMENT,
      PERMISSIONS.VIEW_ACCOUNTING,
      PERMISSIONS.MANAGE_CHART_OF_ACCOUNTS,
      PERMISSIONS.CREATE_JOURNAL_ENTRY,
      PERMISSIONS.MANAGE_BANK_ACCOUNTS
    ]
  },
  
  REPORTS_ANALYTICS: {
    title: 'Reports & Analytics',
    permissions: [
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.GENERATE_SALES_REPORTS,
      PERMISSIONS.GENERATE_PURCHASE_REPORTS,
      PERMISSIONS.GENERATE_INVENTORY_REPORTS,
      PERMISSIONS.GENERATE_FINANCIAL_REPORTS,
      PERMISSIONS.EXPORT_REPORTS
    ]
  },
  
  COMPLIANCE_GST: {
    title: 'Compliance & GST',
    permissions: [
      PERMISSIONS.MANAGE_GST,
      PERMISSIONS.GENERATE_GSTR,
      PERMISSIONS.FILE_GST_RETURNS,
      PERMISSIONS.MANAGE_E_INVOICING,
      PERMISSIONS.MANAGE_E_WAY_BILLS
    ]
  },
  
  SYSTEM_ADMINISTRATION: {
    title: 'System Administration',
    permissions: [
      PERMISSIONS.MANAGE_INTEGRATIONS,
      PERMISSIONS.VIEW_AUDIT_LOGS,
      PERMISSIONS.MANAGE_PRINT_TEMPLATES,
      PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
      PERMISSIONS.BACKUP_DATA
    ]
  }
}

// Default permissions that every authenticated user should have
export const DEFAULT_PERMISSIONS = [
  PERMISSIONS.VIEW_SALES_DOCUMENTS,
  PERMISSIONS.VIEW_CUSTOMERS,
  PERMISSIONS.VIEW_ITEMS,
  PERMISSIONS.VIEW_REPORTS
]

// Dangerous permissions that require extra confirmation
export const DANGEROUS_PERMISSIONS = [
  PERMISSIONS.DELETE_USER,
  PERMISSIONS.DELETE_INVOICE,
  PERMISSIONS.DELETE_BILL,
  PERMISSIONS.DELETE_CUSTOMER,
  PERMISSIONS.DELETE_VENDOR,
  PERMISSIONS.BACKUP_DATA,
  PERMISSIONS.MANAGE_SYSTEM_SETTINGS
]

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PermissionChecker,
  createPermissionChecker,
  checkPermission,
  getPermissionsForRole,
  getUserPermissions,
  validatePermission,
  PERMISSION_GROUPS,
  DEFAULT_PERMISSIONS,
  DANGEROUS_PERMISSIONS
}
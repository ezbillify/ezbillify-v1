// src/components/dashboard/DashboardLayout.js
import React from 'react'
import AppLayout from '../shared/layout/AppLayout'

const DashboardLayout = ({ children, title = "Dashboard", actions, breadcrumbs }) => {
  const defaultBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard', current: true }
  ]

  const defaultActions = [
    {
      label: 'Create Invoice',
      href: '/sales/invoices/new',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      label: 'Quick Actions',
      variant: 'outline',
      dropdown: [
        { label: 'Add Customer', href: '/sales/customers/new' },
        { label: 'Add Vendor', href: '/purchase/vendors/new' },
        { label: 'Add Item', href: '/items/items/new' },
        { label: 'Create Quotation', href: '/sales/quotations/new' }
      ]
    }
  ]

  return (
    <AppLayout 
      title={title}
      breadcrumbs={breadcrumbs || defaultBreadcrumbs}
      actions={actions || defaultActions}
    >
      {children}
    </AppLayout>
  )
}

export default DashboardLayout

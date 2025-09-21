// src/components/shared/ui/Table.js
import React, { useState } from 'react'
import Badge from './Badge'
import Loading from './Loading'

const Table = ({ 
  children, 
  className = '',
  striped = true,
  hover = true,
  bordered = true,
  responsive = true
}) => {
  const tableClasses = `
    min-w-full divide-y divide-slate-200 
    ${striped ? 'table-striped' : ''}
    ${hover ? 'table-hover' : ''}
    ${bordered ? 'border border-slate-200 rounded-xl' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim()

  const TableElement = () => (
    <table className={tableClasses}>
      {children}
    </table>
  )

  if (responsive) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg shadow-slate-200/50">
        <TableElement />
      </div>
    )
  }

  return <TableElement />
}

export const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-gradient-to-r from-slate-50 to-slate-100/80 ${className}`}>
    {children}
  </thead>
)

export const TableBody = ({ children, loading = false, emptyMessage = 'No data available' }) => {
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan="100%" className="px-6 py-12 text-center">
            <Loading size="lg" text="Loading data..." />
          </td>
        </tr>
      </tbody>
    )
  }

  if (!children || (Array.isArray(children) && children.length === 0)) {
    return (
      <tbody>
        <tr>
          <td colSpan="100%" className="px-6 py-12 text-center">
            <div className="flex flex-col items-center space-y-3">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-slate-500 font-medium">{emptyMessage}</p>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className="bg-white divide-y divide-slate-200">
      {children}
    </tbody>
  )
}

export const TableRow = ({ 
  children, 
  className = '', 
  onClick,
  selected = false,
  ...props 
}) => {
  const clickableClasses = onClick ? 'cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors duration-150' : ''
  const selectedClasses = selected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
  
  return (
    <tr 
      className={`${clickableClasses} ${selectedClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  )
}

export const TableCell = ({ 
  children, 
  className = '',
  align = 'left',
  ...props 
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  return (
    <td 
      className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 ${alignClasses[align]} ${className}`}
      {...props}
    >
      {children}
    </td>
  )
}

export const TableHeader = ({ 
  children, 
  className = '',
  sortable = false,
  sorted = null,
  onSort,
  align = 'left'
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center', 
    right: 'text-right'
  }

  const handleSort = () => {
    if (sortable && onSort) {
      const newDirection = sorted === 'asc' ? 'desc' : 'asc'
      onSort(newDirection)
    }
  }

  return (
    <th 
      className={`
        px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-wider
        ${alignClasses[align]} ${sortable ? 'cursor-pointer hover:bg-slate-200 transition-colors select-none' : ''}
        ${className}
      `}
      onClick={handleSort}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {sortable && (
          <div className="flex flex-col">
            <svg 
              className={`w-3 h-3 ${sorted === 'asc' ? 'text-blue-600' : 'text-slate-400'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
            </svg>
            <svg 
              className={`w-3 h-3 -mt-1 ${sorted === 'desc' ? 'text-blue-600' : 'text-slate-400'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        )}
      </div>
    </th>
  )
}

// Specialized Table Components for EzBillify
export const InvoiceTable = ({ invoices = [], onRowClick, loading = false }) => {
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const handleSort = (field) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(direction)
  }

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortField) return 0
    
    const aVal = a[sortField]
    const bVal = b[sortField]
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader 
            sortable 
            sorted={sortField === 'document_number' ? sortDirection : null}
            onSort={() => handleSort('document_number')}
          >
            Invoice #
          </TableHeader>
          <TableHeader 
            sortable
            sorted={sortField === 'customer_name' ? sortDirection : null}
            onSort={() => handleSort('customer_name')}
          >
            Customer
          </TableHeader>
          <TableHeader 
            sortable
            sorted={sortField === 'document_date' ? sortDirection : null}
            onSort={() => handleSort('document_date')}
          >
            Date
          </TableHeader>
          <TableHeader 
            sortable
            sorted={sortField === 'total_amount' ? sortDirection : null}
            onSort={() => handleSort('total_amount')}
            align="right"
          >
            Amount
          </TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader align="center">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody loading={loading} emptyMessage="No invoices found">
        {sortedInvoices.map((invoice) => (
          <TableRow 
            key={invoice.id} 
            onClick={() => onRowClick && onRowClick(invoice)}
          >
            <TableCell>
              <div className="font-semibold text-blue-600">
                {invoice.document_number}
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{invoice.customer_name}</div>
                {invoice.customer_gstin && (
                  <div className="text-xs text-slate-500">
                    GSTIN: {invoice.customer_gstin}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-slate-600">
                {new Date(invoice.document_date).toLocaleDateString()}
              </div>
              {invoice.due_date && (
                <div className="text-xs text-slate-500">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </div>
              )}
            </TableCell>
            <TableCell align="right">
              <div className="font-bold text-lg">
                ₹{invoice.total_amount?.toLocaleString()}
              </div>
              {invoice.paid_amount > 0 && (
                <div className="text-xs text-green-600">
                  Paid: ₹{invoice.paid_amount?.toLocaleString()}
                </div>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={invoice.status}>
                {invoice.status}
              </Badge>
            </TableCell>
            <TableCell align="center">
              <div className="flex items-center justify-center space-x-2">
                <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button className="p-1 text-slate-400 hover:text-green-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button className="p-1 text-slate-400 hover:text-amber-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const CustomerTable = ({ customers = [], onRowClick, loading = false }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Customer</TableHeader>
          <TableHeader>Type</TableHeader>
          <TableHeader>Contact</TableHeader>
          <TableHeader>GSTIN</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader align="center">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody loading={loading} emptyMessage="No customers found">
        {customers.map((customer) => (
          <TableRow 
            key={customer.id}
            onClick={() => onRowClick && onRowClick(customer)}
          >
            <TableCell>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-slate-500">{customer.customer_code}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={customer.customer_type === 'b2b' ? 'primary' : 'success'}>
                {customer.customer_type.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell>
              <div>
                {customer.email && (
                  <div className="text-sm">{customer.email}</div>
                )}
                {customer.phone && (
                  <div className="text-xs text-slate-500">{customer.phone}</div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="font-mono text-sm">
                {customer.gstin || 'N/A'}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={customer.status === 'active' ? 'success' : 'default'}>
                {customer.status}
              </Badge>
            </TableCell>
            <TableCell align="center">
              <div className="flex items-center justify-center space-x-2">
                <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button className="p-1 text-slate-400 hover:text-amber-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default Table

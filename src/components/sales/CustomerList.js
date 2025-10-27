// src/components/sales/CustomerList.js
'use client';

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import Select from '../shared/ui/Select'
import { SearchInput } from '../shared/ui/Input'
import { PAGINATION } from '../../lib/constants'
import CustomerImportExport from './CustomerImportExport'
import { 
  Users, 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react'

const CustomerList = ({ companyId }) => {
  const router = useRouter()
  const { company } = useAuth()
  const { success, error: showError } = useToast()
  
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    type: null,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE
  })
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1
  })
  const [showImportExport, setShowImportExport] = useState(false)

  useEffect(() => {
    if (company?.id) {
      loadCustomers()
    }
  }, [company?.id, filters])

  useEffect(() => {
    if (company?.id) {
      loadStats()
    }
  }, [company?.id])

  const loadCustomers = async () => {
    setLoading(true)
    const result = await customerService.getCustomers(company.id, filters)
    
    if (result.success) {
      setCustomers(result.data.customers)
      setPagination({
        total: result.data.total,
        totalPages: result.data.totalPages,
        currentPage: result.data.page
      })
    } else {
      showError('Failed to load customers')
    }
    
    setLoading(false)
  }

  const loadStats = async () => {
    const result = await customerService.getCustomerStats(company.id)
    if (result.success) {
      setStats(result.data)
    }
  }

  const handleSearchChange = (searchTerm) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }))
  }

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleDeleteCustomer = async (customerId, customerName) => {
    if (!confirm(`Are you sure you want to delete ${customerName}?`)) return

    const result = await customerService.deleteCustomer(customerId, company.id)
    
    if (result.success) {
      success('Customer deleted successfully')
      loadCustomers()
      loadStats()
    } else {
      showError(result.error)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const getTypeBadge = (type) => {
    const styles = {
      b2b: 'bg-blue-100 text-blue-800',
      b2c: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type.toUpperCase()}
      </span>
    )
  }

  const typeOptions = [
    { value: null, label: 'All Types' },
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' }
  ]

  const totalPages = Math.ceil(pagination.total / filters.limit);

  return (
    <div className="space-y-6">
      {/* Header Section with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
              <p className="text-slate-600 text-sm mt-0.5">Manage your customer database</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <div className="text-center">
              <p className="text-xs text-slate-600 font-medium">Total Customers</p>
              <p className="text-xl font-bold text-slate-900">{stats?.total || 0}</p>
            </div>
            <div className="w-px h-10 bg-slate-300"></div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowImportExport(true)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          >
            Import/Export
          </Button>

          <Button
            variant="primary"
            onClick={() => router.push('/sales/customers/new')}
            icon={<Plus className="w-5 h-5" />}
            className="shadow-lg shadow-blue-500/30"
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput
              placeholder="Search customers by name, code, email..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onSearch={handleSearchChange}
            />
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2">
            <span className="text-sm text-slate-600 font-medium">
              {pagination.total} customer{pagination.total !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No customers found</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              {filters.search || filters.type
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first customer'}
            </p>
            {!filters.search && (
              <Button
                variant="primary"
                onClick={() => router.push('/sales/customers/new')}
                icon={<Plus className="w-5 h-5" />}
              >
                Add Your First Customer
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Code
                    </th>

                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer
                    </th>

                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Contact
                    </th>

                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        Receivable
                      </div>
                    </th>

                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-green-500" />
                        Advance
                      </div>
                    </th>

                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-100">
                  {customers.map((customer) => {
                    const hasAdvance = customer.advance_amount && parseFloat(customer.advance_amount) > 0;
                    const hasBalance = customer.current_balance && parseFloat(customer.current_balance) > 0;
                    
                    return (
                      <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">
                            {customer.customer_code}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {customer.name}
                            </div>
                            {customer.customer_type === 'b2b' && customer.company_name && (
                              <div className="text-xs text-slate-600 truncate mt-1">
                                {customer.company_name}
                              </div>
                            )}
                            {customer.customer_type && (
                              <div className="mt-1">
                                {getTypeBadge(customer.customer_type)}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="text-sm text-slate-700 truncate max-w-xs">{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div className="text-xs text-slate-500 font-mono">{customer.phone}</div>
                            )}
                            {!customer.email && !customer.phone && (
                              <div className="text-sm text-slate-400">-</div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {hasBalance ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-lg border border-red-200">
                              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-sm font-bold text-red-600">
                                {formatCurrency(customer.current_balance)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 font-medium">₹0.00</div>
                          )}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {hasAdvance ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300 shadow-sm">
                              <Sparkles className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(customer.advance_amount)}
                              </span>
                              <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 font-medium">-</div>
                          )}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ledger Button */}
                            <button
                              onClick={() => router.push(`/sales/customers/${customer.id}/ledger`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="View Ledger"
                            >
                              <FileText className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* View Button */}
                            <button
                              onClick={() => router.push(`/sales/customers/${customer.id}`)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md group/btn"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => router.push(`/sales/customers/${customer.id}?edit=true`)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="Edit Customer"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            {customers.length > 0 && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Per page selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 font-medium">Rows per page:</span>
                    <Select
                      value={filters.limit}
                      onChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
                      options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                        value: size,
                        label: `${size}`
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {((pagination.currentPage - 1) * filters.limit) + 1}
                      </span>
                      {' '}-{' '}
                      <span className="font-semibold text-slate-900">
                        {Math.min(pagination.currentPage * filters.limit, pagination.total)}
                      </span>
                      {' '}of{' '}
                      <span className="font-semibold text-slate-900">{pagination.total}</span>
                    </span>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="font-medium"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {/* First page */}
                        {pagination.currentPage > 3 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="px-3 py-1.5 text-sm rounded-lg transition-all text-slate-700 hover:bg-white font-medium border border-transparent hover:border-slate-200 hover:shadow-sm"
                            >
                              1
                            </button>
                            <span className="px-2 text-slate-400">...</span>
                          </>
                        )}

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
                          .map(page => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-all font-medium ${
                                pagination.currentPage === page
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-600'
                                  : 'text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                        {/* Last page */}
                        {pagination.currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 text-slate-400">...</span>
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              className="px-3 py-1.5 text-sm rounded-lg transition-all text-slate-700 hover:bg-white font-medium border border-transparent hover:border-slate-200 hover:shadow-sm"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === totalPages}
                        className="font-medium"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <CustomerImportExport
        companyId={company.id}
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onImportComplete={() => {
          setShowImportExport(false)
          loadCustomers()
          loadStats()
        }}
      />
    </div>
  )
}

export default CustomerList
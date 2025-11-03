// src/components/sales/CustomerView.js - UPDATED WITH DISCOUNT & CREDIT INFO
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import { AlertCircle, TrendingUp, PercentSquare } from 'lucide-react'

const CustomerView = ({ customerId }) => {
  const router = useRouter()
  const { company } = useAuth()
  const { success, error: showError } = useToast()
  
  const [customer, setCustomer] = useState(null)
  const [creditInfo, setCreditInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ledger, setLedger] = useState(null)

  useEffect(() => {
    if (customerId && company?.id) {
      loadCustomer()
      loadCreditInfo()
      loadLedger()
    }
  }, [customerId, company?.id])

  const loadCustomer = async () => {
    const result = await customerService.getCustomer(customerId, company.id)
    
    if (result.success) {
      setCustomer(result.data)
    } else {
      showError('Failed to load customer details')
    }
  }

  const loadCreditInfo = async () => {
    try {
      const response = await fetch(
        `/api/customers/${customerId}/credit-info?company_id=${company.id}`
      )
      const data = await response.json()
      
      if (data.success) {
        setCreditInfo(data.data)
      }
    } catch (err) {
      console.error('Error loading credit info:', err)
    }
  }

  const loadLedger = async () => {
    const result = await customerService.getCustomerLedger(customerId, company.id)
    
    if (result.success) {
      setLedger(result.data.ledger)
    }
    
    setLoading(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const getTypeBadge = (type) => {
    const styles = {
      b2b: 'bg-blue-100 text-blue-800',
      b2c: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[type]}`}>
        {type.toUpperCase()}
      </span>
    )
  }

  // ✅ NEW: Get credit status styling
  const getCreditStatusStyle = (status) => {
    const styles = {
      unlimited: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', label: 'Unlimited' },
      available: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', label: 'Available' },
      limited: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', label: 'Limited' },
      exceeded: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', label: 'Exceeded' }
    }
    return styles[status] || styles.available
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Customer Not Found</h2>
          <p className="text-slate-600 mb-4">The customer you're looking for doesn't exist.</p>
          <Button
            variant="primary"
            onClick={() => router.push('/sales/customers')}
          >
            Back to Customers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
            {getTypeBadge(customer.customer_type)}
          </div>
          {customer.customer_type === 'b2b' && customer.company_name && (
            <p className="text-slate-600 text-lg font-medium">{customer.company_name}</p>
          )}
          <p className="text-slate-600">Customer ID: {customer.customer_code}</p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/sales/customers/${customerId}?edit=true`)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit Customer
          </Button>
          
          <Button
            variant="primary"
            onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.customer_type === 'b2b' && customer.company_name && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Company Name</label>
                  <p className="text-slate-900 font-medium">{customer.company_name}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500">
                  {customer.customer_type === 'b2b' ? 'Contact Person' : 'Customer Name'}
                </label>
                <p className="text-slate-900 font-medium">{customer.name}</p>
              </div>

              {customer.display_name && customer.display_name !== customer.name && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Display Name</label>
                  <p className="text-slate-900">{customer.display_name}</p>
                </div>
              )}

              {customer.designation && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Designation</label>
                  <p className="text-slate-900">{customer.designation}</p>
                </div>
              )}

              {customer.email && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Email</label>
                  <p className="text-slate-900">{customer.email}</p>
                </div>
              )}

              {customer.phone && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Phone</label>
                  <p className="text-slate-900">{customer.phone}</p>
                </div>
              )}

              {customer.mobile && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Mobile</label>
                  <p className="text-slate-900">{customer.mobile}</p>
                </div>
              )}

              {customer.website && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Website</label>
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    {customer.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Business Details (B2B only) */}
          {customer.customer_type === 'b2b' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Business Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.gstin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500">GSTIN</label>
                    <p className="text-slate-900 font-mono">{customer.gstin}</p>
                  </div>
                )}

                {customer.pan && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500">PAN</label>
                    <p className="text-slate-900 font-mono">{customer.pan}</p>
                  </div>
                )}

                {customer.business_type && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Business Type</label>
                    <p className="text-slate-900 capitalize">{customer.business_type.replace('_', ' ')}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-500">Tax Preference</label>
                  <p className="text-slate-900 capitalize">{customer.tax_preference}</p>
                </div>
              </div>
            </div>
          )}

          {/* Address Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Address */}
              {customer.billing_address && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3">Billing Address</h3>
                  <div className="text-slate-700 space-y-1">
                    {customer.billing_address.address_line_1 && <p>{customer.billing_address.address_line_1}</p>}
                    {customer.billing_address.address_line_2 && <p>{customer.billing_address.address_line_2}</p>}
                    <p>
                      {[
                        customer.billing_address.city,
                        customer.billing_address.state,
                        customer.billing_address.pincode
                      ].filter(Boolean).join(', ')}
                    </p>
                    {customer.billing_address.country && <p>{customer.billing_address.country}</p>}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {customer.shipping_address && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3">Shipping Address</h3>
                  <div className="text-slate-700 space-y-1">
                    {customer.shipping_address.address_line_1 && <p>{customer.shipping_address.address_line_1}</p>}
                    {customer.shipping_address.address_line_2 && <p>{customer.shipping_address.address_line_2}</p>}
                    <p>
                      {[
                        customer.shipping_address.city,
                        customer.shipping_address.state,
                        customer.shipping_address.pincode
                      ].filter(Boolean).join(', ')}
                    </p>
                    {customer.shipping_address.country && <p>{customer.shipping_address.country}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Notes</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* ✅ NEW: Pricing & Discount Section */}
          {(customer.discount_percentage > 0) && (
            <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PercentSquare className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-amber-900">Customer Discount</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-amber-700">Fixed Discount</span>
                  <span className="font-bold text-2xl text-amber-600">{parseFloat(customer.discount_percentage).toFixed(2)}%</span>
                </div>
                <p className="text-sm text-amber-700">Applied to all invoices</p>
              </div>
            </div>
          )}

          {/* Account Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Credit Limit</span>
                <span className="font-medium text-slate-900">
                  {customer.credit_limit === 0 ? 'Unlimited' : formatCurrency(customer.credit_limit)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Terms</span>
                <span className="font-medium text-slate-900">
                  {customer.payment_terms === 0 ? 'Immediate' : `${customer.payment_terms} days`}
                </span>
              </div>

              {ledger && (
                <>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Opening Balance</span>
                      <span className="font-medium text-slate-900">{formatCurrency(ledger.opening_balance)}</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-slate-600">Current Balance</span>
                      <span className={`font-bold ${ledger.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(ledger.current_balance))}
                        {ledger.current_balance >= 0 ? ' (Dr)' : ' (Cr)'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push(`/sales/customers/${customerId}/ledger`)}
              >
                View Ledger
              </Button>
            </div>
          </div>

          {/* ✅ NEW: Credit Status */}
          {creditInfo && (
            <div className={`rounded-2xl shadow-sm border p-6 ${getCreditStatusStyle(creditInfo.credit_status).bg} ${getCreditStatusStyle(creditInfo.credit_status).border}`}>
              <div className="flex items-center gap-2 mb-4">
                {creditInfo.credit_status === 'exceeded' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {creditInfo.credit_status === 'limited' && (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
                {creditInfo.credit_status !== 'exceeded' && creditInfo.credit_status !== 'limited' && (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                )}
                <h2 className={`text-lg font-semibold ${getCreditStatusStyle(creditInfo.credit_status).text}`}>
                  {getCreditStatusStyle(creditInfo.credit_status).label}
                </h2>
              </div>
              
              <div className={`space-y-2 text-sm ${getCreditStatusStyle(creditInfo.credit_status).text}`}>
                <p>{creditInfo.summary.display_text}</p>
                {creditInfo.summary.warning && (
                  <p className="font-semibold">⚠️ Action Required</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Create Invoice
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push(`/sales/quotations/new?customer=${customerId}`)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                }
              >
                Create Quote
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push(`/sales/payments/new?customer=${customerId}`)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              >
                Record Payment
              </Button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Transactions</h2>
            <p className="text-slate-500 text-center py-8">No recent transactions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerView
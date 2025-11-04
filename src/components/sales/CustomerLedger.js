// src/components/sales/CustomerLedger.js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import Modal from '../shared/overlay/Modal'
import InvoiceView from './InvoiceView'
import PaymentView from './PaymentView'

const CustomerLedger = ({ customerId }) => {
  const router = useRouter()
  const { company } = useAuth()
  const { success, error: showError } = useToast()
  
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    transactionType: ''
  })
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [modalTitle, setModalTitle] = useState('')

  useEffect(() => {
    if (customerId && company?.id) {
      loadCustomer()
      loadLedgerData()
    }
  }, [customerId, company?.id, filters])

  const loadCustomer = async () => {
    const result = await customerService.getCustomer(customerId, company.id)
    if (result.success) {
      setCustomer(result.data)
    }
  }

  const loadLedgerData = async () => {
    if (!customerId || !company?.id) return

    setLoading(true)
    
    try {
      const result = await customerService.getCustomerLedger(customerId, company.id, filters)
      
      if (result.success) {
        const { data } = result
        setTransactions(data.transactions || [])
        setSummary(data.summary || {
          opening_balance: customer?.opening_balance || 0,
          total_sales: data.summary?.total_sales || 0,
          total_payments: data.summary?.total_payments || 0,
          current_balance: data.summary?.current_balance || customer?.opening_balance || 0
        })
      } else {
        setTransactions([])
        setSummary({
          opening_balance: customer?.opening_balance || 0,
          total_sales: 0,
          total_payments: 0,
          current_balance: customer?.opening_balance || 0
        })
      }
    } catch (error) {
      showError('Failed to load ledger data')
      setTransactions([])
      setSummary(null)
    }
    
    setLoading(false)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Function to open invoice in modal
  const openInvoiceModal = (invoiceId, invoiceNumber) => {
    setModalContent(
      <InvoiceView invoiceId={invoiceId} companyId={company.id} />
    );
    setModalTitle(`Invoice #${invoiceNumber}`);
    setModalOpen(true);
  };

  // Function to open payment in modal
  const openPaymentModal = (paymentId, paymentNumber) => {
    setModalContent(
      <PaymentView paymentId={paymentId} companyId={company.id} />
    );
    setModalTitle(`Payment #${paymentNumber}`);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h3 className="text-lg font-medium text-slate-900">Customer not found</h3>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push('/sales/customers')}
          >
            Back to Customers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.name} - Ledger</h1>
          <p className="text-slate-600 mt-1">
            {customer.customer_type?.toUpperCase()} Customer
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/sales/customers/${customerId}`)}
          >
            Back to Customer
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Opening Balance</h3>
            <p className="text-lg font-semibold mt-1">
              {formatCurrency(summary.opening_balance)}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Total Sales</h3>
            <p className="text-lg font-semibold mt-1 text-red-600">
              {formatCurrency(summary.total_sales)}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Total Payments</h3>
            <p className="text-lg font-semibold mt-1 text-green-600">
              {formatCurrency(summary.total_payments)}
            </p>
          </div>
        </div>
      )}

      {/* Current Balance */}
      {summary && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Current Balance</h3>
            <p className={`text-xl font-bold ${summary.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(summary.current_balance))}
              <span className="text-base font-normal ml-2">
                {summary.current_balance >= 0 ? '(Dr)' : '(Cr)'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ dateFrom: '', dateTo: '', transactionType: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Transactions</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No transactions found</h3>
            <p className="text-slate-500">
              {Object.values(filters).some(v => v) 
                ? 'No transactions match your current filters.'
                : 'No transactions recorded for this customer yet.'
              }
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
            >
              Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {/* Opening Balance Row */}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    Opening Balance
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                    {summary.opening_balance >= 0 ? formatCurrency(summary.opening_balance) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                    {summary.opening_balance < 0 ? formatCurrency(Math.abs(summary.opening_balance)) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                    <span className={summary.opening_balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(Math.abs(summary.opening_balance))}
                      <span className="ml-1">
                        {summary.opening_balance >= 0 ? '(Dr)' : '(Cr)'}
                      </span>
                    </span>
                  </td>
                </tr>

                {/* Transaction Rows */}
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(transaction.date)}
                      {transaction.due_date && (
                        <div className="text-xs text-slate-500">
                          Due: {formatDate(transaction.due_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {transaction.type === 'sales_document' || transaction.type === 'invoice' ? (
                          <button
                            onClick={() => openInvoiceModal(transaction.document_id || transaction.id, transaction.document_number)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {transaction.document_number}
                          </button>
                        ) : transaction.type === 'payment' ? (
                          <button
                            onClick={() => openPaymentModal(transaction.document_id || transaction.id, transaction.document_number)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {transaction.document_number}
                          </button>
                        ) : (
                          transaction.document_number
                        )}
                      </div>
                      <div className="text-sm text-slate-500 capitalize">
                        {(transaction.type || '').replace('_', ' ')}
                        {transaction.description && ` - ${transaction.description}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                      {transaction.debit > 0 ? (
                        <span className="font-medium text-red-600">
                          {formatCurrency(transaction.debit)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                      {transaction.credit > 0 ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(transaction.credit)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                      <span className={transaction.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(transaction.balance))}
                        <span className="ml-1">
                          {transaction.balance >= 0 ? '(Dr)' : '(Cr)'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for viewing invoices and payments */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        size="xl"
      >
        <div className="p-1">
          {modalContent}
        </div>
      </Modal>
    </div>
  )
}

export default CustomerLedger
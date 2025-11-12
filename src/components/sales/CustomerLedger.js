// src/components/sales/CustomerLedger.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import DateRangePicker from '../shared/calendar/DateRangePicker';
import Modal from '../shared/overlay/Modal';
import InvoiceView from './InvoiceView';
import PaymentView from './PaymentView';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../hooks/useAuth';
import printService from '../../services/printService';
import customerService from '../../services/customerService';

const CustomerLedger = ({ customerId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading: apiLoading, executeRequest, authenticatedFetch } = useAPI();
  const { company } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');

  // Auto-refresh timer
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    if (customerId && companyId) {
      loadCustomer();
      loadLedgerData();
    }
  }, [customerId, companyId, dateRange]);

  // ✅ Auto-refresh every 30-40 seconds
  useEffect(() => {
    if (!customerId || !companyId) return;

    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Set up new interval (random between 30-40 seconds)
    const interval = setInterval(() => {
      loadLedgerData();
    }, Math.floor(Math.random() * 11000) + 30000); // 30-40 seconds

    setRefreshInterval(interval);

    // Clean up interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [customerId, companyId, dateRange]);

  const loadCustomer = async () => {
    try {
      const result = await customerService.getCustomer(customerId, companyId);
      if (result.success) {
        setCustomer(result.data);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const loadLedgerData = async () => {
    if (!customerId || !companyId) return;

    setLoading(true);
    
    try {
      let url = `/api/customers/ledger/${customerId}?company_id=${companyId}`;
      
      if (dateRange.from) {
        url += `&date_from=${dateRange.from}`;
      }
      if (dateRange.to) {
        url += `&date_to=${dateRange.to}`;
      }

      const response = await authenticatedFetch(url);
      
      if (response && response.success) {
        setTransactions(response.data.transactions || []);
        setSummary(response.data.summary);
      } else {
        setTransactions([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      showError('Failed to load customer ledger');
      setTransactions([]);
      setSummary(null);
    }
    
    setLoading(false);
  };

  // ✅ SMART INDIAN CURRENCY FORMATTER
  const formatCurrency = (amount, compact = false) => {
    const absAmount = Math.abs(amount || 0);
    
    if (compact) {
      // Compact format for large numbers
      if (absAmount >= 10000000) {
        // 1 Crore and above
        return `₹${(absAmount / 10000000).toFixed(2)} Cr`;
      } else if (absAmount >= 100000) {
        // 1 Lakh and above
        return `₹${(absAmount / 100000).toFixed(2)} L`;
      } else if (absAmount >= 1000) {
        // 1 Thousand and above
        return `₹${(absAmount / 1000).toFixed(2)} K`;
      }
    }
    
    // Default Indian number format with commas
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // ✅ CURRENCY WITH SMART TOOLTIP (Full amount on hover for compact view)
  const CurrencyDisplay = ({ amount, compact = false, className = '' }) => {
    const formatted = formatCurrency(amount, compact);
    const fullFormatted = formatCurrency(amount, false);
    
    if (compact && formatted !== fullFormatted) {
      return (
        <span className={className} title={fullFormatted}>
          {formatted}
        </span>
      );
    }
    
    return <span className={className}>{formatted}</span>;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'warning',
      blocked: 'error',
      on_hold: 'default',
      paid: 'success',
      partially_paid: 'warning',
      unpaid: 'error',
      draft: 'default',
      approved: 'success'
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace('_', ' ')}</Badge>;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'invoice':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'payment':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'return':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const exportToPDF = async () => {
    if (!customer || !companyId) {
      showError('Missing customer or company information');
      return;
    }

    try {
      // Prepare document data
      const documentData = {
        company: {
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email,
          gstin: company.gstin
        },
        customer: {
          name: customer.name,
          address: customer.address,
          phone: customer.phone,
          email: customer.email,
          gstin: customer.gstin
        },
        document_number: `LEDGER-${customer.customer_code}`,
        document_date: new Date().toISOString().split('T')[0],
        total_amount: summary?.current_balance || 0,
        items: transactions.map(t => ({
          name: t.description,
          quantity: 1,
          rate: t.debit || t.credit,
          amount: t.debit || t.credit
        }))
      };

      // Generate and download PDF
      await printService.downloadDocumentPDF(
        documentData, 
        'customer_ledger', 
        companyId, 
        `customer-ledger-${customer.customer_code}.pdf`
      );
      
      success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      showError('Failed to generate PDF: ' + error.message);
    }
  };

  // Function to open invoice in modal
  const openInvoiceModal = (invoiceId, invoiceNumber) => {
    setModalContent(
      <InvoiceView invoiceId={invoiceId} companyId={companyId} />
    );
    setModalTitle(`Invoice #${invoiceNumber}`);
    setModalOpen(true);
  };

  // Function to open payment in modal
  const openPaymentModal = (paymentId, paymentNumber) => {
    setModalContent(
      <PaymentView paymentId={paymentId} companyId={companyId} />
    );
    setModalTitle(`Payment #${paymentNumber}`);
    setModalOpen(true);
  };

  if (loading && !customer) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading customer ledger...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-800">Customer not found</h3>
        <p className="text-slate-600 mt-2">The customer you're looking for doesn't exist.</p>
        <Button
          className="mt-4"
          onClick={() => router.push('/sales/customers')}
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  // ✅ ALWAYS use summary values if available (calculated from transactions)
  // Fallback to customer values only if summary not loaded yet
  const currentBalance = summary?.closing_balance ?? parseFloat(customer.current_balance || 0);
  const advanceBalance = summary?.advance_balance ?? parseFloat(customer.advance_amount || 0);
  const netPosition = summary?.net_receivable ?? (currentBalance - advanceBalance);
  const hasAdvance = advanceBalance && parseFloat(advanceBalance) > 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {customer.name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Code: {customer.customer_code}
            </p>
          </div>
          <div className="flex items-center space-x-3 print:hidden">
            <Button
              variant="outline"
              onClick={exportToPDF}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              }
            >
              Print
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/sales/customers/${customerId}/edit`)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Edit Customer
            </Button>
          </div>
        </div>

        {/* Balance Cards - Using Smart Currency Format */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Opening Balance */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700 font-semibold">Opening Balance</p>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold mt-1 ${
              customer.opening_balance_type === 'receivable' ? 'text-red-600' : 'text-green-600'
            }`}>
              <CurrencyDisplay amount={customer.opening_balance} compact={true} />
            </p>
            <p className="text-xs text-slate-600 mt-1 capitalize font-medium">
              {customer.opening_balance_type} {customer.opening_balance > 0 ? '(Dr)' : '(Cr)'}
            </p>
          </div>

          {/* Current Balance */}
          <div className={`rounded-lg p-4 border-2 ${
            currentBalance > 0 
              ? 'bg-red-50 border-red-200' 
              : currentBalance < 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${
                currentBalance > 0 
                  ? 'text-red-700' 
                  : currentBalance < 0 
                  ? 'text-green-700' 
                  : 'text-slate-700'
              }`}>Current Balance</p>
              <svg className={`w-5 h-5 ${
                currentBalance > 0 
                  ? 'text-red-600' 
                  : currentBalance < 0 
                  ? 'text-green-600' 
                  : 'text-slate-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold mt-1 ${
              currentBalance > 0 
                ? 'text-red-600' 
                : currentBalance < 0 
                ? 'text-green-600' 
                : 'text-slate-600'
            }`}>
              <CurrencyDisplay 
                amount={Math.abs(currentBalance)} 
                compact={true} 
              />
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {currentBalance > 0 
                ? 'Amount Receivable (Dr)' 
                : currentBalance < 0 
                ? 'Credit Balance (Cr)' 
                : 'Settled'}
            </p>
          </div>

          {/* Advance Balance */}
          <div className={`${hasAdvance ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 shadow-md' : 'bg-gray-50 border-2 border-gray-200'} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${hasAdvance ? 'text-green-700' : 'text-gray-600'}`}>
                Advance Balance
              </p>
              {hasAdvance ? (
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className={`text-2xl font-bold mt-1 ${hasAdvance ? 'text-green-600' : 'text-gray-400'}`}>
              <CurrencyDisplay amount={advanceBalance} compact={true} />
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-medium ${hasAdvance ? 'text-green-700' : 'text-gray-500'}`}>
                {hasAdvance ? 'Available Credit (Cr)' : 'No Advance'}
              </p>
            </div>
          </div>

          {/* Net Position */}
          <div className={`rounded-lg p-4 border-2 ${
            netPosition > 0 
              ? 'bg-orange-50 border-orange-200' 
              : netPosition < 0 
              ? 'bg-teal-50 border-teal-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${
                netPosition > 0 ? 'text-orange-700' : netPosition < 0 ? 'text-teal-700' : 'text-slate-600'
              }`}>
                Net Position
              </p>
              <svg className={`w-5 h-5 ${
                netPosition > 0 ? 'text-orange-600' : netPosition < 0 ? 'text-teal-600' : 'text-slate-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold mt-1 ${
              netPosition > 0 ? 'text-orange-600' : netPosition < 0 ? 'text-teal-600' : 'text-slate-600'
            }`}>
              <CurrencyDisplay amount={Math.abs(netPosition)} compact={true} />
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {netPosition > 0 ? 'Customer Owes (Dr)' : netPosition < 0 ? 'You Owe (Cr)' : 'Settled'}
            </p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Filter by Date:</span>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          {(dateRange.from || dateRange.to) && (
            <button
              onClick={() => setDateRange({ from: null, to: null })}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Ledger Statement */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
          <h3 className="text-lg font-bold">Customer Ledger Statement</h3>
          <p className="text-sm text-slate-300 mt-1">Complete transaction history with {customer.name}</p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-base text-gray-500 font-medium mb-1">No transactions found</div>
            <div className="text-sm text-gray-400">No transactions recorded for this customer yet</div>
          </div>
        ) : (
          <>
            {/* Professional Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Particulars</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Ref No.</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-red-50 tracking-wider">Debit (Dr.)</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-green-50 tracking-wider">Credit (Cr.)</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-blue-50 tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Opening Balance Row */}
                  {summary && (
                    <tr className="bg-blue-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-slate-900">-</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-bold">OPENING BALANCE</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">-</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">-</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">-</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        summary.opening_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        <CurrencyDisplay amount={Math.abs(summary.opening_balance)} compact={false} />
                        <span className="text-xs ml-1 font-semibold">{summary.opening_balance > 0 ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>
                  )}

                  {/* Transaction Rows */}
                  {transactions.map((txn, index) => (
                    <tr 
                      key={`${txn.type}-${txn.id}-${index}`} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                      onClick={() => {
                        if (txn.type === 'invoice' && txn.document_id) {
                          openInvoiceModal(txn.document_id, txn.document_number);
                        } else if (txn.type === 'payment' && txn.document_id) {
                          openPaymentModal(txn.document_id, txn.document_number);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(txn.type)}
                          <div>
                            <div className="text-sm font-semibold text-blue-600 underline">
                              {txn.description}
                            </div>
                            {txn.payment_method && (
                              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                                via {txn.payment_method.replace('_', ' ').toUpperCase()}
                              </div>
                            )}
                            {txn.status && (
                              <div className="mt-1">
                                {getStatusBadge(txn.status)}
                              </div>
                            )}
                            {txn.notes && (
                              <div className="text-xs text-slate-500 mt-1 italic">
                                {txn.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                        <div className="font-semibold text-blue-600 underline">{txn.document_number}</div>
                        {txn.reference && (
                          <div className="text-xs text-slate-500 mt-0.5">{txn.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {txn.debit > 0 ? (
                          <span className="text-red-600">
                            <CurrencyDisplay amount={txn.debit} compact={false} />
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {txn.credit > 0 ? (
                          <span className="text-green-600">
                            <CurrencyDisplay amount={txn.credit} compact={false} />
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        txn.balance > 0 ? 'text-red-600' : txn.balance < 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        <CurrencyDisplay amount={Math.abs(txn.balance)} compact={false} />
                        <span className="text-xs ml-1 font-semibold">{txn.balance > 0 ? 'Dr' : txn.balance < 0 ? 'Cr' : ''}</span>
                      </td>
                    </tr>
                  ))}

                  {/* Closing Balance Row */}
                  {summary && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td className="px-4 py-4 text-sm text-slate-900" colSpan="3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="font-extrabold text-base">CLOSING BALANCE</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base text-right bg-red-50 font-bold">
                        <CurrencyDisplay amount={summary.total_invoices} compact={true} />
                      </td>
                      <td className="px-4 py-4 text-base text-right bg-green-50 font-bold">
                        <CurrencyDisplay amount={summary.total_payments + summary.total_returns} compact={true} />
                      </td>
                      <td className={`px-4 py-4 text-lg text-right bg-blue-50 font-extrabold ${
                        summary.closing_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        <CurrencyDisplay amount={Math.abs(summary.closing_balance)} compact={true} />
                        <span className="text-sm ml-1 font-bold">{summary.closing_balance > 0 ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            {summary && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200 p-6">
                <div className="grid grid-cols-5 gap-6 text-sm">
                  <div className="bg-white rounded-lg p-4 border-2 border-slate-200 shadow-sm">
                    <p className="text-slate-600 mb-2 font-semibold">Total Invoices (Dr)</p>
                    <p className="text-xl font-bold text-red-600">
                      <CurrencyDisplay amount={summary.total_invoices} compact={true} />
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-slate-200 shadow-sm">
                    <p className="text-slate-600 mb-2 font-semibold">Total Payments (Cr)</p>
                    <p className="text-xl font-bold text-green-600">
                      <CurrencyDisplay amount={summary.total_payments} compact={true} />
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-slate-200 shadow-sm">
                    <p className="text-slate-600 mb-2 font-semibold">Total Returns (Cr)</p>
                    <p className="text-xl font-bold text-blue-600">
                      <CurrencyDisplay amount={summary.total_returns} compact={true} />
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                    <p className="text-slate-600 mb-2 font-semibold">Advance Available</p>
                    <p className="text-xl font-bold text-green-600">
                      <CurrencyDisplay amount={summary.advance_balance} compact={true} />
                    </p>
                  </div>
                  <div className={`bg-white rounded-lg p-4 border-2 shadow-md ${
                    summary.net_receivable > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                  }`}>
                    <p className="text-slate-700 mb-2 font-bold">Net Receivable</p>
                    <p className={`text-2xl font-extrabold ${
                      summary.net_receivable > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      <CurrencyDisplay amount={Math.abs(summary.net_receivable)} compact={true} />
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
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
  );
};

export default CustomerLedger;
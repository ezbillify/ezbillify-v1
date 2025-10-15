// src/components/purchase/VendorLedger.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import DateRangePicker from '../shared/calendar/DateRangePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const VendorLedger = ({ vendorId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [vendor, setVendor] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [showAdvanceHistory, setShowAdvanceHistory] = useState(false);
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    if (vendorId && companyId) {
      fetchLedger();
      fetchAdvances();
    }
  }, [vendorId, companyId, dateRange]);

  const fetchLedger = async () => {
    try {
      let url = `/api/vendors/ledger/${vendorId}?company_id=${companyId}`
      
      if (dateRange.from) {
        url += `&date_from=${dateRange.from}`
      }
      if (dateRange.to) {
        url += `&date_to=${dateRange.to}`
      }

      const response = await authenticatedFetch(url);
      
      if (response && response.success) {
        setVendor(response.data.vendor);
        setTransactions(response.data.transactions || []);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      showError('Failed to load vendor ledger');
    }
  };

  const fetchAdvances = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/vendors/${vendorId}/advances?company_id=${companyId}`
      );
      
      if (response && response.success) {
        setAdvances(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching advances:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
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

  const getAdvanceTypeBadge = (type) => {
    const config = {
      created: { variant: 'success', label: 'Created' },
      adjusted: { variant: 'warning', label: 'Adjusted' },
      refunded: { variant: 'error', label: 'Refunded' }
    };
    const { variant, label } = config[type] || { variant: 'default', label: type };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'bill':
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

  const exportToPDF = () => {
    window.print();
  };

  if (loading && !vendor) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading vendor ledger...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-800">Vendor not found</h3>
        <p className="text-slate-600 mt-2">The vendor you're looking for doesn't exist.</p>
        <Button
          className="mt-4"
          onClick={() => router.push('/purchase/vendors')}
        >
          Back to Vendors
        </Button>
      </div>
    );
  }

  const hasAdvance = vendor.advance_amount && parseFloat(vendor.advance_amount) > 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {vendor.vendor_name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Code: {vendor.vendor_code}
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
              onClick={() => router.push(`/purchase/vendors/${vendorId}/edit`)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Edit Vendor
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Opening Balance</p>
            <p className={`text-2xl font-bold mt-1 ${
              vendor.opening_balance_type === 'payable' ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(vendor.opening_balance)}
            </p>
            <p className="text-xs text-slate-600 mt-1 capitalize">{vendor.opening_balance_type}</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {formatCurrency(vendor.current_balance || 0)}
            </p>
            <p className="text-xs text-slate-600 mt-1">Amount Payable</p>
          </div>

          <div className={`${hasAdvance ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300' : 'bg-gray-50'} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-medium ${hasAdvance ? 'text-green-700' : 'text-gray-600'}`}>
                Advance Balance
              </p>
              {hasAdvance && (
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            <p className={`text-2xl font-bold mt-1 ${hasAdvance ? 'text-green-600' : 'text-gray-400'}`}>
              {formatCurrency(vendor.advance_amount || 0)}
            </p>
            {hasAdvance ? (
              <button
                onClick={() => setShowAdvanceHistory(!showAdvanceHistory)}
                className="text-xs text-green-700 hover:text-green-800 font-medium mt-1 underline print:hidden"
              >
                {showAdvanceHistory ? 'Hide History' : 'View History'}
              </button>
            ) : (
              <p className="text-xs text-gray-500 mt-1">No Advance</p>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 font-medium">Net Position</p>
            <p className={`text-2xl font-bold mt-1 ${
              (vendor.current_balance - vendor.advance_amount) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(vendor.current_balance - vendor.advance_amount)}
            </p>
            <p className="text-xs text-slate-600 mt-1">Payable - Advance</p>
          </div>
        </div>

        {/* Advance History */}
        {showAdvanceHistory && hasAdvance && advances.length > 0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 print:hidden">
            <h4 className="text-sm font-semibold text-green-900 mb-3">Advance History</h4>
            <div className="space-y-2">
              {advances.map((advance) => (
                <div
                  key={advance.id}
                  className="bg-white rounded-lg p-3 border border-green-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getAdvanceTypeBadge(advance.advance_type)}
                        <span className="text-sm font-medium text-slate-900">
                          {advance.source_type === 'debit_note' ? 'From Return' : advance.source_type}
                        </span>
                        {advance.source_number && (
                          <span className="text-xs text-slate-500">
                            #{advance.source_number}
                          </span>
                        )}
                      </div>
                      {advance.notes && (
                        <p className="text-xs text-slate-600 mt-1">{advance.notes}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-lg font-bold ${
                        advance.advance_type === 'created' ? 'text-green-600' : 
                        advance.advance_type === 'adjusted' ? 'text-amber-600' : 
                        'text-red-600'
                      }`}>
                        {advance.advance_type === 'created' ? '+' : '-'}
                        {formatCurrency(advance.amount)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(advance.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <h3 className="text-lg font-bold">Ledger Statement</h3>
          <p className="text-sm text-slate-300 mt-1">All transactions with {vendor.vendor_name}</p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-base text-gray-500 font-medium mb-1">No transactions found</div>
            <div className="text-sm text-gray-400">No transactions recorded for this vendor yet</div>
          </div>
        ) : (
          <>
            {/* Professional Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase">Particulars</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase">Ref No.</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-red-50">Debit (Dr.)</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-green-50">Credit (Cr.)</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 uppercase bg-blue-50">Balance</th>
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
                          Opening Balance
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">-</td>
                      <td className="px-4 py-3 text-sm text-right">-</td>
                      <td className="px-4 py-3 text-sm text-right">-</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        summary.opening_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(summary.opening_balance))}
                        <span className="text-xs ml-1">{summary.opening_balance > 0 ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>
                  )}

                  {/* Transaction Rows */}
                  {transactions.map((txn) => (
                    <tr key={`${txn.type}-${txn.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(txn.type)}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {txn.description}
                            </div>
                            {txn.payment_method && (
                              <div className="text-xs text-slate-600 mt-0.5">
                                via {txn.payment_method.replace('_', ' ').toUpperCase()}
                              </div>
                            )}
                            {txn.status && (
                              <div className="mt-1">
                                {getStatusBadge(txn.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        <div>{txn.document_number}</div>
                        {txn.reference && (
                          <div className="text-xs text-slate-500 mt-0.5">{txn.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {txn.debit > 0 ? (
                          <span className="text-red-600">{formatCurrency(txn.debit)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {txn.credit > 0 ? (
                          <span className="text-green-600">{formatCurrency(txn.credit)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        txn.balance > 0 ? 'text-red-600' : txn.balance < 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        {formatCurrency(Math.abs(txn.balance))}
                        <span className="text-xs ml-1">{txn.balance > 0 ? 'Dr' : txn.balance < 0 ? 'Cr' : ''}</span>
                      </td>
                    </tr>
                  ))}

                  {/* Closing Balance Row */}
                  {summary && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="px-4 py-4 text-sm text-slate-900" colSpan="3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Closing Balance
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-right bg-red-50">
                        {formatCurrency(summary.total_bills)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right bg-green-50">
                        {formatCurrency(summary.total_payments + summary.total_returns)}
                      </td>
                      <td className={`px-4 py-4 text-base text-right bg-blue-50 ${
                        summary.closing_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(summary.closing_balance))}
                        <span className="text-sm ml-1">{summary.closing_balance > 0 ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            {summary && (
              <div className="bg-slate-50 border-t border-slate-200 p-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 mb-1">Total Bills</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(summary.total_bills)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Total Payments</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(summary.total_payments)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Total Returns</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.total_returns)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Net Payable</p>
                    <p className={`text-lg font-bold ${
                      summary.net_payable > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Math.abs(summary.net_payable))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VendorLedger;
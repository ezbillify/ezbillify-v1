// src/components/purchase/VendorLedger.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { PAGINATION } from '../../lib/constants';

const VendorLedger = ({ vendorId, companyId }) => {
  const router = useRouter();
  const { error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [vendor, setVendor] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({
    opening_balance: 0,
    total_purchases: 0,
    total_payments: 0,
    closing_balance: 0
  });

  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    transaction_type: 'all'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE
  });

  useEffect(() => {
    if (vendorId && companyId) {
      fetchVendor();
      fetchTransactions();
    }
  }, [vendorId, companyId, filters, pagination]);

  const fetchVendor = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors/${vendorId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendor(result.data);
    }
  };

  const fetchTransactions = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        vendor_id: vendorId,
        company_id: companyId,
        date_from: filters.date_from,
        date_to: filters.date_to,
        transaction_type: filters.transaction_type,
        page: pagination.page,
        limit: pagination.limit
      });

      return await authenticatedFetch(`/api/vendors/ledger/${vendorId}?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setTransactions(result.data?.transactions || []);
      setTotalItems(result.data?.total || 0);
      setSummary(result.data?.summary || summary);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionTypeBadge = (type) => {
    const types = {
      bill: { variant: 'warning', label: 'Bill' },
      payment: { variant: 'success', label: 'Payment' },
      purchase_order: { variant: 'info', label: 'Purchase Order' },
      purchase_return: { variant: 'primary', label: 'Return' },
      opening_balance: { variant: 'default', label: 'Opening' }
    };

    const config = types[type] || { variant: 'default', label: type };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const totalPages = Math.ceil(totalItems / pagination.limit);

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-slate-600">Loading vendor details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vendor Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">
                {vendor.display_name || vendor.vendor_name}
              </h1>
              <Badge variant={vendor.status === 'active' ? 'success' : 'warning'}>
                {vendor.status}
              </Badge>
            </div>
            <p className="text-slate-600 mt-1">{vendor.vendor_code}</p>
            <div className="flex gap-4 mt-2 text-sm text-slate-600">
              {vendor.email && <span>📧 {vendor.email}</span>}
              {vendor.phone && <span>📞 {vendor.phone}</span>}
              {vendor.gstin && <span className="font-mono">🏛️ {vendor.gstin}</span>}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/purchase/vendors/${vendorId}/edit`)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit Vendor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Opening Balance</div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(summary.opening_balance)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Total Purchases</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.total_purchases)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Total Payments</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.total_payments)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Current Balance</div>
          <div className={`text-2xl font-bold ${
            summary.closing_balance > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatCurrency(Math.abs(summary.closing_balance))}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.closing_balance > 0 ? 'Payable' : summary.closing_balance < 0 ? 'Receivable' : 'Settled'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="date"
            label="From Date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />

          <Input
            type="date"
            label="To Date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />

          <div className="md:col-span-2 flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ date_from: '', date_to: '', transaction_type: 'all' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant="primary"
              onClick={fetchTransactions}
              disabled={loading}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Transaction History</h3>
          <p className="text-slate-600">Detailed ledger of all transactions</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No transactions found</h3>
            <p className="mt-1 text-sm text-slate-500">Transactions will appear here once created.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
                  {transactions.map((txn, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatDate(txn.transaction_date)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTransactionTypeBadge(txn.transaction_type)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {txn.document_number}
                        </div>
                        {txn.vendor_invoice_number && (
                          <div className="text-xs text-slate-500">
                            Ref: {txn.vendor_invoice_number}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {txn.debit_amount > 0 ? (
                          <span className="font-medium text-red-600">
                            {formatCurrency(txn.debit_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {txn.credit_amount > 0 ? (
                          <span className="font-medium text-green-600">
                            {formatCurrency(txn.credit_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          txn.balance > 0 ? 'text-red-600' : txn.balance < 0 ? 'text-green-600' : 'text-slate-600'
                        }`}>
                          {formatCurrency(Math.abs(txn.balance))}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        <div className="max-w-xs truncate" title={txn.notes}>
                          {txn.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, totalItems)} of {totalItems} transactions
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-slate-600">
                    Page {pagination.page} of {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VendorLedger;
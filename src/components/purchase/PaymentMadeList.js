// src/components/purchase/PaymentMadeList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { PAGINATION } from '../../lib/constants';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';

const PaymentMadeList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [payments, setPayments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Payables Summary
  const [payablesSummary, setPayablesSummary] = useState({
    total_payables: 0,
    overdue_payables: 0,
    due_this_month: 0,
    total_vendors: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    payment_method: '',
    from_date: '',
    to_date: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'payment_date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (companyId) {
      fetchPayments();
      fetchPayablesSummary();
    }
  }, [filters, pagination, companyId]);

  const fetchPayablesSummary = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/summary?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setPayablesSummary(result.data);
    }
  };

  const fetchPayments = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        payment_method: filters.payment_method,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/purchase/payments-made?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setPayments(result.data || []);
      setTotalItems(result.pagination?.total_records || 0);
    }
  };

  const handleSearchChange = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field) => {
    setPagination(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/${selectedPayment.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Payment deleted successfully');
      setShowDeleteDialog(false);
      setSelectedPayment(null);
      fetchPayments();
      fetchPayablesSummary();
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

  const getPaymentMethodBadge = (method) => {
    const labels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      card: 'Card',
      other: 'Other'
    };
    return <Badge variant="info">{labels[method] || method}</Badge>;
  };

  const paymentMethodOptions = [
    { value: '', label: 'All Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' }
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payments Made</h1>
          <p className="text-slate-600 mt-1">Track vendor payments and payables</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/purchase/payments-made/new')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Record Payment
        </Button>
      </div>

      {/* Payables Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Payables</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(payablesSummary.total_payables)}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">₹</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overdue</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {formatCurrency(payablesSummary.overdue_payables)}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Due This Month</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {formatCurrency(payablesSummary.due_this_month)}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Vendors</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {payablesSummary.total_vendors || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput
              placeholder="Search by payment number, vendor, reference..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select
            label="Payment Method"
            value={filters.payment_method}
            onChange={(value) => handleFilterChange('payment_method', value)}
            options={paymentMethodOptions}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No payments found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by recording your first payment.</p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => router.push('/purchase/payments-made/new')}
              >
                Record First Payment
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('payment_number')}
                    >
                      <div className="flex items-center">
                        Payment Number
                        {pagination.sortBy === 'payment_number' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('payment_date')}
                    >
                      <div className="flex items-center">
                        Date
                        {pagination.sortBy === 'payment_date' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Vendor
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Method
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Reference
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {payment.payment_number}
                        </div>
                        {payment.bill_payments_count > 0 && (
                          <div className="text-xs text-slate-500">
                            {payment.bill_payments_count} bill{payment.bill_payments_count > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {formatDate(payment.payment_date)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {payment.vendor_name || payment.vendor?.vendor_name}
                        </div>
                        {payment.vendor?.vendor_code && (
                          <div className="text-xs text-slate-500">{payment.vendor.vendor_code}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getPaymentMethodBadge(payment.payment_method)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {payment.reference_number || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/purchase/payments-made/${payment.id}`)}
                            icon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            }
                          >
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                            icon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {payments.length > 0 && (
              <div className="bg-white px-6 py-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Show:</span>
                    <Select
                      value={pagination.limit}
                      onChange={(value) => setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
                      options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                        value: size,
                        label: `${size}`
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, totalItems)} of {totalItems}
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {pagination.page > 3 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="px-3 py-1 text-sm rounded-md transition-colors text-slate-600 hover:bg-slate-100"
                            >
                              1
                            </button>
                            <span className="px-2 text-slate-400">...</span>
                          </>
                        )}

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page >= pagination.page - 2 && page <= pagination.page + 2)
                          .map(page => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                pagination.page === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                        {pagination.page < totalPages - 2 && (
                          <>
                            <span className="px-2 text-slate-400">...</span>
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              className="px-3 py-1 text-sm rounded-md transition-colors text-slate-600 hover:bg-slate-100"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === totalPages}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={`Are you sure you want to delete Payment "${selectedPayment?.payment_number}"? This will reverse the payment allocation to bills. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default PaymentMadeList;
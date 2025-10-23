// src/components/purchase/BillList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import Badge from '../shared/ui/Badge';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { PAGINATION } from '../../lib/constants';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';

const BillList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [bills, setBills] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_status: '',
    from_date: '',
    to_date: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'created_at', // ✅ Changed to created_at for latest first
    sortOrder: 'desc' // ✅ Descending order (newest first)
  });

  useEffect(() => {
    if (companyId) {
      fetchBills();
    }
  }, [filters, pagination, companyId]);

  const fetchBills = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        status: filters.status,
        payment_status: filters.payment_status,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/purchase/bills?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBills(result.data || []);
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
    if (!selectedBill) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${selectedBill.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Bill deleted successfully');
      setShowDeleteDialog(false);
      setSelectedBill(null);
      fetchBills();
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
      draft: 'default',
      received: 'success',
      approved: 'info',
      rejected: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const variants = {
      unpaid: 'error',
      partially_paid: 'warning',
      paid: 'success',
      overdue: 'error'
    };
    return <Badge variant={variants[paymentStatus] || 'default'}>{paymentStatus === 'partially_paid' ? 'partial' : paymentStatus}</Badge>;
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'received', label: 'Received' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Bills</h1>
          <p className="text-slate-600 mt-1">Manage your purchase bills and vendor invoices</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/purchase/bills/new')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create Bill
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <style jsx>{`
          .date-picker-right-align :global(.calendar-dropdown) {
            right: 0 !important;
            left: auto !important;
          }
          .filter-date-picker :global(input) {
            height: 2.5rem !important;
            padding: 0.625rem 0.875rem !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0.5rem !important;
            font-size: 0.875rem !important;
          }
          .filter-date-picker :global(input:focus) {
            outline: none;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          }
        `}</style>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput
              placeholder="Search by bill number, vendor, invoice..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>

          <div>
            <Select
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={statusOptions}
              placeholder="Status"
            />
          </div>

          <div>
            <Select
              value={filters.payment_status}
              onChange={(value) => handleFilterChange('payment_status', value)}
              options={paymentStatusOptions}
              placeholder="Payment Status"
            />
          </div>

          <div className="filter-date-picker">
            <DatePicker
              value={filters.from_date}
              onChange={(date) => handleFilterChange('from_date', date)}
              placeholder="From Date"
            />
          </div>

          <div className="filter-date-picker">
            <DatePicker
              value={filters.to_date}
              onChange={(date) => handleFilterChange('to_date', date)}
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSortChange('document_number')}
                        className="flex items-center gap-2 hover:text-slate-900"
                      >
                        Bill Number
                        {pagination.sortBy === 'document_number' && (
                          <span>{pagination.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSortChange('document_date')}
                        className="flex items-center gap-2 hover:text-slate-900"
                      >
                        Date
                        {pagination.sortBy === 'document_date' && (
                          <span>{pagination.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSortChange('total_amount')}
                        className="flex items-center justify-end gap-2 hover:text-slate-900 ml-auto"
                      >
                        Amount
                        {pagination.sortBy === 'total_amount' && (
                          <span>{pagination.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="text-slate-500">
                          <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm">No bills found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {bill.document_number}
                          </div>
                          {bill.due_date && (
                            <div className="text-xs text-slate-500">
                              Due: {formatDate(bill.due_date)}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {formatDate(bill.document_date)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {bill.vendor_name || bill.vendor?.vendor_name}
                          </div>
                          {bill.vendor?.vendor_code && (
                            <div className="text-xs text-slate-500">{bill.vendor.vendor_code}</div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {bill.vendor_invoice_number || '-'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(bill.total_amount)}
                          </div>
                          {bill.paid_amount > 0 && (
                            <div className="text-xs text-green-600">
                              Paid: {formatCurrency(bill.paid_amount)}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(bill.status)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getPaymentStatusBadge(bill.payment_status)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/purchase/bills/${bill.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => router.push(`/purchase/bills/${bill.id}/edit`)}
                              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {(bill.status === 'draft' || (bill.status === 'received' && bill.paid_amount === 0)) && (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setShowDeleteDialog(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {bills.length > 0 && (
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
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete Bill "${selectedBill?.document_number}"? This will reverse inventory and vendor balance updates. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default BillList;
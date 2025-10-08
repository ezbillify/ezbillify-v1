// src/components/purchase/PurchaseReturnList.js
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

const PurchaseReturnList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [returns, setReturns] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    reason: '',
    from_date: '',
    to_date: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'document_date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (companyId) {
      fetchReturns();
    }
  }, [filters, pagination, companyId]);

  const fetchReturns = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        status: filters.status,
        reason: filters.reason,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/purchase/returns?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReturns(result.data || []);
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
    if (!selectedReturn) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns/${selectedReturn.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Purchase return deleted successfully');
      setShowDeleteDialog(false);
      setSelectedReturn(null);
      fetchReturns();
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
      approved: 'success',
      processed: 'info',
      rejected: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      defective: 'Defective/Damaged',
      wrong_item: 'Wrong Item',
      quality_issue: 'Quality Issue',
      excess_quantity: 'Excess Quantity',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Approved' },
    { value: 'processed', label: 'Processed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const reasonOptions = [
    { value: '', label: 'All Reasons' },
    { value: 'defective', label: 'Defective/Damaged' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'excess_quantity', label: 'Excess Quantity' },
    { value: 'other', label: 'Other' }
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Returns</h1>
          <p className="text-slate-600 mt-1">Manage goods returned to vendors</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/purchase/returns/new')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create Return
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput
              placeholder="Search by return number, vendor..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={statusOptions}
          />

          <Select
            label="Reason"
            value={filters.reason}
            onChange={(value) => handleFilterChange('reason', value)}
            options={reasonOptions}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No returns found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by creating a new purchase return.</p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => router.push('/purchase/returns/new')}
              >
                Create First Return
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
                      onClick={() => handleSortChange('document_number')}
                    >
                      <div className="flex items-center">
                        Return Number
                        {pagination.sortBy === 'document_number' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('document_date')}
                    >
                      <div className="flex items-center">
                        Date
                        {pagination.sortBy === 'document_date' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Vendor
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Reason
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
                  {returns.map((returnDoc) => (
                    <tr key={returnDoc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {returnDoc.document_number}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {formatDate(returnDoc.document_date)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {returnDoc.vendor_name || returnDoc.vendor?.vendor_name}
                        </div>
                        {returnDoc.vendor?.vendor_code && (
                          <div className="text-xs text-slate-500">{returnDoc.vendor.vendor_code}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {getReasonLabel(returnDoc.reason)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {formatCurrency(returnDoc.total_amount)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(returnDoc.status)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/purchase/returns/${returnDoc.id}`)}
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
                            onClick={() => router.push(`/purchase/returns/${returnDoc.id}/edit`)}
                            icon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            }
                          >
                            Edit
                          </Button>

                          {returnDoc.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedReturn(returnDoc);
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {returns.length > 0 && totalPages > 1 && (
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
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
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
        title="Delete Purchase Return"
        message={`Are you sure you want to delete Return "${selectedReturn?.document_number}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default PurchaseReturnList;
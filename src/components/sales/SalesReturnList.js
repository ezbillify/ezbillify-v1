// src/components/sales/SalesReturnList.js
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
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  FileText,
  Printer,
  Send
} from 'lucide-react';

const SalesReturnList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [returns, setReturns] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    customer_id: '',
    status: '',
    from_date: '',
    to_date: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (companyId) {
      fetchCustomers();
      fetchReturns();
    }
  }, [filters, pagination, companyId]);

  const fetchCustomers = async () => {
    try {
      const response = await authenticatedFetch(`/api/customers?company_id=${companyId}&limit=1000`);
      if (response.success) {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchReturns = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        customer_id: filters.customer_id,
        status: filters.status,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/sales/returns?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReturns(result.data || []);
      setTotalItems(result.pagination?.total || 0);
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
      return await authenticatedFetch(`/api/sales/returns/${selectedReturn.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Credit note deleted successfully');
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
      issued: 'success',
      cancelled: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'issued', label: 'Issued' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const customerOptions = [
    { value: '', label: 'All Customers' },
    ...customers.map(customer => ({
      value: customer.id,
      label: `${customer.name} (${customer.customer_code})`
    }))
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Credit Notes</h1>
          <p className="text-slate-600 mt-1">Manage customer credit notes and returns</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/sales/returns/new')}
          icon={<Plus className="w-5 h-5" />}
        >
          Create Credit Note
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <style jsx>{`
          .date-picker-right-align :global(.calendar-dropdown) {
            right: 0 !important;
            left: auto !important;
          }
        `}</style>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput 
              placeholder="Search by credit note number or customer..." 
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div><Select 
            label="Customer" 
            options={customerOptions}
            value={filters.customer_id}
            onChange={(value) => handleFilterChange('customer_id', value)}
          /></div>
          <div><Select 
            label="Status" 
            options={statusOptions}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
          /></div>
          <div><DatePicker 
            label="From Date" 
            value={filters.from_date}
            onChange={(date) => handleFilterChange('from_date', date)}
          /></div>
          <div className="date-picker-right-align">
            <DatePicker 
              label="To Date" 
              value={filters.to_date}
              onChange={(date) => handleFilterChange('to_date', date)}
            />
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => setFilters({
                search: '',
                customer_id: '',
                status: '',
                from_date: '',
                to_date: ''
              })}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Credit Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No credit notes found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Get started by creating a new credit note.
                    </p>
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={() => router.push('/sales/returns/new')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Credit Note
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map((salesReturn) => (
                  <tr key={salesReturn.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {salesReturn.document_number}
                      </div>
                      {salesReturn.branch && (
                        <div className="text-xs text-slate-500 mt-1">
                          {salesReturn.branch.name || salesReturn.branch.branch_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {salesReturn.customer?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {salesReturn.customer?.customer_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(salesReturn.document_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(salesReturn.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(salesReturn.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {salesReturn.items?.length || 0} items
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/sales/returns/${salesReturn.id}`)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReturn(salesReturn);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {returns.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, totalItems)} to{' '}
              {Math.min(pagination.page * pagination.limit, totalItems)} of {totalItems} credit notes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, pagination.page - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Credit Note"
        message={`Are you sure you want to delete credit note ${selectedReturn?.document_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default SalesReturnList;

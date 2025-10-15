// src/components/purchase/VendorList.js
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
import { 
  Users, 
  Plus, 
  FileText, 
  Eye, 
  Edit2, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Sparkles,
  Ban,
  CheckCircle
} from 'lucide-react';

const VendorList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [vendors, setVendors] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: 'active'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'vendor_name',
    sortOrder: 'asc'
  });

  useEffect(() => {
    if (companyId) {
      fetchVendors();
    }
  }, [filters, pagination, companyId]);

  const fetchVendors = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        status: filters.status,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/vendors?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendors(result.data || []);
      const total = result.pagination?.total_records || result.pagination?.total || 0;
      setTotalItems(total);
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
    if (!selectedVendor) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors/${selectedVendor.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Vendor deleted successfully');
      setShowDeleteDialog(false);
      setSelectedVendor(null);
      fetchVendors();
    } else {
      showError(result.error || 'Failed to delete vendor');
    }
  };

  const handleStatusToggle = async (vendor) => {
    const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
    
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          company_id: companyId,
          status: newStatus 
        })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success(`Vendor ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchVendors();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'warning',
      blocked: 'error',
      on_hold: 'default'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'on_hold', label: 'On Hold' }
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

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
              <h1 className="text-2xl font-bold text-slate-800">Vendors</h1>
              <p className="text-slate-600 text-sm mt-0.5">Manage your vendor database</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <div className="text-center">
              <p className="text-xs text-slate-600 font-medium">Total Vendors</p>
              <p className="text-xl font-bold text-slate-900">{totalItems}</p>
            </div>
            <div className="w-px h-10 bg-slate-300"></div>
            <div className="text-center">
              <p className="text-xs text-slate-600 font-medium">Active</p>
              <p className="text-xl font-bold text-green-600">
                {vendors.filter(v => v.status === 'active').length}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => router.push('/purchase/vendors/new')}
            icon={<Plus className="w-5 h-5" />}
            className="shadow-lg shadow-blue-500/30"
          >
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <SearchInput
              placeholder="Search vendors by name, code, email, GSTIN..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onSearch={handleSearchChange}
            />
          </div>

          <Select
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={statusOptions}
          />

          <div className="flex items-center justify-between lg:justify-end gap-2">
            <span className="text-sm text-slate-600 font-medium">
              {totalItems} vendor{totalItems !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No vendors found</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              {filters.search || filters.status !== 'active' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first vendor'}
            </p>
            {!filters.search && filters.status === 'active' && (
              <Button
                variant="primary"
                onClick={() => router.push('/purchase/vendors/new')}
                icon={<Plus className="w-5 h-5" />}
              >
                Add Your First Vendor
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th
                      className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => handleSortChange('vendor_code')}
                    >
                      <div className="flex items-center gap-2">
                        Code
                        {pagination.sortBy === 'vendor_code' && (
                          <svg className={`w-4 h-4 transition-transform ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => handleSortChange('vendor_name')}
                    >
                      <div className="flex items-center gap-2">
                        Vendor
                        {pagination.sortBy === 'vendor_name' && (
                          <svg className={`w-4 h-4 transition-transform ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>

                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Contact
                    </th>

                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      GSTIN
                    </th>

                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        Payable
                      </div>
                    </th>

                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-green-500" />
                        Advance
                      </div>
                    </th>

                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-100">
                  {vendors.map((vendor) => {
                    const hasAdvance = vendor.advance_amount && parseFloat(vendor.advance_amount) > 0;
                    const hasBalance = vendor.current_balance && parseFloat(vendor.current_balance) > 0;
                    
                    return (
                      <tr key={vendor.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">
                              {vendor.vendor_code}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {vendor.display_name || vendor.vendor_name}
                            </div>
                            {vendor.vendor_category && (
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {vendor.vendor_category}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {vendor.email && (
                              <div className="text-sm text-slate-700 truncate max-w-xs">{vendor.email}</div>
                            )}
                            {vendor.phone && (
                              <div className="text-xs text-slate-500 font-mono">{vendor.phone}</div>
                            )}
                            {!vendor.email && !vendor.phone && (
                              <div className="text-sm text-slate-400">-</div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded inline-block">
                            {vendor.gstin || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {hasBalance ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-lg border border-red-200">
                              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-sm font-bold text-red-600">
                                {formatCurrency(vendor.current_balance)}
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
                                {formatCurrency(vendor.advance_amount)}
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

                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(vendor.status)}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ledger Button */}
                            <button
                              onClick={() => router.push(`/purchase/vendors/${vendor.id}/ledger`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="View Ledger"
                            >
                              <FileText className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* View Button */}
                            <button
                              onClick={() => router.push(`/purchase/vendors/${vendor.id}`)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md group/btn"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => router.push(`/purchase/vendors/${vendor.id}/edit`)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>

                            {/* Status Toggle */}
                            <button
                              onClick={() => handleStatusToggle(vendor)}
                              className={`p-2 rounded-lg transition-all hover:shadow-md group/btn ${
                                vendor.status === 'active' 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {vendor.status === 'active' ? (
                                <Ban className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              ) : (
                                <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowDeleteDialog(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:shadow-md group/btn"
                              title="Delete Vendor"
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
            {vendors.length > 0 && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Per page selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 font-medium">Rows per page:</span>
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
                      <span className="font-semibold text-slate-900">
                        {((pagination.page - 1) * pagination.limit) + 1}
                      </span>
                      {' '}-{' '}
                      <span className="font-semibold text-slate-900">
                        {Math.min(pagination.page * pagination.limit, totalItems)}
                      </span>
                      {' '}of{' '}
                      <span className="font-semibold text-slate-900">{totalItems}</span>
                    </span>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="font-medium"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {/* First page */}
                        {pagination.page > 3 && (
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
                          .filter(page => page >= pagination.page - 2 && page <= pagination.page + 2)
                          .map(page => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-all font-medium ${
                                pagination.page === page
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-600'
                                  : 'text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                        {/* Last page */}
                        {pagination.page < totalPages - 2 && (
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
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === totalPages}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${selectedVendor?.vendor_name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-md animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorList;
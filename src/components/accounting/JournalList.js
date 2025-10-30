// src/components/accounting/JournalList.js
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
  Edit,
  Trash2,
  FileText,
  Printer,
  Send,
  FileCheck
} from 'lucide-react';

const JournalList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [entries, setEntries] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    from_date: '',
    to_date: '',
    status: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (companyId) {
      fetchJournalEntries();
    }
  }, [filters, pagination, companyId]);

  const fetchJournalEntries = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        from_date: filters.from_date,
        to_date: filters.to_date,
        status: filters.status,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/accounting/journal-entries?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setEntries(result.data || []);
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
    if (!selectedEntry) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/accounting/journal-entries/${selectedEntry.id}`, {
        method: 'DELETE'
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Journal entry deleted successfully');
      setShowDeleteDialog(false);
      setSelectedEntry(null);
      fetchJournalEntries();
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
    const statusConfig = {
      draft: { variant: 'warning', label: 'Draft' },
      posted: { variant: 'success', label: 'Posted' },
      cancelled: { variant: 'danger', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Journal Entries</h1>
          <p className="text-slate-600 mt-1">Manage your accounting journal entries</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/accounting/journal-entries/new')}
          icon={<Plus className="w-5 h-5" />}
        >
          New Journal Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <SearchInput
              placeholder="Search entries..."
              value={filters.search}
              onChange={handleSearchChange}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div>
            <DatePicker
              placeholder="From date"
              value={filters.from_date}
              onChange={(value) => handleFilterChange('from_date', value)}
            />
          </div>
          <div>
            <DatePicker
              placeholder="To date"
              value={filters.to_date}
              onChange={(value) => handleFilterChange('to_date', value)}
            />
          </div>
          <div>
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'posted', label: 'Posted' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                  onClick={() => handleSortChange('entry_number')}
                >
                  Entry Number
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                  onClick={() => handleSortChange('entry_date')}
                >
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                  onClick={() => handleSortChange('total_debit')}
                >
                  Debit
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                  onClick={() => handleSortChange('total_credit')}
                >
                  Credit
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                  onClick={() => handleSortChange('status')}
                >
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-1">No journal entries found</h3>
                      <p className="text-slate-500 mb-4">Get started by creating a new journal entry.</p>
                      <Button
                        variant="primary"
                        onClick={() => router.push('/accounting/journal-entries/new')}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Create Journal Entry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {entry.entry_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="max-w-xs truncate">{entry.narration}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(entry.total_debit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(entry.total_credit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => router.push(`/accounting/journal-entries/${entry.id}`)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {entry.status === 'draft' && (
                        <>
                          <button
                            onClick={() => router.push(`/accounting/journal-entries/${entry.id}/edit`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="bg-white px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> entries
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Journal Entry"
        message="Are you sure you want to delete this journal entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default JournalList;
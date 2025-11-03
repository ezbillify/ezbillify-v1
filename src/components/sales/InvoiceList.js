// src/components/sales/InvoiceList.js - IMPROVED B2B DISPLAY & SMOOTH REDIRECT
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
import { useAuth } from '../../context/AuthContext';
import printService from '../../services/printService';
import PrintSelectionDialog from '../shared/print/PrintSelectionDialog';
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
  FileCheck,
  Building,
  AlertCircle
} from 'lucide-react';

const InvoiceList = ({ companyId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [invoices, setInvoices] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
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
      fetchInvoices();
    }
  }, [filters, pagination, companyId]);

  const fetchInvoices = async () => {
    console.log('⚡ Fetching invoices...');
    const startTime = performance.now();

    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/sales/invoices?${params}`);
    };

    const result = await executeRequest(apiCall);
    
    if (result.success) {
      setInvoices(result.data || []);
      setTotalItems(result.pagination?.total || 0);
      
      const endTime = performance.now();
      console.log(`✅ Invoices loaded in ${(endTime - startTime).toFixed(0)}ms`);
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
    if (!selectedInvoice) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/invoices/${selectedInvoice.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Invoice deleted successfully');
      setShowDeleteDialog(false);
      setSelectedInvoice(null);
      fetchInvoices();
    }
  };

  const handleQuickPrint = (invoice) => {
    setInvoiceToPrint(invoice);
    setShowPrintDialog(true);
  };

  const handlePrint = async (selectedTemplate) => {
    if (!invoiceToPrint || !company) {
      showError('Unable to print. Missing invoice or company data.');
      return;
    }

    try {
      const invoiceData = {
        ...invoiceToPrint,
        company: company
      };

      await printService.printDocumentWithTemplate(
        invoiceData,
        'invoice',
        company.id,
        selectedTemplate
      );

      success('Invoice sent to printer');
      setShowPrintDialog(false);
      setInvoiceToPrint(null);
    } catch (error) {
      console.error('Print error:', error);
      showError('Failed to print invoice: ' + error.message);
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

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Invoices</h1>
          <p className="text-slate-600 mt-1">Manage your sales invoices and customer payments</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/sales/invoices/new')}
          icon={<Plus className="w-5 h-5" />}
        >
          Create Invoice
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2" style={{ maxWidth: '90%' }}>
            <SearchInput 
              placeholder="Search by invoice number or customer..." 
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
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

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer / Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No invoices found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Get started by creating a new invoice.
                    </p>
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={() => router.push('/sales/invoices/new')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {invoice.document_number}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {/* ✅ B2B: Show company name as main, contact person as secondary */}
                        {invoice.customer?.customer_type === 'b2b' && invoice.customer?.company_name ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-50 rounded">
                                <Building className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div className="text-sm font-semibold text-slate-900">
                                {invoice.customer.company_name}
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 ml-6">
                              Contact: {invoice.customer.name}
                            </div>
                            <div className="text-xs text-slate-500 ml-6">
                              {invoice.customer.customer_code}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-slate-900">
                              {invoice.customer?.name || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {invoice.customer?.customer_code || '-'}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(invoice.document_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge 
                        variant={invoice.payment_status === 'paid' ? 'success' : invoice.payment_status === 'partial' ? 'warning' : 'danger'}
                      >
                        {invoice.payment_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/sales/invoices/${invoice.id}`)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/sales/invoices/new?id=${invoice.id}`)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickPrint(invoice)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
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
        {invoices.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-slate-700">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, totalItems)} to{' '}
              {Math.min(pagination.page * pagination.limit, totalItems)} of {totalItems} invoices
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
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${selectedInvoice?.document_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
      />

      {/* Print Template Selection Dialog */}
      <PrintSelectionDialog
        isOpen={showPrintDialog}
        onClose={() => {
          setShowPrintDialog(false);
          setInvoiceToPrint(null);
        }}
        onPrint={handlePrint}
        documentType="invoice"
        documentId={invoiceToPrint?.id}
        company={company}
      />
    </div>
  );
};

export default InvoiceList;
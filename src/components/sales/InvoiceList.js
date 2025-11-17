// src/components/sales/InvoiceList.js - IMPROVED B2B DISPLAY & CORRECT TOTAL CALCULATION & FIXED PAGINATION
'use client';

import { useState, useEffect, useRef } from 'react';
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
import Pagination from '../shared/data-display/Pagination';
import { realtimeHelpers } from '../../services/utils/supabase';
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
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
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
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const subscriptionRef = useRef(null);

  // Load initial state from localStorage or use defaults
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('invoiceListFilters');
      const savedPagination = localStorage.getItem('invoiceListPagination');
      
      return {
        filters: savedFilters ? JSON.parse(savedFilters) : {
          search: '',
          from_date: '',
          to_date: ''
        },
        pagination: savedPagination ? JSON.parse(savedPagination) : {
          page: 1,
          limit: PAGINATION.DEFAULT_PAGE_SIZE,
          sortBy: 'document_date',
          sortOrder: 'desc'
        }
      };
    }
    return {
      filters: {
        search: '',
        from_date: '',
        to_date: ''
      },
      pagination: {
        page: 1,
        limit: PAGINATION.DEFAULT_PAGE_SIZE,
        sortBy: 'document_date',
        sortOrder: 'desc'
      }
    };
  };

  const initialState = getInitialState();
  const [filters, setFilters] = useState(initialState.filters);
  const [pagination, setPagination] = useState(initialState.pagination);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('invoiceListFilters', JSON.stringify(filters));
    }
  }, [filters]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('invoiceListPagination', JSON.stringify(pagination));
    }
  }, [pagination]);

  useEffect(() => {
    if (companyId) {
      fetchInvoices();
    }
  }, [filters, pagination, companyId, refreshTrigger]);

  const fetchInvoices = async () => {
    console.log('🔍 Fetching invoices...');
    const startTime = performance.now();

    try {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder,
        _timestamp: Date.now() // Cache busting
      });

      const result = await executeRequest(async () => {
        return await authenticatedFetch(`/api/sales/invoices?${params}`);
      });
      
      if (result.success) {
        setInvoices(result.data || []);
        setTotalItems(result.pagination?.total || 0);
        
        const endTime = performance.now();
        console.log(`✅ Invoices fetched in ${(endTime - startTime).toFixed(0)}ms`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch invoices:', error);
      showError('Failed to load invoices');
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

  const handleItemsPerPageChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Function to trigger immediate refresh
  const triggerRefresh = () => {
    console.log('🔄 Triggering invoice list refresh');
    setRefreshTrigger(prev => !prev);
  };

  // Real-time subscription
  useEffect(() => {
    if (companyId) {
      console.log('📡 Setting up invoice subscription');
      subscriptionRef.current = realtimeHelpers.subscribeToSalesDocuments(companyId, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new?.document_type === 'invoice') {
          console.log('📝 New invoice detected, scheduling refresh');
          setTimeout(() => {
            console.log('⚡ Executing delayed refresh');
            triggerRefresh();
          }, 800);
        }
      });

      // Set up window refresh function
      if (typeof window !== 'undefined') {
        window.refreshInvoiceList = () => {
          console.log('📱 Window refresh function called');
          triggerRefresh();
        };
      }

      // Add periodic refresh every 30 seconds to ensure data stays fresh
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('⏰ Periodic refresh check');
          fetchInvoices();
        }
      }, 30000);

      return () => {
        if (subscriptionRef.current) {
          console.log('🧹 Cleaning up subscription');
          realtimeHelpers.unsubscribe(subscriptionRef.current);
        }
        // Clean up window function
        if (typeof window !== 'undefined' && window.refreshInvoiceList) {
          delete window.refreshInvoiceList;
        }
        // Clean up interval
        clearInterval(interval);
      };
    }
  }, [companyId]);

  // Route change detection
  useEffect(() => {
    const handleRouteChange = () => {
      console.log('🔀 Route changed, refreshing');
      triggerRefresh();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, []);

  // Periodic refresh
  useEffect(() => {
    if (!companyId) return;
    
    const refreshInterval = setInterval(() => {
      console.log('⏱️ Periodic refresh');
      triggerRefresh();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [companyId]);

  // Check for refresh flag in URL when component mounts
  useEffect(() => {
    const checkForRefresh = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('refresh') === 'true') {
          console.log('🔗 URL refresh parameter detected');
          setTimeout(() => {
            triggerRefresh();
            
            // Remove refresh parameter from URL
            const newUrl = window.location.pathname + window.location.search.replace(/[?&]refresh=true/, '');
            window.history.replaceState({}, document.title, newUrl);
          }, 400);
        }
      }
    };
    
    // Check immediately and also after a short delay to ensure data is ready
    checkForRefresh();
    const refreshTimeout = setTimeout(checkForRefresh, 600);
    
    return () => clearTimeout(refreshTimeout);
  }, []);

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
      // Fetch complete invoice data with all relationships
      const result = await executeRequest(async () => {
        return await authenticatedFetch(`/api/sales/invoices/${invoiceToPrint.id}?company_id=${companyId}`);
      });

      if (!result.success) {
        showError('Failed to load invoice details for printing');
        return;
      }

      const fullInvoice = result.data;

      // Safety checks for nested objects
      const safeInvoice = fullInvoice || {};
      const safeCustomer = safeInvoice.customer || {};
      const safeBranch = safeInvoice.branch || {};
      const safeCompany = company || {};

      // Prepare complete invoice data matching InvoiceView structure
      const invoiceData = {
        ...safeInvoice,

        // COMPANY DETAILS
        company: safeCompany,

        // BRANCH DETAILS
        branch: safeBranch,

        // CUSTOMER DETAILS
        customer: safeCustomer,

        // ITEMS DETAILS
        items: safeInvoice.items,

        // BANK ACCOUNT (settings or company)
        bank_account: safeCompany?.settings?.bank_account || safeCompany?.bank_account || null,

        // IMPORTANT FIELDS
        document_number: safeInvoice.document_number,
        document_date: safeInvoice.document_date,
        due_date: safeInvoice.due_date,
        gst_type: safeInvoice.gst_type,

        // Total & tax
        subtotal: safeInvoice.subtotal,
        cgst_amount: safeInvoice.cgst_amount,
        sgst_amount: safeInvoice.sgst_amount,
        igst_amount: safeInvoice.igst_amount,
        discount_amount: safeInvoice.discount_amount,
        total_amount: safeInvoice.total_amount,

        // Customer extra (fallbacks)
        customer_name: safeCustomer.name,
        customer_phone: safeCustomer.phone,
        customer_gstin: safeCustomer.gstin,
        customer_address: safeCustomer.billing_address,

        // Force size
        paper_size: "80mm",
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

  // ✅ CORRECT TOTAL: Use stored total_amount which is calculated correctly during save
  const getInvoiceTotal = (invoice) => {
    if (!invoice) {
      return 0;
    }
    
    // Use stored total_amount - this is already correctly calculated and saved
    return parseFloat(invoice.total_amount) || 0;
  };

  // ✅ NEW FUNCTION: Calculate subtotal (sum of taxable amounts excluding tax)
  const getInvoiceSubtotal = (invoice) => {
    if (!invoice || !invoice.items) {
      return 0;
    }
    
    // Sum of all taxable_amount values (excluding tax)
    return invoice.items.reduce((sum, item) => sum + (parseFloat(item.taxable_amount) || 0), 0);
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

  // Function to get sort indicator for table headers
  const getSortIndicator = (field) => {
    if (pagination.sortBy !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-400" />;
    }
    return pagination.sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const totalPages = Math.ceil(totalItems / pagination.limit);

  // Create pagination object for the Pagination component
  const paginationInfo = {
    page: pagination.page,
    limit: pagination.limit,
    totalItems: totalItems,
    totalPages: totalPages
  };

  const handleNewInvoice = () => {
    // Force a full page navigation with a unique timestamp to ensure complete refresh
    window.location.href = `/sales/invoices/new?refresh=${Date.now()}`;
  };

  // Add useEffect to handle refresh parameter
  useEffect(() => {
    const { refresh } = router.query;
    if (refresh) {
      console.log('🔄 Refreshing invoice list due to refresh parameter');
      fetchInvoices();
    }
  }, [router.query.refresh]);

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
          onClick={handleNewInvoice}
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortChange('document_number')}
                >
                  <div className="flex items-center gap-1">
                    Invoice
                    {getSortIndicator('document_number')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortChange('customer.name')}
                >
                  <div className="flex items-center gap-1">
                    Customer / Company
                    {getSortIndicator('customer.name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortChange('document_date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIndicator('document_date')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortChange('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Due Date
                    {getSortIndicator('due_date')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortChange('total_amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    {getSortIndicator('total_amount')}
                  </div>
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
                      {formatCurrency(getInvoiceTotal(invoice))}
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

        {/* Pagination - CUSTOM VERSION */}
        {totalPages > 1 && (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Per page selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 font-medium">Rows per page:</span>
                <div className="relative">
                  <Select
                    value={pagination.limit}
                    onChange={handleItemsPerPageChange}
                    options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                      value: size,
                      label: `${size}`
                    }))}
                    className="w-20"
                  />
                </div>
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {Math.min((pagination.page - 1) * pagination.limit + 1, totalItems)}
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
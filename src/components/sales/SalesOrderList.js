// src/components/sales/SalesOrderList.js
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
import { useAuth } from '../../context/AuthContext';
import printService from '../../services/printService';
import PrintSelectionDialog from '../shared/print/PrintSelectionDialog';
import { PAGINATION } from '../../lib/constants';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';
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
  FileCheck
} from 'lucide-react';

const SalesOrderList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  const { company } = useAuth();

  const [salesOrders, setSalesOrders] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [salesOrderToPrint, setSalesOrderToPrint] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const subscriptionRef = useRef(null);

  const [filters, setFilters] = useState({
    search: '',
    from_date: '',
    to_date: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (companyId) {
      fetchSalesOrders();
    }
  }, [filters, pagination, companyId, refreshTrigger]);

  const fetchSalesOrders = async () => {
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

      return await authenticatedFetch(`/api/sales/sales-orders?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setSalesOrders(result.data || []);
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

  // Function to trigger immediate refresh
  const triggerRefresh = () => {
    setRefreshTrigger(prev => !prev);
  };

  // Expose refresh function to window for external calls
  useEffect(() => {
    window.refreshInvoiceList = triggerRefresh;
    
    return () => {
      // Clean up function
      delete window.refreshInvoiceList;
    };
  }, []);

  // Check for refresh flag in URL when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refresh') === 'true') {
      triggerRefresh();
      
      // Remove refresh parameter from URL
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]refresh=true/, '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Real-time subscription for sales documents
  useEffect(() => {
    if (companyId) {
      // Subscribe to sales document changes (only new sales orders)
      subscriptionRef.current = realtimeHelpers.subscribeToSalesDocuments(companyId, (payload) => {
        console.log('Real-time sales document update:', payload);
        // Only trigger refresh for INSERT events (new documents)
        if (payload.eventType === 'INSERT') {
          // For INSERT events, check document_type in the new record
          if (payload.new?.document_type === 'sales_order') {
            console.log('New sales order created, triggering refresh');
            triggerRefresh();
          }
        } else if (payload.eventType === 'UPDATE') {
          // For UPDATE events, check document_type in either new or old record
          if (payload.new?.document_type === 'sales_order' || payload.old?.document_type === 'sales_order') {
            console.log('Sales order updated, triggering refresh');
            triggerRefresh();
          }
        }
      });

      // Cleanup subscription on unmount
      return () => {
        if (subscriptionRef.current) {
          realtimeHelpers.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [companyId]);

  const handleDelete = async () => {
    if (!selectedSalesOrder) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/sales-orders/${selectedSalesOrder.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Sales order deleted successfully');
      setShowDeleteDialog(false);
      setSelectedSalesOrder(null);
      fetchSalesOrders();
    }
  };

  const handleQuickPrint = (salesOrder) => {
    setSalesOrderToPrint(salesOrder);
    setShowPrintDialog(true);
  };

  const handlePrint = async (selectedTemplate) => {
    if (!salesOrderToPrint || !companyId) {
      showError('Unable to print. Missing sales order or company data.');
      return;
    }

    try {
      // Fetch complete sales order data with all relationships
      const result = await executeRequest(async () => {
        return await authenticatedFetch(`/api/sales/sales-orders/${salesOrderToPrint.id}?company_id=${companyId}`);
      });

      if (!result.success) {
        showError('Failed to load sales order details for printing');
        return;
      }

      const fullSalesOrder = result.data;

      // Safety checks for nested objects
      const safeSalesOrder = fullSalesOrder || {};
      const safeCustomer = safeSalesOrder.customer || {};
      const safeBranch = safeSalesOrder.branch || {};
      const safeCompany = safeSalesOrder.company || {};

      // Prepare complete sales order data
      const salesOrderData = {
        ...safeSalesOrder,

        // COMPANY DETAILS
        company: safeCompany,

        // BRANCH DETAILS
        branch: safeBranch,

        // CUSTOMER DETAILS
        customer: safeCustomer,

        // ITEMS DETAILS
        items: safeSalesOrder.items,

        // BANK ACCOUNT (settings or company)
        bank_account: safeCompany?.settings?.bank_account || safeCompany?.bank_account || null,

        // IMPORTANT FIELDS
        document_number: safeSalesOrder.document_number,
        document_date: safeSalesOrder.document_date,
        delivery_date: safeSalesOrder.delivery_date,
        gst_type: safeSalesOrder.gst_type,

        // Total & tax
        subtotal: safeSalesOrder.subtotal,
        cgst_amount: safeSalesOrder.cgst_amount,
        sgst_amount: safeSalesOrder.sgst_amount,
        igst_amount: safeSalesOrder.igst_amount,
        discount_amount: safeSalesOrder.discount_amount,
        total_amount: safeSalesOrder.total_amount,

        // Customer extra (fallbacks)
        customer_name: safeCustomer.name,
        customer_phone: safeCustomer.phone,
        customer_gstin: safeCustomer.gstin,
        customer_address: safeCustomer.billing_address,
      };

      await printService.printDocumentWithTemplate(
        salesOrderData,
        'sales-order',
        companyId,
        selectedTemplate
      );

      success('Sales order sent to printer');
      setShowPrintDialog(false);
      setSalesOrderToPrint(null);
    } catch (error) {
      console.error('Print error:', error);
      showError('Failed to print sales order: ' + error.message);
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
          <h1 className="text-2xl font-bold text-slate-800">Sales Orders</h1>
          <p className="text-slate-600 mt-1">Manage your sales orders and customer deliveries</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/sales/sales-orders/new')}
          icon={<Plus className="w-5 h-5" />}
        >
          Create Sales Order
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
              placeholder="Search by order number or customer..." 
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

      {/* Sales Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {salesOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No sales orders found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Get started by creating a new sales order.
                    </p>
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={() => router.push('/sales/sales-orders/new')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Sales Order
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                salesOrders.map((salesOrder) => (
                  <tr key={salesOrder.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {salesOrder.document_number}
                      </div>
                      {salesOrder.branch && (
                        <div className="text-xs text-slate-500 mt-1">
                          {salesOrder.branch.name || salesOrder.branch.branch_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {salesOrder.customer?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {salesOrder.customer?.customer_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(salesOrder.document_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(salesOrder.due_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(salesOrder.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/sales/sales-orders/${salesOrder.id}`)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/sales/sales-orders/new?id=${salesOrder.id}`)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickPrint(salesOrder)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print Sales Order"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSalesOrder(salesOrder);
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
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items info and page size selector */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {Math.min((pagination.page - 1) * pagination.limit + 1, totalItems)}
                  </span>
                  {' '}-{' '}
                  <span className="font-semibold text-slate-900">
                    {Math.min(pagination.page * pagination.limit, totalItems)}
                  </span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-900">{totalItems}</span>
                  {' '}sales order{totalItems !== 1 ? 's' : ''}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Show</span>
                  <Select
                    value={pagination.limit}
                    onChange={handleItemsPerPageChange}
                    options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                      value: size,
                      label: `${size}`
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-600">per page</span>
                </div>
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
        title="Delete Sales Order"
        message={`Are you sure you want to delete sales order ${selectedSalesOrder?.document_number}? This action cannot be undone.`}
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
          setSalesOrderToPrint(null);
        }}
        onPrint={handlePrint}
        documentType="sales-order"
        documentId={salesOrderToPrint?.id}
        company={company}
      />
    </div>
  );
};

export default SalesOrderList;
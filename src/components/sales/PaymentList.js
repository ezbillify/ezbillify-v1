// src/components/sales/PaymentList.js
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
  Send
} from 'lucide-react';

const PaymentList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [payments, setPayments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const subscriptionRef = useRef(null);

  const [filters, setFilters] = useState({
    search: '',
    customer_id: '',
    payment_method: '',
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
      fetchPayments();
    }
  }, [filters, pagination, companyId, refreshTrigger]);

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

  const fetchPayments = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        customer_id: filters.customer_id,
        payment_method: filters.payment_method,
        from_date: filters.from_date,
        to_date: filters.to_date,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/sales/payments?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setPayments(result.data || []);
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

  // Real-time subscription for payments
  useEffect(() => {
    if (companyId) {
      // Subscribe to payment changes
      subscriptionRef.current = realtimeHelpers.subscribeToPayments(companyId, (payload) => {
        console.log('Real-time payment update:', payload);
        // Only trigger refresh for INSERT events (new payments)
        if (payload.eventType === 'INSERT') {
          console.log('New payment created, triggering refresh');
          triggerRefresh();
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
    if (!selectedPayment) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/payments/${selectedPayment.id}`, {
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
    const variants = {
      cash: 'default',
      bank_transfer: 'info',
      cheque: 'warning',
      upi: 'success',
      credit_card: 'purple',
      debit_card: 'blue'
    };
    
    const labels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card'
    };
    
    return <Badge variant={variants[method] || 'default'}>{labels[method] || method}</Badge>;
  };

  const paymentMethodOptions = [
    { value: '', label: 'All Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Payments</h1>
          <p className="text-gray-600 mt-1">Manage customer payments and allocations</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/sales/payments/new')}
          icon={<Plus className="w-4 h-4" />}
        >
          Receive Payment
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-lg font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-lg font-semibold text-gray-900">₹0.00</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-lg font-semibold text-gray-900">₹0.00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <SearchInput
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search payments..."
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            <Select
              value={filters.customer_id}
              onChange={(value) => handleFilterChange('customer_id', value)}
              options={customerOptions}
              placeholder="Customer"
              className="w-full"
            />
            
            <Select
              value={filters.payment_method}
              onChange={(value) => handleFilterChange('payment_method', value)}
              options={paymentMethodOptions}
              placeholder="Method"
              className="w-full"
            />
            
            <DatePicker
              value={filters.from_date}
              onChange={(date) => handleFilterChange('from_date', date)}
              placeholder="From Date"
              className="w-full"
            />
            
            <DatePicker
              value={filters.to_date}
              onChange={(date) => handleFilterChange('to_date', date)}
              placeholder="To Date"
              className="w-full"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setFilters({
              search: '',
              customer_id: '',
              payment_method: '',
              from_date: '',
              to_date: ''
            })}
          >
            <Filter className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('payment_number')}
                >
                  <div className="flex items-center">
                    Payment #
                    {pagination.sortBy === 'payment_number' && (
                      <span className="ml-1">
                        {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('payment_date')}
                >
                  <div className="flex items-center">
                    Date
                    {pagination.sortBy === 'payment_date' && (
                      <span className="ml-1">
                        {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('amount')}
                >
                  <div className="flex items-center">
                    Amount
                    {pagination.sortBy === 'amount' && (
                      <span className="ml-1">
                        {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No payments found</h3>
                    <p className="mt-1 text-gray-500">Get started by receiving your first payment.</p>
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={() => router.push('/sales/payments/new')}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Receive Payment
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.customer?.name || 'Unknown Customer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.customer?.customer_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentMethodBadge(payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success">Completed</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/sales/payments/${payment.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View payment"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/sales/payments/${payment.id}/edit`)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                          title="Edit payment"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete payment"
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
                  {' '}payment{totalItems !== 1 ? 's' : ''}
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
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PaymentList;

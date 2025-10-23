// src/components/purchase/PaymentMadeList.js
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
import DashboardCard from '../shared/charts/DashboardCard';
import LineChart from '../shared/charts/LineChart';
import PieChart from '../shared/charts/PieChart';
import BarChart from '../shared/charts/BarChart';
import DonutChart from '../shared/charts/DonutChart';
import Payables from './Payables';

const PaymentMadeList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [activeView, setActiveView] = useState('list');
  const [payments, setPayments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Chart type selections
  const [chartTypes, setChartTypes] = useState({
    monthlyTrend: 'line',
    vendorDistribution: 'pie',
    paymentMethods: 'bar',
    statusDistribution: 'donut'
  });

  const [summary, setSummary] = useState({
    total_payables: 0,
    overdue_payables: 0,
    due_this_month: 0,
    total_vendors: 0,
    paid_this_month: 0,
    paid_last_month: 0,
    paid_change_percentage: 0
  });

  const [analyticsData, setAnalyticsData] = useState({
    monthlyTrend: [],
    vendorDistribution: [],
    paymentMethods: [],
    statusDistribution: []
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
      fetchSummary();
      if (activeView === 'list') {
        fetchPayments();
      } else {
        fetchAnalytics();
      }
    }
  }, [filters, pagination, companyId, activeView]);

  const fetchSummary = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/summary?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setSummary(result.data);
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

  const fetchAnalytics = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made?company_id=${companyId}&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const allPayments = result.data || [];
      
      const monthlyData = calculateMonthlyTrend(allPayments);
      const vendorData = calculateVendorDistribution(allPayments);
      const methodsData = calculatePaymentMethods(allPayments);
      const statusData = [
        { label: 'Paid', value: summary.paid_this_month },
        { label: 'Pending', value: summary.total_payables }
      ];

      setAnalyticsData({
        monthlyTrend: monthlyData,
        vendorDistribution: vendorData,
        paymentMethods: methodsData,
        statusDistribution: statusData
      });
    }
  };

  const calculateMonthlyTrend = (payments) => {
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
      const year = date.getFullYear();
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === date.getMonth() && 
               paymentDate.getFullYear() === date.getFullYear();
      });
      
      const total = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      last6Months.push({
        label: `${monthName} ${year}`,
        value: total
      });
    }
    
    return last6Months;
  };

  const calculateVendorDistribution = (payments) => {
    const vendorTotals = {};
    
    payments.forEach(p => {
      const vendorName = p.vendor_name || 'Unknown';
      vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + parseFloat(p.amount || 0);
    });
    
    const sortedVendors = Object.entries(vendorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return sortedVendors.map(([label, value]) => ({ label, value }));
  };

  const calculatePaymentMethods = (payments) => {
    const methodTotals = {};
    
    payments.forEach(p => {
      const method = p.payment_method || 'other';
      const label = method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      methodTotals[label] = (methodTotals[label] || 0) + parseFloat(p.amount || 0);
    });
    
    return Object.entries(methodTotals).map(([label, value]) => ({ label, value }));
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
      fetchSummary();
    }
  };

  const handleChartTypeChange = (chartKey, newType) => {
    setChartTypes(prev => ({
      ...prev,
      [chartKey]: newType
    }));
  };

  const renderChart = (data, title, chartKey) => {
    const chartType = chartTypes[chartKey];
    
    const chartOptions = [
      { 
        value: 'line', 
        label: 'Line',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        )
      },
      { 
        value: 'bar', 
        label: 'Bar',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      { 
        value: 'pie', 
        label: 'Pie',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        )
      },
      { 
        value: 'donut', 
        label: 'Donut',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        )
      }
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Chart Header with Type Selector */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
            {chartOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleChartTypeChange(chartKey, option.value)}
                className={`p-2 rounded-md transition-all ${
                  chartType === option.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="w-full">
          {chartType === 'line' && <LineChart data={data} height={300} />}
          {chartType === 'bar' && <BarChart data={data} height={300} />}
          {chartType === 'pie' && <PieChart data={data} height={300} />}
          {chartType === 'donut' && <DonutChart data={data} height={300} />}
        </div>
      </div>
    );
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
    const config = {
      cash: { label: 'Cash', variant: 'success' },
      bank_transfer: { label: 'Bank Transfer', variant: 'info' },
      cheque: { label: 'Cheque', variant: 'warning' },
      upi: { label: 'UPI', variant: 'purple' },
      card: { label: 'Card', variant: 'default' },
      other: { label: 'Other', variant: 'default' }
    };
    const { label, variant } = config[method] || { label: method, variant: 'default' };
    return <Badge variant={variant}>{label}</Badge>;
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

  const getTrendDirection = (percentage) => {
    if (percentage > 0) return 'up';
    if (percentage < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payments Made</h1>
          <p className="text-slate-600 mt-1">Track vendor payments and manage payables</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex gap-1 shadow-sm">
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeView === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>LIST</span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeView === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>DASHBOARD</span>
              </div>
            </button>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Paid This Month"
          value={formatCurrency(summary.paid_this_month)}
          subtitle="Total payments made"
          trend={getTrendDirection(summary.paid_change_percentage)}
          trendValue={`${Math.abs(summary.paid_change_percentage).toFixed(1)}% vs last month`}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <DashboardCard
          title="Total Payables"
          value={formatCurrency(summary.total_payables)}
          subtitle="Outstanding to vendors"
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <DashboardCard
          title="Overdue"
          value={formatCurrency(summary.overdue_payables)}
          subtitle="Past due date"
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <DashboardCard
          title="Vendors with Dues"
          value={summary.total_vendors}
          subtitle="Active vendors"
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Content Based on Active View */}
      {activeView === 'list' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <style jsx>{`
              .date-picker-right-align :global(.calendar-dropdown) {
                right: 0 !important;
                left: auto !important;
              }
            `}</style>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

              <div>
                <DatePicker
                  label="From Date"
                  value={filters.from_date}
                  onChange={(date) => handleFilterChange('from_date', date)}
                  placeholder="Select from date"
                />
              </div>

              <div className="date-picker-right-align">
                <DatePicker
                  label="To Date"
                  value={filters.to_date}
                  onChange={(date) => handleFilterChange('to_date', date)}
                  placeholder="Select to date"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.search || filters.payment_method || filters.from_date || filters.to_date) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-700">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge variant="info" onRemove={() => handleFilterChange('search', '')}>
                      Search: {filters.search}
                    </Badge>
                  )}
                  {filters.payment_method && (
                    <Badge variant="info" onRemove={() => handleFilterChange('payment_method', '')}>
                      Method: {paymentMethodOptions.find(m => m.value === filters.payment_method)?.label}
                    </Badge>
                  )}
                  {filters.from_date && (
                    <Badge variant="info" onRemove={() => handleFilterChange('from_date', '')}>
                      From: {formatDate(filters.from_date)}
                    </Badge>
                  )}
                  {filters.to_date && (
                    <Badge variant="info" onRemove={() => handleFilterChange('to_date', '')}>
                      To: {formatDate(filters.to_date)}
                    </Badge>
                  )}
                  <button
                    onClick={() => setFilters({ search: '', payment_method: '', from_date: '', to_date: '' })}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
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
                <p className="mt-1 text-sm text-slate-500">Get started by recording your first vendor payment.</p>
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
                              <div className="text-xs text-slate-500 mt-1">
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
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => router.push(`/purchase/payments-made/${payment.id}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowDeleteDialog(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
        </>
      ) : (
        /* Dashboard View */
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderChart(
              analyticsData.monthlyTrend,
              'Payment Trends (Last 6 Months)',
              'monthlyTrend'
            )}
            
            {renderChart(
              analyticsData.vendorDistribution,
              'Top 5 Vendors by Payment',
              'vendorDistribution'
            )}
            
            {renderChart(
              analyticsData.paymentMethods,
              'Payment Methods Used',
              'paymentMethods'
            )}
            
            {renderChart(
              analyticsData.statusDistribution,
              'Payment Status Overview',
              'statusDistribution'
            )}
          </div>

          {/* Payables Section */}
          <Payables companyId={companyId} />
        </div>
      )}

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
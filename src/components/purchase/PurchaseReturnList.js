// src/components/purchase/PurchaseReturnList.js
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

const PurchaseReturnList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [activeView, setActiveView] = useState('list');
  const [returns, setReturns] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Chart type selections
  const [chartTypes, setChartTypes] = useState({
    monthlyTrend: 'line',
    vendorDistribution: 'pie',
    reasonDistribution: 'bar',
    statusDistribution: 'donut'
  });

  const [summary, setSummary] = useState({
    returned_this_month: 0,
    returned_last_month: 0,
    return_change_percentage: 0,
    total_draft_returns: 0,
    total_returns_count: 0,
    vendors_with_returns: 0
  });

  const [analyticsData, setAnalyticsData] = useState({
    monthlyTrend: [],
    vendorDistribution: [],
    reasonDistribution: [],
    statusDistribution: []
  });

  const [filters, setFilters] = useState({
    search: '',
    vendor_id: '',
    status: '',
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
      fetchSummary();
      if (activeView === 'list') {
        fetchReturns();
      } else {
        fetchAnalytics();
      }
    }
  }, [filters, pagination, companyId, activeView]);

  const fetchSummary = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns/summary?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setSummary(result.data);
    }
  };

  const fetchReturns = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        vendor_id: filters.vendor_id,
        status: filters.status,
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

  const fetchAnalytics = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns?company_id=${companyId}&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const allReturns = result.data || [];
      
      const monthlyData = calculateMonthlyTrend(allReturns);
      const vendorData = calculateVendorDistribution(allReturns);
      const reasonData = calculateReasonDistribution(allReturns);
      const statusData = [
        { label: 'Draft', value: summary.total_draft_returns },
        { label: 'Approved', value: summary.returned_this_month }
      ];

      setAnalyticsData({
        monthlyTrend: monthlyData,
        vendorDistribution: vendorData,
        reasonDistribution: reasonData,
        statusDistribution: statusData
      });
    }
  };

  const calculateMonthlyTrend = (returns) => {
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
      const year = date.getFullYear();
      
      const monthReturns = returns.filter(r => {
        const returnDate = new Date(r.document_date);
        return returnDate.getMonth() === date.getMonth() && 
               returnDate.getFullYear() === date.getFullYear();
      });
      
      const total = monthReturns.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
      
      last6Months.push({
        label: `${monthName} ${year}`,
        value: total
      });
    }
    
    return last6Months;
  };

  const calculateVendorDistribution = (returns) => {
    const vendorTotals = {};
    
    returns.forEach(r => {
      const vendorName = r.vendor_name || 'Unknown';
      vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + parseFloat(r.total_amount || 0);
    });
    
    const sortedVendors = Object.entries(vendorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return sortedVendors.map(([label, value]) => ({ label, value }));
  };

  const calculateReasonDistribution = (returns) => {
    const reasonTotals = {};
    
    returns.forEach(r => {
      const reason = r.return_reason || 'Not Specified';
      reasonTotals[reason] = (reasonTotals[reason] || 0) + parseFloat(r.total_amount || 0);
    });
    
    return Object.entries(reasonTotals).map(([label, value]) => ({ label, value }));
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
      success('Debit note deleted successfully');
      setShowDeleteDialog(false);
      setSelectedReturn(null);
      fetchReturns();
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
        <div className="flex items-center justify-between mb-4">
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

        <div className="w-full h-[350px] relative">
          {chartType === 'line' && <LineChart data={data} height={350} />}
          {chartType === 'bar' && <BarChart data={data} height={350} />}
          {chartType === 'pie' && <PieChart data={data} height={350} />}
          {chartType === 'donut' && <DonutChart data={data} height={350} />}
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

  // 🔥 FIXED: Added 'approved' status
  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Draft', variant: 'default' },
      approved: { label: 'Approved', variant: 'success' },
      processed: { label: 'Processed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'error' },
      expired: { label: 'Expired', variant: 'warning' }
    };
    const { label, variant} = config[status] || { label: status, variant: 'default' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 🔥 FIXED: Added 'approved' to filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Approved' },
    { value: 'processed', label: 'Processed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' }
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
          <h1 className="text-2xl font-bold text-slate-800">Purchase Returns (Debit Notes)</h1>
          <p className="text-slate-600 mt-1">Manage returns to vendors and track debit notes</p>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Returns This Month"
          value={formatCurrency(summary.returned_this_month)}
          subtitle="Total returned"
          trend={getTrendDirection(summary.return_change_percentage)}
          trendValue={`${Math.abs(summary.return_change_percentage).toFixed(1)}% vs last month`}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <DashboardCard
          title="Draft Returns"
          value={formatCurrency(summary.total_draft_returns)}
          subtitle="Pending processing"
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <DashboardCard
          title="Total Returns"
          value={summary.total_returns_count}
          subtitle="All time"
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />

        <DashboardCard
          title="Vendors with Returns"
          value={summary.vendors_with_returns}
          subtitle="This month"
          color="purple"
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <SearchInput
                  placeholder="Search by debit note number, vendor..."
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

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    From Date
                  </label>
                  <DatePicker
                    value={filters.from_date}
                    onChange={(date) => handleFilterChange('from_date', date)}
                    placeholder="Start date"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    To Date
                  </label>
                  <DatePicker
                    value={filters.to_date}
                    onChange={(date) => handleFilterChange('to_date', date)}
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.search || filters.status || filters.from_date || filters.to_date) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-700">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge variant="info" onRemove={() => handleFilterChange('search', '')}>
                      Search: {filters.search}
                    </Badge>
                  )}
                  {filters.status && (
                    <Badge variant="info" onRemove={() => handleFilterChange('status', '')}>
                      Status: {statusOptions.find(s => s.value === filters.status)?.label}
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
                    onClick={() => setFilters({ search: '', status: '', from_date: '', to_date: '' })}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No returns found</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by creating your first purchase return.</p>
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
                            Debit Note #
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

                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount
                        </th>

                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Reason
                        </th>

                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-200">
                      {returns.map((returnItem) => (
                        <tr key={returnItem.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {returnItem.document_number}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {formatDate(returnItem.document_date)}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {returnItem.vendor_name || returnItem.vendor?.vendor_name}
                            </div>
                            {returnItem.vendor?.vendor_code && (
                              <div className="text-xs text-slate-500">{returnItem.vendor.vendor_code}</div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-orange-600">
                              {formatCurrency(returnItem.total_amount)}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getStatusBadge(returnItem.status)}
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900 max-w-xs truncate">
                              {returnItem.return_reason || '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/purchase/returns/${returnItem.id}`)}
                                icon={
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                }
                              >
                                View
                              </Button>

                              {/* 🔥 FIXED: Allow deletion of BOTH draft AND approved returns */}
                              {(returnItem.status === 'draft' || returnItem.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedReturn(returnItem);
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
                {returns.length > 0 && (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderChart(
              analyticsData.monthlyTrend,
              'Return Trends (Last 6 Months)',
              'monthlyTrend'
            )}
            
            {renderChart(
              analyticsData.vendorDistribution,
              'Top 5 Vendors by Returns',
              'vendorDistribution'
            )}
            
            {renderChart(
              analyticsData.reasonDistribution,
              'Return Reasons Distribution',
              'reasonDistribution'
            )}
            
            {renderChart(
              analyticsData.statusDistribution,
              'Return Status Overview',
              'statusDistribution'
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Debit Note"
        message={`Are you sure you want to delete Debit Note "${selectedReturn?.document_number}"? This will reverse all inventory and vendor balance changes. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default PurchaseReturnList;
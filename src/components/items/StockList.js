// src/components/items/StockList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { PAGINATION } from '../../lib/constants';

const StockList = ({ companyId }) => {
  const router = useRouter();
  const { warning } = useToast();
  const { loading, error, executeRequest } = useAPI();

  // State management
  const [stockData, setStockData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stockSummary, setStockSummary] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0
  });

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stock_status: '', // all, in_stock, low_stock, out_of_stock
    location: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'item_name',
    sortOrder: 'asc'
  });

  // Categories (populated from stock data)
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // Load stock data
  useEffect(() => {
    fetchStockData();
  }, [filters, pagination]);

  const fetchStockData = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        ...filters,
        ...pagination,
        company_id: companyId
      });

      const response = await fetch(`/api/items/stock/current?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }

      return await response.json();
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setStockData(result.data.items || []);
      setTotalItems(result.data.total || 0);
      setStockSummary(result.data.summary || {});
      
      // Extract unique categories and locations
      const uniqueCategories = [...new Set(
        (result.data.items || [])
          .map(item => item.category)
          .filter(Boolean)
      )];
      
      const uniqueLocations = [...new Set(
        (result.data.items || [])
          .flatMap(item => item.stock_movements?.map(movement => movement.location) || [])
          .filter(Boolean)
      )];
      
      setCategories(uniqueCategories);
      setLocations(uniqueLocations);
    }
  };

  // Filter handlers
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

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Actions
  const handleStockIn = (itemId) => {
    router.push(`/items/stock-in?item=${itemId}`);
  };

  const handleStockOut = (itemId) => {
    router.push(`/items/stock-out?item=${itemId}`);
  };

  const handleStockAdjustment = (itemId) => {
    router.push(`/items/stock-adjustment?item=${itemId}`);
  };

  // Utility functions
  const getStockStatus = (item) => {
    if (item.current_stock <= 0) return 'out-of-stock';
    if (item.current_stock <= item.reorder_level) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out-of-stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in-stock': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusIcon = (status) => {
    switch (status) {
      case 'out-of-stock':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>;
      case 'low-stock':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>;
      case 'in-stock':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>;
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Prepare filter options
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({
      value: category,
      label: category
    }))
  ];

  const stockStatusOptions = [
    { value: '', label: 'All Stock Status' },
    { value: 'in-stock', label: 'In Stock' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'out-of-stock', label: 'Out of Stock' }
  ];

  const locationOptions = [
    { value: '', label: 'All Locations' },
    ...locations.map(location => ({
      value: location,
      label: location
    }))
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Current Stock</h1>
          <p className="text-slate-600">Monitor your inventory levels</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="success"
            onClick={() => router.push('/items/stock-in')}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            Stock In
          </Button>
          <Button 
            variant="danger"
            onClick={() => router.push('/items/stock-out')}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            }
          >
            Stock Out
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Items</p>
              <p className="text-2xl font-bold text-slate-900">{stockSummary.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Low Stock</p>
              <p className="text-2xl font-bold text-slate-900">{stockSummary.lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Out of Stock</p>
              <p className="text-2xl font-bold text-slate-900">{stockSummary.outOfStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stockSummary.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SearchInput
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSearch={handleSearchChange}
          />
          
          <Select
            placeholder="Category"
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={categoryOptions}
          />
          
          <Select
            placeholder="Stock Status"
            value={filters.stock_status}
            onChange={(value) => handleFilterChange('stock_status', value)}
            options={stockStatusOptions}
          />
          
          <Select
            placeholder="Location"
            value={filters.location}
            onChange={(value) => handleFilterChange('location', value)}
            options={locationOptions}
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-600">
            {totalItems} items found
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading stock data...</p>
          </div>
        ) : stockData.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No stock data found</h3>
            <p className="mt-1 text-sm text-slate-500">Items with inventory tracking will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('item_name')}
                    >
                      <div className="flex items-center">
                        Item
                        {pagination.sortBy === 'item_name' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('current_stock')}
                    >
                      <div className="flex items-center justify-end">
                        Current Stock
                        {pagination.sortBy === 'current_stock' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Value
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
                  {stockData.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const stockValue = item.current_stock * (item.purchase_price || item.selling_price || 0);
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {item.item_name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {item.item_code}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {item.category || '-'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {item.current_stock} {item.primary_unit?.unit_symbol || ''}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-slate-900">
                            {item.available_stock} {item.primary_unit?.unit_symbol || ''}
                          </div>
                          {item.reserved_stock > 0 && (
                            <div className="text-xs text-slate-500">
                              Reserved: {item.reserved_stock}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-slate-900">
                            {item.reorder_level} {item.primary_unit?.unit_symbol || ''}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(stockValue)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStockStatusColor(stockStatus)}`}>
                            {getStockStatusIcon(stockStatus)}
                            <span className="ml-1">
                              {stockStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => handleStockIn(item.id)}
                              title="Stock In"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </Button>
                            
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => handleStockOut(item.id)}
                              disabled={item.current_stock <= 0}
                              title="Stock Out"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </Button>
                            
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleStockAdjustment(item.id)}
                              title="Adjust Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center">
                  <Select
                    value={pagination.limit}
                    onChange={(value) => handleLimitChange(parseInt(value))}
                    options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                      value: size,
                      label: `${size} per page`
                    }))}
                    className="w-40"
                  />
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
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
                      );
                    })}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-slate-400">...</span>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            pagination.page === totalPages
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default StockList;
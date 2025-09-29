// src/components/items/StockValuation.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input, { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const StockValuation = ({ companyId }) => {
  const { error: showError } = useToast();
  const { loading, error, executeRequest } = useAPI();

  // State
  const [valuationData, setValuationData] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    averageValue: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    valuation_method: 'purchase_price',
    show_zero_stock: false
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchValuationData();
  }, [filters]);

  const fetchValuationData = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        ...filters,
        company_id: companyId
      });

      const response = await fetch(`/api/items/stock/valuation?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch valuation data');
      }

      return await response.json();
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setValuationData(result.data.items || []);
      setSummary(result.data.summary || {});
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        (result.data.items || [])
          .map(item => item.category)
          .filter(Boolean)
      )];
      setCategories(uniqueCategories);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        ...filters,
        company_id: companyId,
        export: 'true'
      });

      const response = await fetch(`/api/items/stock/valuation?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      return await response.blob();
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const url = window.URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `stock-valuation-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getValuationColor = (value) => {
    if (value > 100000) return 'text-green-600 font-semibold';
    if (value > 10000) return 'text-blue-600 font-medium';
    if (value > 1000) return 'text-slate-700';
    return 'text-slate-500';
  };

  // Prepare filter options
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({
      value: category,
      label: category
    }))
  ];

  const valuationMethodOptions = [
    { value: 'purchase_price', label: 'Purchase Price' },
    { value: 'selling_price', label: 'Selling Price' },
    { value: 'average_cost', label: 'Average Cost' },
    { value: 'fifo', label: 'FIFO Method' },
    { value: 'lifo', label: 'LIFO Method' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Stock Valuation</h2>
          <p className="text-slate-600">Analyze inventory value using different costing methods</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => fetchValuationData()}
            disabled={loading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading || valuationData.length === 0}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Items</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Quantity</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalQuantity?.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Avg. Value/Item</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.averageValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SearchInput
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <Select
            placeholder="Category"
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={categoryOptions}
          />
          
          <Select
            placeholder="Valuation Method"
            value={filters.valuation_method}
            onChange={(value) => handleFilterChange('valuation_method', value)}
            options={valuationMethodOptions}
          />
          
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.show_zero_stock}
                onChange={(e) => handleFilterChange('show_zero_stock', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Show Zero Stock</span>
            </label>
          </div>
        </div>
      </div>

      {/* Valuation Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading valuation data...</p>
          </div>
        ) : valuationData.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No valuation data found</h3>
            <p className="mt-1 text-sm text-slate-500">Items with inventory will appear here for valuation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stock Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Unit Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-slate-200">
                {valuationData.map((item) => {
                  const totalValue = item.current_stock * item.valuation_rate;
                  const percentageOfTotal = summary.totalValue > 0 ? (totalValue / summary.totalValue) * 100 : 0;
                  
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
                          {formatCurrency(item.valuation_rate)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-semibold ${getValuationColor(totalValue)}`}>
                          {formatCurrency(totalValue)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className="text-sm text-slate-900">
                            {percentageOfTotal.toFixed(1)}%
                          </div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(percentageOfTotal, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default StockValuation;
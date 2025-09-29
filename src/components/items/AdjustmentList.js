// src/components/items/AdjustmentList.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input, { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { PAGINATION } from '../../lib/constants';

const AdjustmentList = ({ companyId }) => {
  const { error: showError } = useToast();
  const { loading, error, executeRequest } = useAPI();

  // State
  const [adjustments, setAdjustments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    item_name: '',
    date_from: '',
    date_to: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'movement_date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchAdjustments();
  }, [filters, pagination]);

  const fetchAdjustments = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        ...filters,
        ...pagination,
        company_id: companyId,
        movement_type: 'adjustment'
      });

      const response = await fetch(`/api/items/stock/movements?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch adjustments');
      }

      return await response.json();
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setAdjustments(result.data.movements || []);
      setTotalItems(result.data.total || 0);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAdjustmentType = (stockBefore, stockAfter) => {
    const diff = stockAfter - stockBefore;
    if (diff > 0) return { type: 'Increase', color: 'text-green-600', icon: '+' };
    if (diff < 0) return { type: 'Decrease', color: 'text-red-600', icon: '-' };
    return { type: 'No Change', color: 'text-gray-600', icon: '=' };
  };

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Stock Adjustment History</h3>
            <p className="text-slate-600">View all stock adjustments and corrections</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchAdjustments()}
            disabled={loading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SearchInput
            placeholder="Search adjustments..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSearch={handleSearchChange}
          />
          
          <Input
            type="date"
            placeholder="From Date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
          
          <Input
            type="date"
            placeholder="To Date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
          
          <div className="text-sm text-slate-600 flex items-center">
            {totalItems} adjustments found
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading adjustments...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No adjustments found</h3>
            <p className="mt-1 text-sm text-slate-500">Stock adjustments will appear here once created.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSortChange('movement_date')}
                >
                  <div className="flex items-center">
                    Date
                    {pagination.sortBy === 'movement_date' && (
                      <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSortChange('item_code')}
                >
                  <div className="flex items-center">
                    Item
                    {pagination.sortBy === 'item_code' && (
                      <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Adjustment
                </th>
                
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Stock Before
                </th>
                
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Stock After
                </th>
                
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Reference
                </th>
                
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-slate-200">
              {adjustments.map((adjustment) => {
                const adjustmentType = getAdjustmentType(adjustment.stock_before, adjustment.stock_after);
                const quantityChange = adjustment.stock_after - adjustment.stock_before;
                
                return (
                  <tr key={adjustment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(adjustment.movement_date)}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {adjustment.item?.item_name || 'Unknown Item'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {adjustment.item_code}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${adjustmentType.color} bg-current bg-opacity-10`}>
                        {adjustmentType.icon}{Math.abs(quantityChange)}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                        {adjustmentType.type}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                      {adjustment.stock_before}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                      {adjustment.stock_after}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {adjustment.reference_number || '-'}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="max-w-xs truncate" title={adjustment.notes}>
                        {adjustment.notes || '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <Select
              value={pagination.limit}
              onChange={(value) => setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
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

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AdjustmentList;
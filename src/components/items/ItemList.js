// src/components/items/ItemList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  PAGINATION, 
  SUCCESS_MESSAGES,
  ERROR_MESSAGES 
} from '../../lib/constants';

const ItemList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  // State management
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    item_type: '',
    is_active: 'true',
    track_inventory: '',
    low_stock: false
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: 'item_name',
    sortOrder: 'asc'
  });

  // Categories (will be populated from items data)
  const [categories, setCategories] = useState([]);

  // Load items
  useEffect(() => {
    fetchItems();
  }, [filters, pagination]);

  const fetchItems = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        category: filters.category,
        item_type: filters.item_type,
        is_active: filters.is_active,
        track_inventory: filters.track_inventory,
        low_stock: filters.low_stock.toString(),
        page: pagination.page,
        limit: pagination.limit,
        sort_by: pagination.sortBy,
        sort_order: pagination.sortOrder
      });

      return await authenticatedFetch(`/api/items?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setItems(result.data.data || []);
      setTotalItems(result.data.pagination?.total_records || 0);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        (result.data.data || [])
          .map(item => item.category)
          .filter(Boolean)
      )];
      setCategories(uniqueCategories);
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Actions
  const handleEdit = (itemId) => {
    router.push(`/items/items/${itemId}`);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success(SUCCESS_MESSAGES.DELETED);
      fetchItems();
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) return;

    let confirmMessage = '';
    let apiEndpoint = '';
    let updateData = {};

    switch (action) {
      case 'activate':
        confirmMessage = `Activate ${selectedItems.length} selected items?`;
        apiEndpoint = '/api/items/bulk-update';
        updateData = { is_active: true };
        break;
      case 'deactivate':
        confirmMessage = `Deactivate ${selectedItems.length} selected items?`;
        apiEndpoint = '/api/items/bulk-update';
        updateData = { is_active: false };
        break;
      case 'delete':
        confirmMessage = `Delete ${selectedItems.length} selected items? This cannot be undone.`;
        apiEndpoint = '/api/items/bulk-delete';
        break;
      default:
        return;
    }

    if (!confirm(confirmMessage)) return;

    const apiCall = async () => {
      return await authenticatedFetch(apiEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          item_ids: selectedItems,
          ...updateData
        })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success(`${selectedItems.length} items ${action}d successfully`);
      fetchItems();
      setSelectedItems([]);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Utility functions
  const getStockStatus = (item) => {
    if (!item.track_inventory) return null;
    
    if (item.current_stock <= 0) return 'out-of-stock';
    if (item.current_stock <= item.reorder_level) return 'low-stock';
    return 'in-stock';
  };

  const getStockBadgeColor = (status) => {
    switch (status) {
      case 'out-of-stock': return 'bg-red-100 text-red-800';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800';
      case 'in-stock': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare filter options
  const itemTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'product', label: 'Product' },
    { value: 'service', label: 'Service' }
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({
      value: category,
      label: category
    }))
  ];

  const activeOptions = [
    { value: '', label: 'All Items' },
    { value: 'true', label: 'Active Only' },
    { value: 'false', label: 'Inactive Only' }
  ];

  const totalPages = Math.ceil(totalItems / pagination.limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Items</h1>
          <p className="text-slate-600">Manage your products and services</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => router.push('/items/items/new')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Item
        </Button>
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
            placeholder="Item Type"
            value={filters.item_type}
            onChange={(value) => handleFilterChange('item_type', value)}
            options={itemTypeOptions}
          />
          
          <Select
            placeholder="Category"
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={categoryOptions}
          />
          
          <Select
            placeholder="Status"
            value={filters.is_active}
            onChange={(value) => handleFilterChange('is_active', value)}
            options={activeOptions}
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.low_stock}
                onChange={(e) => handleFilterChange('low_stock', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">Show Low Stock Only</span>
            </label>
          </div>

          <div className="text-sm text-slate-600">
            {totalItems} items found
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} items selected
            </span>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="success"
                onClick={() => handleBulkAction('activate')}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleBulkAction('delete')}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No items found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by creating your first item.</p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => router.push('/items/items/new')}
              >
                Add Item
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-4 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === items.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('item_code')}
                    >
                      <div className="flex items-center">
                        Item Code
                        {pagination.sortBy === 'item_code' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('item_name')}
                    >
                      <div className="flex items-center">
                        Item Name
                        {pagination.sortBy === 'item_name' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSortChange('selling_price')}
                    >
                      <div className="flex items-center justify-end">
                        Price
                        {pagination.sortBy === 'selling_price' && (
                          <svg className={`ml-1 w-4 h-4 ${pagination.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Stock
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
                  {items.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="w-4 px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {item.item_code}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {item.item_name}
                          </div>
                          {item.description && (
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {item.description}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.item_type === 'product' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.item_type}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {item.category || '-'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-slate-900">
                            ₹{parseFloat(item.selling_price).toLocaleString()}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.track_inventory ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900">
                                {item.current_stock}
                              </div>
                              {stockStatus && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStockBadgeColor(stockStatus)}`}>
                                  {stockStatus.replace('-', ' ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
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

export default ItemList;
// src/components/items/ItemList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';
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

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' });
  const [bulkDialog, setBulkDialog] = useState({ isOpen: false, action: '', count: 0 });

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
    sortBy: 'item_code',
    sortOrder: 'desc'
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (companyId) {
      fetchItems();
    }
  }, [filters, pagination, companyId]);

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
      // Handle both response formats: {data: [...]} or {data: {data: [...]}}
      const itemsData = Array.isArray(result.data) 
        ? result.data 
        : (result.data?.data || []);
      
      const paginationData = result.data?.pagination || result.pagination || {};
      
      setItems(itemsData);
      setTotalItems(paginationData.total_records || 0);
      
      const uniqueCategories = [...new Set(
        itemsData.map(item => item.category).filter(Boolean)
      )];
      setCategories(uniqueCategories);
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

  const openDeleteDialog = (itemId, itemName) => {
    setDeleteDialog({ isOpen: true, itemId, itemName });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' });
  };

  const confirmDelete = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${deleteDialog.itemId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Item deleted successfully');
      fetchItems();
      setSelectedItems(prev => prev.filter(id => id !== deleteDialog.itemId));
      closeDeleteDialog();
    }
  };

  const openBulkDialog = (action) => {
    setBulkDialog({ isOpen: true, action, count: selectedItems.length });
  };

  const closeBulkDialog = () => {
    setBulkDialog({ isOpen: false, action: '', count: 0 });
  };

  const confirmBulkAction = async () => {
    if (selectedItems.length === 0) return;

    const action = bulkDialog.action;
    let apiEndpoint = '';
    let updateData = {};

    switch (action) {
      case 'activate':
        apiEndpoint = '/api/items/bulk-update';
        updateData = { is_active: true };
        break;
      case 'deactivate':
        apiEndpoint = '/api/items/bulk-update';
        updateData = { is_active: false };
        break;
      case 'delete':
        apiEndpoint = '/api/items/bulk-delete';
        break;
      default:
        return;
    }

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
      closeBulkDialog();
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

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

  const getBulkActionConfig = () => {
    const { action, count } = bulkDialog;
    
    switch (action) {
      case 'activate':
        return {
          title: 'Activate Items',
          message: `Are you sure you want to activate ${count} selected item${count > 1 ? 's' : ''}?`,
          confirmText: 'Activate',
          variant: 'success'
        };
      case 'deactivate':
        return {
          title: 'Deactivate Items',
          message: `Are you sure you want to deactivate ${count} selected item${count > 1 ? 's' : ''}?`,
          confirmText: 'Deactivate',
          variant: 'warning'
        };
      case 'delete':
        return {
          title: 'Delete Items',
          message: `Are you sure you want to delete ${count} selected item${count > 1 ? 's' : ''}?`,
          confirmText: 'Delete',
          variant: 'danger',
          destructive: true
        };
      default:
        return {};
    }
  };

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
  const bulkConfig = getBulkActionConfig();

  return (
    <div className="p-6">
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
                onClick={() => openBulkDialog('activate')}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={() => openBulkDialog('deactivate')}
              >
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => openBulkDialog('delete')}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

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
                      onClick={() => handleSortChange('selling_price_with_tax')}
                    >
                      <div className="flex items-center justify-end">
                        Price (Incl. GST)
                        {pagination.sortBy === 'selling_price_with_tax' && (
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
                            ₹{parseFloat(item.selling_price_with_tax || item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {item.selling_price_with_tax && item.selling_price_with_tax !== item.selling_price && (
                            <div className="text-xs text-slate-500">
                              Excl. GST: ₹{parseFloat(item.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
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
                              onClick={() => router.push(`/items/items/${item.id}`)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View Item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/items/items/${item.id}/edit`)}
                              className="text-slate-600 hover:text-slate-700"
                              title="Edit Item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(item.id, item.item_name)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

            {items.length > 0 && (
              <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Select
                    value={pagination.limit}
                    onChange={(value) => handleLimitChange(parseInt(value))}
                    options={PAGINATION.PAGE_SIZE_OPTIONS.map(size => ({
                      value: size,
                      label: `${size} per page`
                    }))}
                    className="w-40"
                  />
                  <span className="text-sm text-slate-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, totalItems)} of {totalItems} items
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
                )}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        destructive={true}
        isLoading={loading}
      />

      <ConfirmDialog
        isOpen={bulkDialog.isOpen}
        onClose={closeBulkDialog}
        onConfirm={confirmBulkAction}
        title={bulkConfig.title}
        message={bulkConfig.message}
        confirmText={bulkConfig.confirmText}
        cancelText="Cancel"
        variant={bulkConfig.variant}
        destructive={bulkConfig.destructive}
        isLoading={loading}
      />
    </div>
  );
};

export default ItemList;
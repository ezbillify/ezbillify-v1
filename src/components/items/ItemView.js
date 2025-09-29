// src/components/items/ItemView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  CURRENCIES,
  TAX_PREFERENCES,
  SUCCESS_MESSAGES 
} from '../../lib/constants';

const ItemView = ({ itemId, companyId, onEdit, onDelete }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [stockMovements, setStockMovements] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  useEffect(() => {
    if (itemId) {
      fetchItem();
      if (activeTab !== 'details') {
        fetchTabData();
      }
    }
  }, [itemId, activeTab]);

  const fetchItem = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}?company_id=${companyId}`);
    };
    const result = await executeRequest(apiCall);
    if (result.success) {
      setItem(result.data.data);
    }
  };

  const fetchTabData = async () => {
    if (!itemId) return;
    const apiCall = async () => {
      let endpoint = '';
      switch (activeTab) {
        case 'stock': endpoint = `/api/items/${itemId}/stock-movements`; break;
        case 'sales': endpoint = `/api/items/${itemId}/sales-history`; break;
        case 'purchases': endpoint = `/api/items/${itemId}/purchase-history`; break;
        default: return null;
      }
      return await authenticatedFetch(`${endpoint}?company_id=${companyId}`);
    };
    const result = await executeRequest(apiCall);
    if (result.success) {
      switch (activeTab) {
        case 'stock': setStockMovements(result.data || []); break;
        case 'sales': setSalesHistory(result.data || []); break;
        case 'purchases': setPurchaseHistory(result.data || []); break;
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) { onEdit(itemId); } else { router.push(`/items/items/${itemId}/edit`); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };
    const result = await executeRequest(apiCall);
    if (result.success) {
      success(SUCCESS_MESSAGES.DELETED);
      if (onDelete) { onDelete(itemId); } else { router.push('/items'); }
    }
  };

  const toggleStatus = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ company_id: companyId, is_active: !item.is_active })
      });
    };
    const result = await executeRequest(apiCall);
    if (result.success) {
      success(`Item ${item.is_active ? 'deactivated' : 'activated'} successfully`);
      setItem(prev => ({ ...prev, is_active: !prev.is_active }));
    }
  };

  const getStockStatus = () => {
    if (!item?.track_inventory) return null;
    if (item.current_stock <= 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (item.current_stock <= item.reorder_level) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'in': return 'text-green-600 bg-green-100';
      case 'out': return 'text-red-600 bg-red-100';
      case 'adjustment': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && !item) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="p-6"><div className="text-center">
        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <h3 className="mt-2 text-lg font-medium text-slate-900">Error Loading Item</h3>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <div className="mt-6"><Button onClick={() => router.push('/items')} variant="primary">Back to Items</Button></div>
      </div></div>
    );
  }

  if (!item) {
    return (
      <div className="p-6"><div className="text-center">
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" /></svg>
        <h3 className="mt-2 text-lg font-medium text-slate-900">Item Not Found</h3>
        <p className="mt-1 text-sm text-slate-500">The item you're looking for doesn't exist.</p>
        <div className="mt-6"><Button onClick={() => router.push('/items')} variant="primary">Back to Items</Button></div>
      </div></div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{item.item_name}</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-slate-600">Code: {item.item_code}</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.is_active ? 'Active' : 'Inactive'}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.item_type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{item.item_type}</span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleEdit}>Edit Item</Button>
          <Button variant={item.is_active ? 'warning' : 'success'} onClick={toggleStatus} loading={loading}>{item.is_active ? 'Deactivate' : 'Activate'}</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {[{ id: 'details', label: 'Details' }, { id: 'stock', label: 'Stock Movements' }, { id: 'sales', label: 'Sales History' }, { id: 'purchases', label: 'Purchase History' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>{tab.label}</button>
          ))}
        </nav>
      </div>
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-slate-600">Display Name</label><p className="text-slate-900">{item.display_name || item.item_name}</p></div>
              {item.description && <div><label className="text-sm font-medium text-slate-600">Description</label><p className="text-slate-900">{item.description}</p></div>}
              {item.category && <div><label className="text-sm font-medium text-slate-600">Category</label><p className="text-slate-900">{item.category}</p></div>}
              {item.brand && <div><label className="text-sm font-medium text-slate-600">Brand</label><p className="text-slate-900">{item.brand}</p></div>}
              {item.barcode && <div><label className="text-sm font-medium text-slate-600">Barcode</label><p className="text-slate-900 font-mono">{item.barcode}</p></div>}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pricing</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-slate-600">Selling Price</label><p className="text-lg font-semibold text-slate-900">{formatCurrency(item.selling_price)}</p></div>
              {item.purchase_price > 0 && <div><label className="text-sm font-medium text-slate-600">Purchase Price</label><p className="text-slate-900">{formatCurrency(item.purchase_price)}</p></div>}
              {item.mrp > 0 && <div><label className="text-sm font-medium text-slate-600">MRP</label><p className="text-slate-900">{formatCurrency(item.mrp)}</p></div>}
              {item.selling_price > 0 && item.purchase_price > 0 && <div><label className="text-sm font-medium text-slate-600">Margin</label><p className="text-slate-900">{formatCurrency(item.selling_price - item.purchase_price)}<span className="text-sm text-slate-500 ml-2">({(((item.selling_price - item.purchase_price) / item.selling_price) * 100).toFixed(1)}%)</span></p></div>}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Stock Information</h3>
            {item.track_inventory ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium text-slate-600">Current Stock</label><div className="flex items-center justify-between"><p className="text-lg font-semibold text-slate-900">{item.current_stock}</p>{stockStatus && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>{stockStatus.status}</span>}</div></div>
                {item.available_stock !== item.current_stock && <div><label className="text-sm font-medium text-slate-600">Available Stock</label><p className="text-slate-900">{item.available_stock}</p></div>}
                {item.reserved_stock > 0 && <div><label className="text-sm font-medium text-slate-600">Reserved Stock</label><p className="text-slate-900">{item.reserved_stock}</p></div>}
                <div><label className="text-sm font-medium text-slate-600">Reorder Level</label><p className="text-slate-900">{item.reorder_level}</p></div>
                {item.max_stock_level && <div><label className="text-sm font-medium text-slate-600">Max Stock Level</label><p className="text-slate-900">{item.max_stock_level}</p></div>}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Inventory tracking is disabled for this item</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemView;
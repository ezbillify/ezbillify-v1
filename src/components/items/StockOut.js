// src/components/items/StockOut.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input, { CurrencyInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  MOVEMENT_TYPES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES 
} from '../../lib/constants';

const StockOut = ({ companyId, onComplete, selectedItem = null }) => {
  const { success, error: showError, warning } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  // Form state
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    rate: '',
    reference_type: 'sales',
    reference_number: '',
    location: '',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0]
  });

  // Master data
  const [items, setItems] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Load items when component mounts and when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchItems();
    }
  }, [companyId]);

  // Set selected item when it changes
  useEffect(() => {
    if (selectedItem && items.length > 0) {
      setFormData(prev => ({ 
        ...prev, 
        item_id: selectedItem.id,
        rate: selectedItem.selling_price || ''
      }));
    }
  }, [selectedItem, items]);

  const fetchItems = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items?company_id=${companyId}&track_inventory=true&is_active=true&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const itemsData = Array.isArray(result.data) 
        ? result.data 
        : (result.data?.data || []);
      setItems(itemsData);
    }
  };

  // Form handlers
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-populate rate from item's selling price
    if (field === 'item_id' && value) {
      const item = items.find(i => i.id === value);
      if (item) {
        setFormData(prev => ({ 
          ...prev, 
          item_id: value,
          rate: item.selling_price || '' 
        }));
      }
    }

    // Check stock availability when quantity changes
    if (field === 'quantity' && formData.item_id) {
      const selectedItemData = items.find(item => item.id === formData.item_id);
      if (selectedItemData) {
        const requestedQty = parseFloat(value) || 0;
        if (requestedQty > selectedItemData.current_stock) {
          warning(`Requested quantity (${requestedQty}) exceeds available stock (${selectedItemData.current_stock})`);
        }
      }
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    const selectedItemData = items.find(item => item.id === formData.item_id);

    if (!formData.item_id) {
      errors.item_id = 'Item selection is required';
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    } else if (selectedItemData) {
      const requestedQty = parseFloat(formData.quantity);
      if (requestedQty > selectedItemData.current_stock) {
        errors.quantity = `Cannot issue more than available stock (${selectedItemData.current_stock})`;
      }
    }
    
    if (!formData.rate || parseFloat(formData.rate) < 0) {
      errors.rate = 'Rate must be 0 or greater';
    }
    
    if (!formData.movement_date) {
      errors.movement_date = 'Date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError(ERROR_MESSAGES.VALIDATION_ERROR);
      return;
    }

    const selectedItemData = items.find(item => item.id === formData.item_id);
    const requestedQty = parseFloat(formData.quantity);

    // Final stock check
    if (requestedQty > selectedItemData.current_stock) {
      showError(`Insufficient stock. Available: ${selectedItemData.current_stock}, Requested: ${requestedQty}`);
      return;
    }

    // Show confirmation for critical stock levels
    if (selectedItemData.current_stock - requestedQty <= selectedItemData.reorder_level) {
      const confirmed = confirm(
        `This will bring stock below reorder level (${selectedItemData.reorder_level}). Continue?`
      );
      if (!confirmed) return;
    }

    const apiCall = async () => {
      return await authenticatedFetch('/api/items/stock/movement', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          movement_type: 'out',
          quantity: parseFloat(formData.quantity),
          rate: parseFloat(formData.rate),
          value: parseFloat(formData.quantity) * parseFloat(formData.rate)
        })
      });
    };

    const result = await executeRequest(apiCall);
    
    if (result.success) {
      success('Stock issued successfully');
      
      // Reset form
      setFormData({
        item_id: '',
        quantity: '',
        rate: '',
        reference_type: 'sales',
        reference_number: '',
        location: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0]
      });

      // Update local items data
      setItems(prev => prev.map(item => 
        item.id === formData.item_id 
          ? { ...item, current_stock: item.current_stock - parseFloat(formData.quantity) }
          : item
      ));

      if (onComplete) {
        onComplete(result.data);
      }
    }
  };

  // Clear form
  const handleClear = () => {
    setFormData({
      item_id: '',
      quantity: '',
      rate: '',
      reference_type: 'sales',
      reference_number: '',
      location: '',
      notes: '',
      movement_date: new Date().toISOString().split('T')[0]
    });
    setValidationErrors({});
  };

  // Prepare options for dropdowns
  const itemOptions = items
    .filter(item => item.current_stock > 0) // Only show items with stock
    .map(item => ({
      value: item.id,
      label: `${item.item_name} (${item.item_code})`,
      description: `Available: ${item.current_stock} ${item.primary_unit?.unit_symbol || ''} | Rate: ₹${item.selling_price}`
    }));

  const referenceTypeOptions = [
    { value: 'sales', label: 'Sales' },
    { value: 'production', label: 'Production Use' },
    { value: 'damage', label: 'Damage/Wastage' },
    { value: 'return', label: 'Purchase Return' },
    { value: 'transfer_out', label: 'Transfer Out' },
    { value: 'consumption', label: 'Internal Consumption' },
    { value: 'adjustment', label: 'Stock Adjustment' },
    { value: 'other', label: 'Other' }
  ];

  const selectedItemData = items.find(item => item.id === formData.item_id);
  const totalValue = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0);
  const requestedQty = parseFloat(formData.quantity) || 0;
  const stockAfter = selectedItemData ? selectedItemData.current_stock - requestedQty : 0;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          Stock Out
        </h2>
        <p className="text-slate-600 mt-2">Issue inventory from your stock</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Selection */}
        <div className="bg-slate-50 rounded-lg p-4">
          <Select
            label="Select Item"
            value={formData.item_id}
            onChange={(value) => handleChange('item_id', value)}
            options={itemOptions}
            error={validationErrors.item_id}
            required
            searchable
            placeholder="Search and select item..."
          />
          
          {itemOptions.length === 0 && !loading && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">No items with available stock found.</p>
            </div>
          )}
          
          {selectedItemData && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Available Stock:</span>
                  <span className={`ml-2 font-bold ${
                    selectedItemData.current_stock <= selectedItemData.reorder_level 
                      ? 'text-red-600' 
                      : 'text-slate-900'
                  }`}>
                    {selectedItemData.current_stock} {selectedItemData.primary_unit?.unit_symbol}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Unit:</span>
                  <span className="ml-2 text-slate-900">{selectedItemData.primary_unit?.unit_symbol || 'N/A'}</span>
                </div>
                {selectedItemData.selling_price > 0 && (
                  <div>
                    <span className="font-medium text-slate-600">Selling Price:</span>
                    <span className="ml-2 text-slate-900">₹{selectedItemData.selling_price}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-slate-600">Reorder Level:</span>
                  <span className="ml-2 text-slate-900">{selectedItemData.reorder_level}</span>
                </div>
              </div>
              
              {selectedItemData.current_stock <= selectedItemData.reorder_level && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-700 text-xs font-medium">⚠️ Stock is at or below reorder level</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity and Rate */}
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Quantity to Issue"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            error={validationErrors.quantity}
            required
            min="0"
            step="0.01"
            max={selectedItemData?.current_stock}
            placeholder="Enter quantity"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            }
          />

          <CurrencyInput
            label="Rate per Unit"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            error={validationErrors.rate}
            required
            placeholder="0.00"
          />
        </div>

        {/* Total Value and Stock Impact */}
        {formData.quantity && formData.rate && selectedItemData && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">Total Value:</span>
                <span className="text-green-900 text-lg font-bold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className={`border rounded-lg p-4 ${stockAfter <= selectedItemData.reorder_level ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex justify-between items-center">
                <span className={`font-medium ${stockAfter <= selectedItemData.reorder_level ? 'text-red-800' : 'text-blue-800'}`}>
                  Stock After:
                </span>
                <span className={`text-lg font-bold ${stockAfter <= selectedItemData.reorder_level ? 'text-red-900' : 'text-blue-900'}`}>
                  {stockAfter.toFixed(2)}
                </span>
              </div>
              {stockAfter <= selectedItemData.reorder_level && (
                <p className="text-xs text-red-600 mt-1">Below reorder level!</p>
              )}
            </div>
          </div>
        )}

        {/* Reference Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <Select
            label="Reference Type"
            value={formData.reference_type}
            onChange={(value) => handleChange('reference_type', value)}
            options={referenceTypeOptions}
            required
          />

          <Input
            label="Reference Number"
            value={formData.reference_number}
            onChange={(e) => handleChange('reference_number', e.target.value)}
            placeholder="Sales Order/Invoice number (optional)"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>

        {/* Date and Location */}
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Movement Date"
            type="date"
            value={formData.movement_date}
            onChange={(e) => handleChange('movement_date', e.target.value)}
            error={validationErrors.movement_date}
            required
            max={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Warehouse, Store, etc. (optional)"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 resize-none"
            placeholder="Additional notes about this stock movement (optional)"
          />
        </div>

        {/* Stock Impact Preview */}
        {selectedItemData && formData.quantity && (
          <div className={`border rounded-lg p-4 ${stockAfter <= selectedItemData.reorder_level ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <h4 className={`font-medium mb-2 ${stockAfter <= selectedItemData.reorder_level ? 'text-red-900' : 'text-blue-900'}`}>
              Stock Impact Preview
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className={stockAfter <= selectedItemData.reorder_level ? 'text-red-700' : 'text-blue-700'}>Current Stock:</span>
                <div className={`font-medium ${stockAfter <= selectedItemData.reorder_level ? 'text-red-900' : 'text-blue-900'}`}>
                  {selectedItemData.current_stock}
                </div>
              </div>
              <div>
                <span className={stockAfter <= selectedItemData.reorder_level ? 'text-red-700' : 'text-blue-700'}>Issuing:</span>
                <div className="font-medium text-red-600">-{parseFloat(formData.quantity) || 0}</div>
              </div>
              <div>
                <span className={stockAfter <= selectedItemData.reorder_level ? 'text-red-700' : 'text-blue-700'}>New Stock:</span>
                <div className={`font-medium ${stockAfter <= selectedItemData.reorder_level ? 'text-red-900' : 'text-blue-900'}`}>
                  {stockAfter.toFixed(2)}
                </div>
              </div>
            </div>
            {stockAfter <= selectedItemData.reorder_level && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Warning: This will bring stock below reorder level ({selectedItemData.reorder_level})
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-slate-200">
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            disabled={loading || !formData.item_id || !formData.quantity || !selectedItemData || requestedQty > selectedItemData?.current_stock}
          >
            Issue Stock
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={loading}
          >
            Clear Form
          </Button>
        </div>

        {/* API Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default StockOut;
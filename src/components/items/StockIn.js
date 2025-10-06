// src/components/items/StockIn.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input, { CurrencyInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  SUCCESS_MESSAGES,
  ERROR_MESSAGES 
} from '../../lib/constants';

const StockIn = ({ companyId, onComplete, selectedItem = null }) => {
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    rate: '',
    reference_type: 'purchase',
    reference_number: '',
    location: '',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0]
  });

  const [items, setItems] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (companyId) {
      fetchItems();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedItem && items.length > 0) {
      setFormData(prev => ({ 
        ...prev, 
        item_id: selectedItem.id,
        rate: selectedItem.purchase_price || ''
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    if (field === 'item_id' && value) {
      const item = items.find(i => i.id === value);
      if (item) {
        setFormData(prev => ({ 
          ...prev, 
          item_id: value,
          rate: item.purchase_price || '' 
        }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.item_id) errors.item_id = 'Item selection is required';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (!formData.rate || parseFloat(formData.rate) < 0) errors.rate = 'Rate must be 0 or greater';
    if (!formData.movement_date) errors.movement_date = 'Date is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError(ERROR_MESSAGES.VALIDATION_ERROR);
      return;
    }

    const apiCall = async () => {
      return await authenticatedFetch('/api/items/stock/movement', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          movement_type: 'in',
          quantity: parseFloat(formData.quantity),
          rate: parseFloat(formData.rate),
          value: parseFloat(formData.quantity) * parseFloat(formData.rate)
        })
      });
    };

    const result = await executeRequest(apiCall);
    
    if (result.success) {
      success('Stock added successfully');
      setFormData({
        item_id: '',
        quantity: '',
        rate: '',
        reference_type: 'purchase',
        reference_number: '',
        location: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0]
      });
      if (onComplete) onComplete(result.data);
    }
  };

  const handleClear = () => {
    setFormData({
      item_id: '',
      quantity: '',
      rate: '',
      reference_type: 'purchase',
      reference_number: '',
      location: '',
      notes: '',
      movement_date: new Date().toISOString().split('T')[0]
    });
    setValidationErrors({});
  };

  const itemOptions = items.map(item => ({
    value: item.id,
    label: `${item.item_name} (${item.item_code})`,
    description: `Current Stock: ${item.current_stock} | Unit: ${item.primary_unit?.unit_symbol || 'N/A'}`
  }));

  const referenceTypeOptions = [
    { value: 'purchase', label: 'Purchase' },
    { value: 'production', label: 'Production' },
    { value: 'return', label: 'Sales Return' },
    { value: 'transfer_in', label: 'Transfer In' },
    { value: 'opening', label: 'Opening Stock' },
    { value: 'adjustment', label: 'Stock Adjustment' },
    { value: 'other', label: 'Other' }
  ];

  const selectedItemData = items.find(item => item.id === formData.item_id);
  const totalValue = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Stock In
        </h2>
        <p className="text-slate-600 mt-2">Add inventory to your stock</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
          
          {selectedItemData && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Current Stock:</span>
                  <span className="ml-2 text-slate-900">{selectedItemData.current_stock} {selectedItemData.primary_unit?.unit_symbol}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Unit:</span>
                  <span className="ml-2 text-slate-900">{selectedItemData.primary_unit?.unit_symbol || 'N/A'}</span>
                </div>
                {selectedItemData.purchase_price > 0 && (
                  <div>
                    <span className="font-medium text-slate-600">Purchase Price:</span>
                    <span className="ml-2 text-slate-900">₹{selectedItemData.purchase_price}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            error={validationErrors.quantity}
            required
            min="0"
            step="0.01"
            placeholder="Enter quantity"
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

        {formData.quantity && formData.rate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-green-800 font-medium">Total Value:</span>
              <span className="text-green-900 text-lg font-bold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

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
            placeholder="PO/Bill/Invoice number (optional)"
          />
        </div>

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
          />
        </div>

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

        {selectedItemData && formData.quantity && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Stock Impact Preview</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Current Stock:</span>
                <div className="font-medium text-blue-900">{selectedItemData.current_stock}</div>
              </div>
              <div>
                <span className="text-blue-700">Adding:</span>
                <div className="font-medium text-green-600">+{parseFloat(formData.quantity) || 0}</div>
              </div>
              <div>
                <span className="text-blue-700">New Stock:</span>
                <div className="font-medium text-blue-900">{(parseFloat(selectedItemData.current_stock) + parseFloat(formData.quantity || 0)).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-slate-200">
          <Button
            type="submit"
            variant="success"
            loading={loading}
            disabled={loading || !formData.item_id || !formData.quantity}
          >
            Add Stock
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

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default StockIn;
// src/components/items/AdjustmentForm.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../lib/constants';

const AdjustmentForm = ({ companyId, onComplete }) => {
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [formData, setFormData] = useState({
    item_id: '',
    adjustment_type: 'set',
    quantity: '',
    reason: '',
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

  const fetchItems = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items?company_id=${companyId}&track_inventory=true&is_active=true&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      // Handle both response formats
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
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.item_id) errors.item_id = 'Item selection is required';
    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      errors.quantity = 'Quantity must be 0 or greater';
    }
    if (!formData.reason.trim()) errors.reason = 'Reason is required for adjustments';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError(ERROR_MESSAGES.VALIDATION_ERROR);
      return;
    }

    const selectedItem = items.find(item => item.id === formData.item_id);
    const currentStock = selectedItem.current_stock;
    const adjustmentQty = parseFloat(formData.quantity);
    
    let finalQuantity;
    switch (formData.adjustment_type) {
      case 'set':
        finalQuantity = adjustmentQty;
        break;
      case 'increase':
        finalQuantity = currentStock + adjustmentQty;
        break;
      case 'decrease':
        finalQuantity = Math.max(0, currentStock - adjustmentQty);
        break;
    }

    const apiCall = async () => {
      return await authenticatedFetch('/api/items/stock/movement', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          item_id: formData.item_id,
          movement_type: 'adjustment',
          quantity: finalQuantity,
          reference_type: 'adjustment',
          reference_number: `ADJ-${Date.now()}`,
          notes: `${formData.reason} - ${formData.notes}`,
          movement_date: formData.movement_date
        })
      });
    };

    const result = await executeRequest(apiCall);
    
    if (result.success) {
      success('Stock adjusted successfully');
      setFormData({
        item_id: '',
        adjustment_type: 'set',
        quantity: '',
        reason: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0]
      });
      if (onComplete) onComplete(result.data);
    }
  };

  const itemOptions = items.map(item => ({
    value: item.id,
    label: `${item.item_name} (${item.item_code})`,
    description: `Current Stock: ${item.current_stock} ${item.primary_unit?.unit_symbol || ''}`
  }));

  const adjustmentTypeOptions = [
    { value: 'set', label: 'Set to Quantity' },
    { value: 'increase', label: 'Increase by' },
    { value: 'decrease', label: 'Decrease by' }
  ];

  const reasonOptions = [
    { value: 'Physical Count', label: 'Physical Count Adjustment' },
    { value: 'Damage', label: 'Damaged Stock' },
    { value: 'Expired', label: 'Expired Stock' },
    { value: 'Lost', label: 'Lost/Missing Stock' },
    { value: 'Found', label: 'Found Stock' },
    { value: 'Other', label: 'Other Reason' }
  ];

  const selectedItem = items.find(item => item.id === formData.item_id);
  const adjustmentQty = parseFloat(formData.quantity) || 0;
  
  let finalStock = 0;
  let stockChange = 0;
  if (selectedItem) {
    switch (formData.adjustment_type) {
      case 'set':
        finalStock = adjustmentQty;
        stockChange = adjustmentQty - selectedItem.current_stock;
        break;
      case 'increase':
        finalStock = selectedItem.current_stock + adjustmentQty;
        stockChange = adjustmentQty;
        break;
      case 'decrease':
        finalStock = Math.max(0, selectedItem.current_stock - adjustmentQty);
        stockChange = -(Math.min(adjustmentQty, selectedItem.current_stock));
        break;
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Stock Adjustment</h3>
        <p className="text-slate-600">Adjust inventory levels for physical count corrections</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
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

          <Select
            label="Adjustment Type"
            value={formData.adjustment_type}
            onChange={(value) => handleChange('adjustment_type', value)}
            options={adjustmentTypeOptions}
            required
          />
        </div>

        {selectedItem && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-600">Current Stock:</span>
                <span className="ml-2 text-slate-900">{selectedItem.current_stock} {selectedItem.primary_unit?.unit_symbol}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Unit:</span>
                <span className="ml-2 text-slate-900">{selectedItem.primary_unit?.unit_name || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label={`Quantity ${formData.adjustment_type === 'set' ? 'to Set' : `to ${formData.adjustment_type}`}`}
            type="number"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            error={validationErrors.quantity}
            required
            min="0"
            step="0.01"
            placeholder="Enter quantity"
          />

          <Select
            label="Reason"
            value={formData.reason}
            onChange={(value) => handleChange('reason', value)}
            options={reasonOptions}
            error={validationErrors.reason}
            required
          />
        </div>

        {formData.quantity && selectedItem && (
          <div className={`border rounded-lg p-4 ${stockChange < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <h4 className={`font-medium mb-2 ${stockChange < 0 ? 'text-red-900' : 'text-green-900'}`}>
              Adjustment Preview
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className={stockChange < 0 ? 'text-red-700' : 'text-green-700'}>Current:</span>
                <div className={`font-medium ${stockChange < 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {selectedItem.current_stock}
                </div>
              </div>
              <div>
                <span className={stockChange < 0 ? 'text-red-700' : 'text-green-700'}>Change:</span>
                <div className={`font-medium ${stockChange > 0 ? 'text-green-600' : stockChange < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {stockChange > 0 ? '+' : ''}{stockChange}
                </div>
              </div>
              <div>
                <span className={stockChange < 0 ? 'text-red-700' : 'text-green-700'}>New Stock:</span>
                <div className={`font-medium ${stockChange < 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {finalStock.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Movement Date"
            type="date"
            value={formData.movement_date}
            onChange={(e) => handleChange('movement_date', e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 resize-none"
              placeholder="Additional notes (optional)"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6 border-t border-slate-200">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || !formData.item_id || !formData.quantity || !formData.reason}
          >
            Adjust Stock
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFormData({
              item_id: '',
              adjustment_type: 'set',
              quantity: '',
              reason: '',
              notes: '',
              movement_date: new Date().toISOString().split('T')[0]
            })}
            disabled={loading}
          >
            Clear
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

export default AdjustmentForm;
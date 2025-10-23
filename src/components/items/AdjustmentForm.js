// src/components/items/AdjustmentForm.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
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
      return await authenticatedFetch('/api/items/stock/adjustment', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          item_id: formData.item_id,
          adjustment_type: formData.adjustment_type,
          quantity: adjustmentQty,
          reason: formData.reason,
          notes: formData.notes,
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

  const handleClear = () => {
    setFormData({
      item_id: '',
      adjustment_type: 'set',
      quantity: '',
      reason: '',
      notes: '',
      movement_date: new Date().toISOString().split('T')[0]
    });
    setValidationErrors({});
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Stock Adjustment
        </h2>
        <p className="text-slate-600 mt-1">Adjust inventory levels for physical count corrections</p>
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
                <span className="ml-2 text-slate-900 font-bold">{selectedItem.current_stock} {selectedItem.primary_unit?.unit_symbol}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Unit:</span>
                <span className="ml-2 text-slate-900">{selectedItem.primary_unit?.unit_symbol || 'N/A'}</span>
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
            <h4 className={`font-medium mb-3 ${stockChange < 0 ? 'text-red-900' : 'text-green-900'}`}>
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
                  {stockChange > 0 ? '+' : ''}{stockChange.toFixed(2)}
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
          <DatePicker
            label="Movement Date"
            value={formData.movement_date}
            onChange={(value) => handleChange('movement_date', value)}
            required
            maxDate={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
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
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default AdjustmentForm;
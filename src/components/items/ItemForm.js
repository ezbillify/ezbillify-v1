// src/components/items/ItemForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { CurrencyInput } from '../shared/ui/Input';
import Select, { TaxRateSelect } from '../shared/ui/Select';
import Card from '../shared/ui/Card';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../hooks/useAuth';
import masterDataService from '../../services/masterDataService';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../lib/constants';

const ItemForm = ({ itemId = null, companyId, onSave, onCancel }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();
  
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    print_name: '',
    description: '',
    item_type: 'product',
    category: '',
    brand: '',
    selling_price: 0,
    selling_price_with_tax: 0,
    purchase_price: 0,
    mrp: 0,
    primary_unit_id: '',
    secondary_unit_id: '',
    conversion_factor: 1,
    hsn_sac_code: '',
    tax_rate_id: '',
    tax_preference: 'taxable',
    track_inventory: false,
    current_stock: 0,
    reorder_level: 0,
    max_stock_level: '',
    barcode: '',
    specifications: {},
    is_active: true,
    is_for_sale: true,
    is_for_purchase: true
  });

  const [taxRates, setTaxRates] = useState([]);
  const [units, setUnits] = useState([]);
  const [printNameTouched, setPrintNameTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [pricingInfo, setPricingInfo] = useState({
    profitMargin: 0,
    profitAmount: 0,
    finalPriceWithTax: 0,
    taxRate: 0,
    taxAmount: 0
  });

  // Load item data if editing
  useEffect(() => {
    if (itemId && companyId) {
      loadItemData();
    } else if (!itemId) {
      generateItemCode();
    }
  }, [itemId, companyId]);

  // Load master data
  useEffect(() => {
    if (companyId) {
      loadMasterData();
    }
  }, [companyId]);

  // Auto-sync print_name with item_name
  useEffect(() => {
    if (!printNameTouched && formData.item_name) {
      setFormData(prev => ({ ...prev, print_name: formData.item_name }));
    }
  }, [formData.item_name, printNameTouched]);

  // Calculate pricing
  useEffect(() => {
    calculatePricingInfo();
  }, [formData.selling_price, formData.selling_price_with_tax, formData.purchase_price, formData.tax_rate_id, taxRates]);

  const loadItemData = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setFormData(result.data);
      setPrintNameTouched(true);
    }
  };

  const loadMasterData = async () => {
    try {
      const [taxRatesData, unitsData] = await Promise.all([
        masterDataService.getTaxRates(companyId),
        masterDataService.getUnits(companyId)
      ]);
      setTaxRates(taxRatesData || []);
      setUnits(unitsData || []);
    } catch (err) {
      console.error('Failed to load master data:', err);
      showError('Failed to load form data');
    }
  };

  const generateItemCode = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/items/next-code?company_id=${companyId}&item_type=${formData.item_type}`
      );
      if (response.success) {
        setFormData(prev => ({ ...prev, item_code: response.code }));
      }
    } catch (err) {
      const prefix = formData.item_type === 'service' ? 'SRV' : 'ITM';
      const timestamp = Date.now().toString().slice(-4);
      setFormData(prev => ({ ...prev, item_code: `${prefix}-${timestamp}` }));
    }
  };

  const calculatePricingInfo = () => {
    const sellingExclTax = parseFloat(formData.selling_price) || 0;
    const sellingInclTax = parseFloat(formData.selling_price_with_tax) || 0;
    const purchase = parseFloat(formData.purchase_price) || 0;
    
    let profitMargin = 0;
    let profitAmount = 0;
    if (purchase > 0 && sellingExclTax > 0) {
      profitAmount = sellingExclTax - purchase;
      profitMargin = (profitAmount / purchase) * 100;
    }

    const selectedTaxRate = taxRates.find(tax => tax.id === formData.tax_rate_id);
    const taxRate = selectedTaxRate ? selectedTaxRate.tax_rate : 0;
    
    let finalPriceWithTax = sellingInclTax;
    let taxAmount = 0;
    if (!sellingInclTax && sellingExclTax) {
      finalPriceWithTax = sellingExclTax * (1 + taxRate / 100);
      taxAmount = finalPriceWithTax - sellingExclTax;
    } else if (sellingInclTax) {
      taxAmount = sellingInclTax - sellingExclTax;
    }

    setPricingInfo({ profitMargin, profitAmount, finalPriceWithTax, taxRate, taxAmount });
  };

  const handlePriceChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const selectedTaxRate = taxRates.find(tax => tax.id === formData.tax_rate_id);
    const taxRate = selectedTaxRate ? selectedTaxRate.tax_rate : 0;

    if (field === 'selling_price') {
      const priceWithTax = parseFloat((numValue * (1 + taxRate / 100)).toFixed(2));
      setFormData(prev => ({ ...prev, selling_price: parseFloat(numValue.toFixed(2)), selling_price_with_tax: priceWithTax }));
    } else if (field === 'selling_price_with_tax') {
      const priceExclTax = parseFloat((numValue / (1 + taxRate / 100)).toFixed(2));
      setFormData(prev => ({ ...prev, selling_price: priceExclTax, selling_price_with_tax: parseFloat(numValue.toFixed(2)) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: parseFloat(numValue.toFixed(2)) }));
    }
  };

  const handleTaxRateChange = (taxRateId) => {
    const selectedTaxRate = taxRates.find(tax => tax.id === taxRateId);
    const taxRate = selectedTaxRate ? selectedTaxRate.tax_rate : 0;
    if (formData.selling_price) {
      const priceWithTax = parseFloat((formData.selling_price * (1 + taxRate / 100)).toFixed(2));
      setFormData(prev => ({ ...prev, tax_rate_id: taxRateId, selling_price_with_tax: priceWithTax }));
    } else {
      setFormData(prev => ({ ...prev, tax_rate_id: taxRateId }));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
    if (field === 'print_name') {
      setPrintNameTouched(true);
    }
    if (field === 'item_type' && !itemId) {
      setTimeout(() => generateItemCode(), 100);
    }
  };

  const calculateMarginPrice = (marginPercent = 30) => {
    const purchase = parseFloat(formData.purchase_price) || 0;
    if (purchase > 0) {
      const sellingPrice = purchase * (1 + marginPercent / 100);
      handlePriceChange('selling_price', sellingPrice);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.item_name.trim()) errors.item_name = 'Item name is required';
    if (!formData.print_name.trim()) errors.print_name = 'Print name is required';
    if (!formData.primary_unit_id) errors.primary_unit_id = 'Primary unit is required';
    if (!formData.selling_price_with_tax || formData.selling_price_with_tax <= 0) {
      errors.selling_price_with_tax = 'Selling price (with tax) is required';
    }
    if (formData.selling_price < 0) errors.selling_price = 'Selling price cannot be negative';
    if (formData.purchase_price < 0) errors.purchase_price = 'Purchase price cannot be negative';
    if (formData.mrp && formData.mrp < formData.selling_price_with_tax) {
      errors.mrp = 'MRP cannot be less than selling price with tax';
    }
    if (formData.hsn_sac_code) {
      const hsnPattern = formData.item_type === 'service' ? /^[0-9]{6}$/ : /^[0-9]{4,8}$/;
      if (!hsnPattern.test(formData.hsn_sac_code)) {
        errors.hsn_sac_code = `Invalid ${formData.item_type === 'service' ? 'SAC' : 'HSN'} code format`;
      }
    }
    if (formData.track_inventory) {
      if (formData.reorder_level < 0) errors.reorder_level = 'Reorder level cannot be negative';
      if (formData.max_stock_level && formData.max_stock_level <= formData.reorder_level) {
        errors.max_stock_level = 'Maximum stock level must be greater than reorder level';
      }
    }
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
      const endpoint = itemId ? `/api/items/${itemId}` : '/api/items';
      const method = itemId ? 'PUT' : 'POST';
      return await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify({ ...formData, company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success(itemId ? 'Item updated successfully' : 'Item created successfully');
      if (onSave) {
        onSave(result.data);
      } else {
        router.push('/items');
      }
    }
  };

  const itemTypeOptions = [
    { value: 'product', label: 'Product' },
    { value: 'service', label: 'Service' }
  ];

  const unitOptions = units.map(unit => ({
    value: unit.id,
    label: `${unit.unit_name} (${unit.unit_symbol})`,
    description: unit.unit_type
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{itemId ? 'Edit Item' : 'Add New Item'}</h1>
          <p className="text-slate-600 mt-2">{itemId ? 'Update item information and settings' : 'Create a new product or service with complete details'}</p>
        </div>
        <Button variant="outline" onClick={onCancel || (() => router.push('/items'))}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card title="Basic Information">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Input label="Item Code" value={formData.item_code} onChange={(e) => handleChange('item_code', e.target.value.toUpperCase())} required disabled={!!itemId} className="flex-2" helperText={itemId ? "Item code cannot be changed" : "Auto-generated"} />
                <Select label="Type" value={formData.item_type} onChange={(value) => handleChange('item_type', value)} options={itemTypeOptions} required className="flex-1" />
              </div>
              <Input label="Item Name" value={formData.item_name} onChange={(e) => handleChange('item_name', e.target.value)} error={validationErrors.item_name} required placeholder="Enter the internal item name" />
              <Input label="Print Name" value={formData.print_name} onChange={(e) => handleChange('print_name', e.target.value)} error={validationErrors.print_name} required placeholder="Name that appears on invoices" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Category" value={formData.category} onChange={(e) => handleChange('category', e.target.value)} placeholder="e.g. Electronics" />
                <Input label="Brand" value={formData.brand} onChange={(e) => handleChange('brand', e.target.value)} placeholder="e.g. Apple" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Description</label>
                <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Detailed description..." />
              </div>
              <Input label="Barcode" value={formData.barcode} onChange={(e) => handleChange('barcode', e.target.value)} placeholder="Product barcode (optional)" />
              <div className="grid grid-cols-2 gap-4">
                <Input label={formData.item_type === 'service' ? 'SAC Code' : 'HSN Code'} value={formData.hsn_sac_code} onChange={(e) => handleChange('hsn_sac_code', e.target.value)} error={validationErrors.hsn_sac_code} placeholder={formData.item_type === 'service' ? '123456' : '12345678'} />
                <TaxRateSelect label="Tax Rate" value={formData.tax_rate_id} onChange={handleTaxRateChange} taxRates={taxRates} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Pricing & Profitability">
          <div className="space-y-6">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <CurrencyInput label="Purchase Price" value={formData.purchase_price} onChange={(e) => handlePriceChange('purchase_price', e.target.value)} error={validationErrors.purchase_price} placeholder="0.00" step="0.01" />
                <p className="text-xs text-slate-500">Cost per unit</p>
              </div>
              <div className="space-y-2">
                <CurrencyInput label="Selling Price (Excl. Tax)" value={formData.selling_price} onChange={(e) => handlePriceChange('selling_price', e.target.value)} error={validationErrors.selling_price} placeholder="0.00" step="0.01" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => calculateMarginPrice(25)} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">+25%</button>
                  <button type="button" onClick={() => calculateMarginPrice(30)} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">+30%</button>
                  <button type="button" onClick={() => calculateMarginPrice(50)} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">+50%</button>
                </div>
              </div>
              <div className="space-y-2">
                <CurrencyInput label="Selling Price (With Tax) *" value={formData.selling_price_with_tax} onChange={(e) => handlePriceChange('selling_price_with_tax', e.target.value)} error={validationErrors.selling_price_with_tax} required placeholder="0.00" step="0.01" />
                <p className="text-xs text-slate-500">Price customer pays</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Tax Amount</label>
                <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl"><span className="text-lg font-bold text-blue-700">₹{pricingInfo.taxAmount.toFixed(2)}</span></div>
                <p className="text-xs text-slate-500">Tax @ {pricingInfo.taxRate}%</p>
              </div>
              <div className="space-y-2">
                <CurrencyInput label="MRP" value={formData.mrp} onChange={(e) => handlePriceChange('mrp', e.target.value)} error={validationErrors.mrp} placeholder="0.00" step="0.01" />
                <p className="text-xs text-slate-500">Maximum retail price</p>
              </div>
            </div>
            {pricingInfo.profitAmount > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Profit Analysis</h3>
                <div className="grid lg:grid-cols-4 gap-6">
                  <div className="text-center"><div className="text-3xl font-bold text-green-600">₹{pricingInfo.profitAmount.toFixed(2)}</div><div className="text-sm text-slate-600">Profit per Unit</div></div>
                  <div className="text-center"><div className="text-3xl font-bold text-blue-600">{pricingInfo.profitMargin.toFixed(1)}%</div><div className="text-sm text-slate-600">Profit Margin</div></div>
                  <div className="text-center"><div className="text-3xl font-bold text-purple-600">₹{(pricingInfo.finalPriceWithTax - formData.purchase_price).toFixed(2)}</div><div className="text-sm text-slate-600">Total Profit (After Tax)</div></div>
                  <div className="text-center"><div className="text-3xl font-bold text-orange-600">₹{pricingInfo.finalPriceWithTax.toFixed(2)}</div><div className="text-sm text-slate-600">Final Customer Price</div></div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Units & Measurements">
          <div className="grid lg:grid-cols-3 gap-6">
            <Select label="Primary Unit" value={formData.primary_unit_id} onChange={(value) => handleChange('primary_unit_id', value)} options={unitOptions} error={validationErrors.primary_unit_id} required searchable />
            <Select label="Secondary Unit" value={formData.secondary_unit_id} onChange={(value) => handleChange('secondary_unit_id', value)} options={unitOptions} searchable placeholder="Optional" />
            {formData.secondary_unit_id && <Input label="Conversion Factor" type="number" value={formData.conversion_factor} onChange={(e) => handleChange('conversion_factor', parseFloat(e.target.value) || 1)} min="0" step="0.001" helperText="1 secondary = ? primary" />}
          </div>
        </Card>

        <Card title="Inventory Management">
          <div className="space-y-6">
            <label className="flex items-center"><input type="checkbox" checked={formData.track_inventory} onChange={(e) => handleChange('track_inventory', e.target.checked)} className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500" /><span className="text-lg font-medium text-slate-700">Track Inventory for this item</span></label>
            {formData.track_inventory && (
              <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t">
                <Input label="Current Stock" type="number" value={formData.current_stock} onChange={(e) => handleChange('current_stock', parseFloat(e.target.value) || 0)} min="0" step="0.01" disabled={!!itemId} helperText={itemId ? 'Use stock adjustment to modify' : 'Opening stock'} />
                <Input label="Reorder Level" type="number" value={formData.reorder_level} onChange={(e) => handleChange('reorder_level', parseFloat(e.target.value) || 0)} error={validationErrors.reorder_level} min="0" step="0.01" />
                <Input label="Max Stock Level" type="number" value={formData.max_stock_level} onChange={(e) => handleChange('max_stock_level', parseFloat(e.target.value) || '')} error={validationErrors.max_stock_level} min="0" step="0.01" placeholder="Optional" />
              </div>
            )}
          </div>
        </Card>

        <Card title="Item Settings">
          <div className="grid lg:grid-cols-3 gap-6">
            <label className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} className="mr-3 h-5 w-5 text-blue-600 rounded" /><span className="text-base font-medium text-slate-700">Active</span></label>
            <label className="flex items-center"><input type="checkbox" checked={formData.is_for_sale} onChange={(e) => handleChange('is_for_sale', e.target.checked)} className="mr-3 h-5 w-5 text-blue-600 rounded" /><span className="text-base font-medium text-slate-700">Available for Sale</span></label>
            <label className="flex items-center"><input type="checkbox" checked={formData.is_for_purchase} onChange={(e) => handleChange('is_for_purchase', e.target.checked)} className="mr-3 h-5 w-5 text-blue-600 rounded" /><span className="text-base font-medium text-slate-700">Available for Purchase</span></label>
          </div>
        </Card>

        <Card>
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={onCancel || (() => router.push('/items'))} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading} className="px-8">{itemId ? 'Update Item' : 'Create Item'}</Button>
          </div>
        </Card>

        {error && <Card className="border-red-200 bg-red-50"><p className="text-red-600">{error}</p></Card>}
      </form>
    </div>
  );
};

export default ItemForm;
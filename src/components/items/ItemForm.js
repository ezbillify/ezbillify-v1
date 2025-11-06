// src/components/items/ItemForm.js - FINAL: Automatic pricing calculations
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { CurrencyInput } from '../shared/ui/Input';
import Select, { TaxRateSelect } from '../shared/ui/Select';
import Card from '../shared/ui/Card';
import MultipleBarcodeInput from '../shared/MultipleBarcodeInput';
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
    category_id: '',
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
    barcodes: [],
    aisle: '',
    bay: '',
    level: '',
    position: '',
    specifications: {},
    is_active: true,
    is_for_sale: true,
    is_for_purchase: true
  });

  const [taxRates, setTaxRates] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [printNameTouched, setPrintNameTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [pricingInfo, setPricingInfo] = useState({
    profitMargin: 0,
    profitAmount: 0,
    finalPriceWithTax: 0,
    taxRate: 0,
    taxAmount: 0
  });
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (itemId && companyId) {
      loadItemData();
    } else if (!itemId) {
      generateItemCode();
    }
  }, [itemId, companyId]);

  useEffect(() => {
    if (companyId) {
      loadMasterData();
      loadCategories();
    }
  }, [companyId]);

  useEffect(() => {
    if (!printNameTouched && formData.item_name) {
      setFormData(prev => ({ ...prev, print_name: formData.item_name }));
    }
  }, [formData.item_name, printNameTouched]);

  // Auto-calculate pricing when tax rate or price changes
  useEffect(() => {
    autoCalculatePrices();
  }, [formData.selling_price_with_tax, formData.tax_rate_id, formData.purchase_price, taxRates]);

  const loadItemData = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items/${itemId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const itemData = result.data.data || result.data;
      
      if (itemData.location) {
        const [aisle, bay, level, position] = itemData.location.split('-');
        setFormData({
          ...itemData,
          aisle: aisle || '',
          bay: bay || '',
          level: level || '',
          position: position || ''
        });
      } else {
        setFormData(itemData);
      }
      
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

  const loadCategories = async () => {
    try {
      const data = await masterDataService.getCategories(companyId);
      const options = data.map(cat => ({
        value: cat.id,
        label: cat.category_name,
        description: cat.category_code
      }));
      setCategories(options);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const generateItemCode = async () => {
    try {
      const timestamp = Date.now();
      const response = await authenticatedFetch(
        `/api/items/next-code?company_id=${companyId}&item_type=${formData.item_type}&_t=${timestamp}`
      );
      if (response.success) {
        setFormData(prev => ({ ...prev, item_code: response.code }));
      }
    } catch (err) {
      console.error('Failed to generate item code:', err);
      const prefix = formData.item_type === 'service' ? 'SRV' : 'ITM';
      const timestamp = Date.now().toString().slice(-4);
      setFormData(prev => ({ ...prev, item_code: `${prefix}-${timestamp}` }));
    }
  };

  // Auto-calculate prices based on tax rate
  const autoCalculatePrices = () => {
    const sellingWithTax = parseFloat(formData.selling_price_with_tax) || 0;
    const purchasePrice = parseFloat(formData.purchase_price) || 0;

    // Get tax rate percentage
    const selectedTaxRate = taxRates.find(tr => tr.id === formData.tax_rate_id);
    const taxRate = selectedTaxRate?.tax_rate || 0;

    // Calculate selling price excluding tax from price with tax and tax rate
    let sellingExclTax = 0;
    if (sellingWithTax > 0 && taxRate > 0) {
      // Formula: Price Excl Tax = Price Incl Tax / (1 + tax_rate/100)
      sellingExclTax = sellingWithTax / (1 + taxRate / 100);
    } else if (sellingWithTax > 0) {
      sellingExclTax = sellingWithTax;
    }

    // Calculate tax amount
    const taxAmount = sellingWithTax - sellingExclTax;

    // Calculate profit
    const profitAmount = sellingExclTax - purchasePrice;
    const profitMargin = purchasePrice > 0 ? (profitAmount / purchasePrice) * 100 : 0;

    // Update selling price (excl tax) only if not being edited
    if (editingField !== 'selling_price') {
      setFormData(prev => ({
        ...prev,
        selling_price: Math.round(sellingExclTax * 100) / 100
      }));
    }

    // Update pricing info for display
    setPricingInfo({
      profitMargin: Math.round(profitMargin * 100) / 100,
      profitAmount: Math.round(profitAmount * 100) / 100,
      finalPriceWithTax: sellingWithTax,
      taxRate: taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100
    });
  };

  const handleChange = (field, value) => {
    setEditingField(field);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFieldBlur = () => {
    setEditingField(null);
  };

  const buildLocationString = () => {
    const parts = [formData.aisle, formData.bay, formData.level, formData.position];
    return parts.filter(p => p).join('-') || null;
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.item_name?.trim()) errors.item_name = 'Item name is required';
    if (!formData.print_name?.trim()) errors.print_name = 'Print name is required';
    if (!formData.primary_unit_id) errors.primary_unit_id = 'Primary unit is required';

    if (formData.track_inventory) {
      if (parseFloat(formData.reorder_level) < 0) errors.reorder_level = 'Reorder level must be >= 0';
      if (formData.max_stock_level && parseFloat(formData.max_stock_level) < 0) {
        errors.max_stock_level = 'Max stock level must be >= 0';
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
      const method = itemId ? 'PUT' : 'POST';
      const url = itemId ? `/api/items/${itemId}` : '/api/items';

      const submitData = { ...formData };
      delete submitData.aisle;
      delete submitData.bay;
      delete submitData.level;
      delete submitData.position;
      submitData.location = buildLocationString();

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify({
          ...submitData,
          company_id: companyId
        })
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      success(itemId ? 'Item updated successfully' : 'Item created successfully');
      if (onSave) {
        onSave(result.data);
      } else {
        router.push('/items/item-list');
      }
    }
  };

  const itemTypeOptions = [
    { value: 'product', label: 'Product' },
    { value: 'service', label: 'Service' }
  ];

  const unitOptions = units.map(unit => ({
    value: unit.id,
    label: unit.unit_name,
    description: unit.unit_symbol
  }));

  const taxRateOptions = taxRates.map(rate => ({
    value: rate.id,
    label: `${rate.tax_name} (${rate.tax_rate}%)`,
    description: `CGST: ${rate.cgst_rate}% | SGST: ${rate.sgst_rate}%`
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{itemId ? 'Edit Item' : 'Create New Item'}</h1>
          <p className="text-slate-600 mt-2">{itemId ? 'Update item information and settings' : 'Create a new product or service with complete details'}</p>
        </div>
        <Button variant="outline" onClick={onCancel || (() => router.push('/items/item-list'))}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* BASIC INFORMATION */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-lg p-8" style={{ zIndex: 1, position: 'relative' }}>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Basic Information</h2>
          
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Input 
                  label="Item Code" 
                  value={formData.item_code} 
                  onChange={(e) => handleChange('item_code', e.target.value.toUpperCase())} 
                  required 
                  disabled={!!itemId} 
                  className="flex-2" 
                  helperText={itemId ? "Item code cannot be changed" : "Auto-generated"}
                />
                <div className="flex-1" style={{ position: 'relative', zIndex: 100 }}>
                  <Select 
                    label="Type" 
                    value={formData.item_type} 
                    onChange={(value) => handleChange('item_type', value)} 
                    options={itemTypeOptions} 
                    required 
                  />
                </div>
              </div>

              <Input 
                label="Item Name" 
                value={formData.item_name} 
                onChange={(e) => handleChange('item_name', e.target.value)} 
                error={validationErrors.item_name} 
                required 
                placeholder="Enter the internal item name"
              />

              <Input 
                label="Print Name" 
                value={formData.print_name} 
                onChange={(e) => { handleChange('print_name', e.target.value); setPrintNameTouched(true); }} 
                error={validationErrors.print_name} 
                required 
                placeholder="Name that appears on invoices"
              />

              <div className="grid grid-cols-2 gap-4">
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <Select
                    label="Category"
                    value={formData.category_id}
                    onChange={(value) => handleChange('category_id', value)}
                    options={categories}
                    placeholder="Select category"
                    searchable
                  />
                </div>
                <Input 
                  label="Brand" 
                  value={formData.brand} 
                  onChange={(e) => handleChange('brand', e.target.value)} 
                  placeholder="e.g. Apple"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => handleChange('description', e.target.value)} 
                  rows={4} 
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                  placeholder="Detailed description..."
                />
              </div>

              <MultipleBarcodeInput
                value={formData.barcodes}
                onChange={(barcodes) => handleChange('barcodes', barcodes)}
                itemId={itemId}
                label="Product Barcodes"
                placeholder="Enter or scan barcode"
                helpText="Press Enter to add. Supports multiple barcodes. Each barcode must be unique."
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label={formData.item_type === 'service' ? 'SAC Code' : 'HSN Code'} 
                  value={formData.hsn_sac_code} 
                  onChange={(e) => handleChange('hsn_sac_code', e.target.value)} 
                  error={validationErrors.hsn_sac_code} 
                  placeholder={formData.item_type === 'service' ? '123456' : '12345678'}
                />
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <TaxRateSelect 
                    label="Tax Rate" 
                    value={formData.tax_rate_id} 
                    onChange={(value) => handleChange('tax_rate_id', value)} 
                    taxRates={taxRates}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRICING & PROFITABILITY */}
        <Card title="Pricing & Profitability" style={{ zIndex: 1 }}>
          <div className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div>
                <CurrencyInput 
                  label="Purchase Price" 
                  value={formData.purchase_price} 
                  onChange={(e) => handleChange('purchase_price', e.target.value)} 
                  onBlur={handleFieldBlur}
                  error={validationErrors.purchase_price} 
                  placeholder="0.00" 
                  step="0.01"
                />
                <p className="text-xs text-slate-500 mt-1">Cost per unit</p>
              </div>

              <div>
                <Input 
                  label="Selling Price (Excl. Tax)" 
                  type="number" 
                  value={formData.selling_price} 
                  onChange={(e) => handleChange('selling_price', e.target.value)} 
                  onBlur={handleFieldBlur}
                  disabled
                  error={validationErrors.selling_price} 
                  placeholder="Auto-calculated" 
                  step="0.01"
                  className="bg-slate-50 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Auto-calculated from tax & price</p>
              </div>

              <div>
                <Input 
                  label="Selling Price (With Tax)" 
                  type="number" 
                  value={formData.selling_price_with_tax} 
                  onChange={(e) => handleChange('selling_price_with_tax', e.target.value)} 
                  onBlur={handleFieldBlur}
                  error={validationErrors.selling_price_with_tax} 
                  required 
                  placeholder="0" 
                  step="0.01"
                />
                <p className="text-xs text-slate-500 mt-1">Final customer price</p>
              </div>

              <div>
                <Input 
                  label="MRP" 
                  type="number" 
                  value={formData.mrp} 
                  onChange={(e) => handleChange('mrp', e.target.value)} 
                  onBlur={handleFieldBlur}
                  error={validationErrors.mrp} 
                  placeholder="0" 
                  step="0.01"
                />
                <p className="text-xs text-slate-500 mt-1">Maximum retail price</p>
              </div>
            </div>

            {pricingInfo.profitAmount >= 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 mt-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Profit Analysis</h3>
                <div className="grid lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">₹{pricingInfo.profitAmount.toFixed(2)}</div>
                    <div className="text-sm text-slate-600">Profit per Unit</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{pricingInfo.profitMargin.toFixed(1)}%</div>
                    <div className="text-sm text-slate-600">Profit Margin</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">₹{pricingInfo.taxAmount.toFixed(2)}</div>
                    <div className="text-sm text-slate-600">Tax Amount</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{pricingInfo.taxRate.toFixed(1)}%</div>
                    <div className="text-sm text-slate-600">Tax Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* UNITS & MEASUREMENTS */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-lg p-8" style={{ zIndex: 1, position: 'relative' }}>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Units & Measurements</h2>
          
          <div className="grid lg:grid-cols-3 gap-6">
            <div style={{ position: 'relative', zIndex: 100 }}>
              <Select 
                label="Primary Unit" 
                value={formData.primary_unit_id} 
                onChange={(value) => handleChange('primary_unit_id', value)} 
                options={unitOptions} 
                error={validationErrors.primary_unit_id} 
                required 
                searchable
              />
            </div>
            <div style={{ position: 'relative', zIndex: 100 }}>
              <Select 
                label="Secondary Unit" 
                value={formData.secondary_unit_id} 
                onChange={(value) => handleChange('secondary_unit_id', value)} 
                options={unitOptions} 
                searchable 
                placeholder="Optional"
              />
            </div>
            {formData.secondary_unit_id && (
              <Input 
                label="Conversion Factor" 
                type="number" 
                value={formData.conversion_factor} 
                onChange={(e) => handleChange('conversion_factor', parseFloat(e.target.value) || 1)} 
                min="0" 
                step="0.001" 
                helperText="1 secondary = ? primary"
              />
            )}
          </div>
        </div>

        {/* INVENTORY MANAGEMENT */}
        <Card title="Inventory Management" style={{ zIndex: 1 }}>
          <div className="space-y-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.track_inventory} 
                onChange={(e) => handleChange('track_inventory', e.target.checked)} 
                className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-lg font-medium text-slate-700">Track Inventory for this item</span>
            </label>

            {formData.track_inventory && (
              <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t">
                <Input 
                  label="Current Stock" 
                  type="number" 
                  value={formData.current_stock} 
                  onChange={(e) => handleChange('current_stock', parseFloat(e.target.value) || 0)} 
                  min="0" 
                  step="0.01" 
                  disabled={!!itemId} 
                  helperText={itemId ? 'Use stock adjustment to modify' : 'Opening stock'}
                />
                <Input 
                  label="Reorder Level" 
                  type="number" 
                  value={formData.reorder_level} 
                  onChange={(e) => handleChange('reorder_level', parseFloat(e.target.value) || 0)} 
                  error={validationErrors.reorder_level} 
                  min="0" 
                  step="0.01"
                />
                <Input 
                  label="Max Stock Level" 
                  type="number" 
                  value={formData.max_stock_level} 
                  onChange={(e) => handleChange('max_stock_level', parseFloat(e.target.value) || '')} 
                  error={validationErrors.max_stock_level} 
                  min="0" 
                  step="0.01" 
                  placeholder="Optional"
                />
              </div>
            )}
          </div>
        </Card>

        {/* WAREHOUSE LOCATION */}
        <Card title="Warehouse Location" style={{ zIndex: 1 }}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Store location details (all optional)</p>
            <div className="grid lg:grid-cols-4 gap-4">
              <Input
                label="Aisle"
                type="text"
                value={formData.aisle}
                onChange={(e) => handleChange('aisle', e.target.value.toUpperCase())}
                placeholder="e.g. A"
                maxLength="5"
              />
              <Input
                label="Bay"
                type="number"
                value={formData.bay}
                onChange={(e) => handleChange('bay', e.target.value)}
                placeholder="e.g. 1"
                min="1"
              />
              <Input
                label="Level"
                type="number"
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
                placeholder="e.g. 2"
                min="1"
              />
              <Input
                label="Position"
                type="number"
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. 3"
                min="1"
              />
            </div>

            {buildLocationString() && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Location:</span> {buildLocationString()}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ITEM SETTINGS */}
        <Card title="Item Settings" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-3 gap-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.is_active} 
                onChange={(e) => handleChange('is_active', e.target.checked)} 
                className="mr-3 h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-base font-medium text-slate-700">Active</span>
            </label>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.is_for_sale} 
                onChange={(e) => handleChange('is_for_sale', e.target.checked)} 
                className="mr-3 h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-base font-medium text-slate-700">Available for Sale</span>
            </label>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.is_for_purchase} 
                onChange={(e) => handleChange('is_for_purchase', e.target.checked)} 
                className="mr-3 h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-base font-medium text-slate-700">Available for Purchase</span>
            </label>
          </div>
        </Card>

        {/* BUTTONS */}
        <Card style={{ zIndex: 1 }}>
          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel || (() => router.push('/items/item-list'))} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading} 
              disabled={loading} 
              className="px-8"
            >
              {itemId ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50" style={{ zIndex: 1 }}>
            <p className="text-red-600">{error}</p>
          </Card>
        )}
      </form>
    </div>
  );
};

export default ItemForm;
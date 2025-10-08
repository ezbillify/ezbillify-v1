// src/components/purchase/PurchaseOrderForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const PurchaseOrderForm = ({ poId, companyId, onComplete }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [formData, setFormData] = useState({
    vendor_id: '',
    document_date: new Date().toISOString().split('T')[0],
    due_date: '',
    billing_address: null,
    shipping_address: null,
    notes: '',
    terms_conditions: '',
    status: 'draft'
  });

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [nextPONumber, setNextPONumber] = useState('Loading...');

  useEffect(() => {
    if (companyId) {
      fetchVendors();
      fetchItems();
      fetchUnits();
      fetchTaxRates();
      if (!poId) {
        fetchNextPONumber();
      }
    }
    if (poId) {
      fetchPurchaseOrder();
    } else {
      addNewLine();
    }
  }, [poId, companyId]);

  const fetchNextPONumber = async () => {
    try {
      const response = await authenticatedFetch(`/api/document-sequences/next-number?company_id=${companyId}&document_type=purchase_order`);
      if (response.success) {
        setNextPONumber(response.data.next_number);
      }
    } catch (error) {
      console.error('Error fetching next PO number:', error);
      setNextPONumber('PO-####');
    }
  };

  const fetchVendors = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors?company_id=${companyId}&is_active=true&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendors(result.data || []);
    }
  };

  const fetchItems = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/items?company_id=${companyId}&is_active=true&is_for_purchase=true&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setAvailableItems(result.data || []);
    }
  };

  const fetchUnits = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/master-data/units?company_id=${companyId}&is_active=true`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setUnits(result.data || []);
    }
  };

  const fetchTaxRates = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/master-data/tax-rates?company_id=${companyId}&is_active=true`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setTaxRates(result.data || []);
    }
  };

  const fetchPurchaseOrder = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/purchase-orders/${poId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const po = result.data;
      setFormData({
        vendor_id: po.vendor_id,
        document_date: po.document_date,
        due_date: po.due_date || '',
        billing_address: po.billing_address,
        shipping_address: po.shipping_address,
        notes: po.notes || '',
        terms_conditions: po.terms_conditions || '',
        status: po.status
      });
      setItems(po.items || []);
      if (po.vendor) {
        setSelectedVendor(po.vendor);
      }
      setNextPONumber(po.document_number);
    }
  };

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setFormData(prev => ({
      ...prev,
      vendor_id: vendorId,
      billing_address: vendor?.billing_address || null,
      shipping_address: vendor?.shipping_address || null
    }));
    setSelectedVendor(vendor);
  };

  const addNewLine = () => {
    setItems(prev => [...prev, {
      id: Date.now(),
      item_id: '',
      item_code: '',
      item_name: '',
      description: '',
      quantity: '',
      unit_id: '',
      unit_name: '',
      rate: '',
      discount_percentage: '',
      discount_amount: 0,
      taxable_amount: 0,
      tax_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_amount: 0,
      hsn_sac_code: ''
    }]);
  };

  const removeLine = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'item_id' && value) {
        const item = availableItems.find(i => i.id === value);
        if (item) {
          newItems[index].item_code = item.item_code;
          newItems[index].item_name = item.item_name;
          newItems[index].rate = item.purchase_price || 0;
          newItems[index].unit_id = item.primary_unit_id;
          newItems[index].hsn_sac_code = item.hsn_sac_code || '';
          
          const unit = units.find(u => u.id === item.primary_unit_id);
          newItems[index].unit_name = unit?.unit_name || '';

          if (item.tax_rate_id) {
            const taxRate = taxRates.find(t => t.id === item.tax_rate_id);
            if (taxRate) {
              newItems[index].tax_rate = taxRate.tax_rate;
              newItems[index].cgst_rate = taxRate.cgst_rate || 0;
              newItems[index].sgst_rate = taxRate.sgst_rate || 0;
              newItems[index].igst_rate = taxRate.igst_rate || 0;
            }
          }
        }
      }

      // ✅ CRITICAL FIX: Parse as Number to prevent string concatenation
      const item = newItems[index];
      const quantity = Number(parseFloat(item.quantity) || 0);
      const rate = Number(parseFloat(item.rate) || 0);
      const discountPercentage = Number(parseFloat(item.discount_percentage) || 0);

      const lineAmount = quantity * rate;
      const discountAmount = (lineAmount * discountPercentage) / 100;
      const taxableAmount = lineAmount - discountAmount;

      const cgstAmount = (taxableAmount * (Number(parseFloat(item.cgst_rate) || 0))) / 100;
      const sgstAmount = (taxableAmount * (Number(parseFloat(item.sgst_rate) || 0))) / 100;
      const igstAmount = (taxableAmount * (Number(parseFloat(item.igst_rate) || 0))) / 100;
      const totalTax = cgstAmount + sgstAmount + igstAmount;

      newItems[index].discount_amount = discountAmount;
      newItems[index].taxable_amount = taxableAmount;
      newItems[index].cgst_amount = cgstAmount;
      newItems[index].sgst_amount = sgstAmount;
      newItems[index].igst_amount = igstAmount;
      newItems[index].total_amount = taxableAmount + totalTax;

      return newItems;
    });
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(parseFloat(item.taxable_amount) || 0)), 0);
    const cgst = items.reduce((sum, item) => sum + (Number(parseFloat(item.cgst_amount) || 0)), 0);
    const sgst = items.reduce((sum, item) => sum + (Number(parseFloat(item.sgst_amount) || 0)), 0);
    const igst = items.reduce((sum, item) => sum + (Number(parseFloat(item.igst_amount) || 0)), 0);
    const totalTax = cgst + sgst + igst;
    const total = subtotal + totalTax;

    return { subtotal, cgst, sgst, igst, totalTax, total };
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      showError('Please select a vendor');
      return false;
    }

    if (items.length === 0) {
      showError('Please add at least one item');
      return false;
    }

    const invalidItems = items.filter(item => 
      !item.item_id || 
      !item.quantity || 
      parseFloat(item.quantity) <= 0 || 
      !item.rate || 
      parseFloat(item.rate) <= 0
    );
    
    if (invalidItems.length > 0) {
      showError('Please fill all item details correctly');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const apiCall = async () => {
      const url = poId 
        ? `/api/purchase/purchase-orders/${poId}`
        : '/api/purchase/purchase-orders';
      const method = poId ? 'PUT' : 'POST';

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          items
        })
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      success(poId ? 'Purchase order updated successfully' : 'Purchase order created successfully');
      if (onComplete) {
        onComplete(result.data);
      } else {
        router.push('/purchase/purchase-orders');
      }
    }
  };

  const totals = calculateTotals();

  const vendorOptions = vendors.map(v => ({
    value: v.id,
    label: `${v.vendor_name} (${v.vendor_code})`
  }));

  const itemOptions = availableItems.map(i => ({
    value: i.id,
    label: `${i.item_name} (${i.item_code})`
  }));

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'closed', label: 'Closed' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Purchase Order Details</h3>
          {!poId && (
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Next PO Number</div>
              <div className="text-lg font-bold text-blue-600">{nextPONumber}</div>
            </div>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Select
            label="Vendor"
            value={formData.vendor_id}
            onChange={handleVendorChange}
            options={vendorOptions}
            required
            placeholder="Select vendor"
          />

          <DatePicker
            label="PO Date"
            value={formData.document_date}
            onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
            required
          />

          <DatePicker
            label="Due Date"
            value={formData.due_date}
            onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Items</h3>
          <Button
            type="button"
            variant="ghost"
            onClick={addNewLine}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Rate</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Disc%</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tax%</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-3 py-2 text-sm text-slate-900">{index + 1}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={item.item_id}
                      onChange={(value) => handleItemChange(index, 'item_id', value)}
                      options={itemOptions}
                      placeholder="Select item"
                      className="min-w-[200px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-20"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-24"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.discount_percentage}
                      onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-16"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm text-slate-600">{item.tax_rate || 0}%</span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium text-slate-900">
                    ₹{(item.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="text-red-600"
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.cgst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">CGST:</span>
                <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
              </div>
            )}
            {totals.sgst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">SGST:</span>
                <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
              </div>
            )}
            {totals.igst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span className="font-medium">₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>Total:</span>
              <span>₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Internal notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Terms & Conditions</label>
            <textarea
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Terms and conditions..."
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
        >
          {poId ? 'Update Purchase Order' : 'Create Purchase Order'}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/purchase/purchase-orders')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;
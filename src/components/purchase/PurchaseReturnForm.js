// src/components/purchase/PurchaseReturnForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const PurchaseReturnForm = ({ returnId, companyId, billId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [returnNumber, setReturnNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    document_date: new Date().toISOString().split('T')[0],
    bill_id: billId || null,
    reason: '',
    notes: '',
    status: 'draft'
  });

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorBills, setVendorBills] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [itemSearchIndex, setItemSearchIndex] = useState(null);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (!returnId) {
      setReturnNumber('Loading...');
    }

    if (companyId) {
      fetchVendors();
      fetchItems();
      fetchUnits();
      fetchTaxRates();
      
      if (!returnId) {
        fetchNextReturnNumber();
      }
    }
    
    if (returnId) {
      fetchReturn();
    } else if (billId) {
      loadBill();
    } else {
      addNewLine();
    }

    return () => {
      if (!returnId) {
        setReturnNumber('Loading...');
      }
    };
  }, [returnId, companyId, billId, router.asPath]);

  useEffect(() => {
    if (formData.vendor_id && companyId) {
      fetchVendorBills(formData.vendor_id);
    } else {
      setVendorBills([]);
    }
  }, [formData.vendor_id, companyId]);

  const fetchNextReturnNumber = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=purchase_return&action=next`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data?.next_number) {
      setReturnNumber(result.data.next_number);
    } else {
      setReturnNumber('PR-0001');
    }
  };

  const fetchVendorBills = async (vendorId) => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&status=approved&limit=100`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendorBills(result.data || []);
    }
  };

  const loadBill = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const bill = result.data;
      setFormData(prev => ({
        ...prev,
        vendor_id: bill.vendor_id,
        bill_id: bill.id,
        notes: bill.notes || ''
      }));

      if (bill.vendor) {
        setSelectedVendor(bill.vendor);
        setVendorSearch(bill.vendor.vendor_name);
      }

      const convertedItems = bill.items?.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        quantity: 1,
        unit_id: item.unit_id,
        unit_name: item.unit_name,
        rate: item.rate,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: 0,
        taxable_amount: 0,
        tax_rate: item.tax_rate || 0,
        cgst_rate: item.cgst_rate || 0,
        sgst_rate: item.sgst_rate || 0,
        igst_rate: item.igst_rate || 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        hsn_sac_code: item.hsn_sac_code || ''
      })) || [];

      setItems(convertedItems);
    }
  };

  const handleBillSelect = async (billId) => {
    setFormData(prev => ({ ...prev, bill_id: billId }));
    
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const bill = result.data;
      const convertedItems = bill.items?.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        quantity: 1,
        unit_id: item.unit_id,
        unit_name: item.unit_name,
        rate: item.rate,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: 0,
        taxable_amount: 0,
        tax_rate: item.tax_rate || 0,
        cgst_rate: item.cgst_rate || 0,
        sgst_rate: item.sgst_rate || 0,
        igst_rate: item.igst_rate || 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        hsn_sac_code: item.hsn_sac_code || ''
      })) || [];

      setItems(convertedItems);
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

  const fetchReturn = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns/${returnId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const returnDoc = result.data;
      setReturnNumber(returnDoc.document_number);
      setFormData({
        vendor_id: returnDoc.vendor_id,
        document_date: returnDoc.document_date,
        bill_id: returnDoc.parent_document_id,
        reason: returnDoc.reason || '',
        notes: returnDoc.notes || '',
        status: returnDoc.status
      });
      setItems(returnDoc.items || []);
      if (returnDoc.vendor) {
        setSelectedVendor(returnDoc.vendor);
        setVendorSearch(returnDoc.vendor.vendor_name);
      }
    }
  };

  const handleVendorSelect = (vendor) => {
    setFormData(prev => ({ ...prev, vendor_id: vendor.id, bill_id: null }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
    setItems([]);
    addNewLine();
  };

  const addNewLine = () => {
    setItems(prev => [...prev, {
      id: Date.now(),
      item_id: '',
      item_code: '',
      item_name: '',
      description: '',
      quantity: 1,
      unit_id: '',
      unit_name: '',
      rate: 0,
      discount_percentage: 0,
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

  const handleItemSelect = (index, item) => {
    setItems(prev => {
      const newItems = [...prev];
      const unit = units.find(u => u.id === item.primary_unit_id);
      
      let taxInfo = { tax_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 };
      if (item.tax_rate_id) {
        const taxRate = taxRates.find(t => t.id === item.tax_rate_id);
        if (taxRate) {
          taxInfo = {
            tax_rate: taxRate.tax_rate,
            cgst_rate: taxRate.cgst_rate || 0,
            sgst_rate: taxRate.sgst_rate || 0,
            igst_rate: taxRate.igst_rate || 0
          };
        }
      }

      newItems[index] = {
        ...newItems[index],
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        rate: item.purchase_price || 0,
        unit_id: item.primary_unit_id,
        unit_name: unit?.unit_name || '',
        hsn_sac_code: item.hsn_sac_code || '',
        ...taxInfo
      };

      return calculateLineAmounts(newItems, index);
    });
    setItemSearchIndex(null);
    setItemSearch('');
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const parsedValue = ['quantity', 'rate', 'discount_percentage'].includes(field) 
        ? parseFloat(value) || 0 
        : value;
      
      newItems[index] = { ...newItems[index], [field]: parsedValue };
      return calculateLineAmounts(newItems, index);
    });
  };

  const calculateLineAmounts = (items, index) => {
    const item = items[index];
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discountPercentage = parseFloat(item.discount_percentage) || 0;

    const lineAmount = quantity * rate;
    const discountAmount = (lineAmount * discountPercentage) / 100;
    const taxableAmount = lineAmount - discountAmount;

    const cgstAmount = (taxableAmount * (parseFloat(item.cgst_rate) || 0)) / 100;
    const sgstAmount = (taxableAmount * (parseFloat(item.sgst_rate) || 0)) / 100;
    const igstAmount = (taxableAmount * (parseFloat(item.igst_rate) || 0)) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    items[index] = {
      ...item,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: taxableAmount + totalTax
    };

    return items;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.taxable_amount) || 0), 0);
    const cgst = items.reduce((sum, item) => sum + (parseFloat(item.cgst_amount) || 0), 0);
    const sgst = items.reduce((sum, item) => sum + (parseFloat(item.sgst_amount) || 0), 0);
    const igst = items.reduce((sum, item) => sum + (parseFloat(item.igst_amount) || 0), 0);
    const totalTax = cgst + sgst + igst;
    const total = subtotal + totalTax;

    return { subtotal, cgst, sgst, igst, totalTax, total: Math.round(total) };
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

    const invalidItems = items.filter(item => !item.item_id || item.quantity <= 0 || item.rate < 0);
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
      const url = returnId ? `/api/purchase/returns/${returnId}` : '/api/purchase/returns';
      const method = returnId ? 'PUT' : 'POST';

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
      success(returnId ? 'Return updated successfully' : 'Return created successfully');
      router.push('/purchase/returns');
    }
  };

  const totals = calculateTotals();
  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const returnReasons = [
    { value: '', label: 'Select reason' },
    { value: 'defective', label: 'Defective/Damaged' },
    { value: 'wrong_item', label: 'Wrong Item Delivered' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'excess_quantity', label: 'Excess Quantity' },
    { value: 'other', label: 'Other' }
  ];

  const billOptions = [
    { value: '', label: 'Select a bill (optional)' },
    ...vendorBills.map(bill => ({
      value: bill.id,
      label: `${bill.document_number} - ₹${bill.total_amount.toLocaleString('en-IN')} - ${new Date(bill.document_date).toLocaleDateString('en-IN')}`
    }))
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {returnId ? 'Edit Purchase Return' : 'New Purchase Return'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Return Number: <span className="font-semibold text-blue-600">{returnNumber}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vendor <span className="text-red-500">*</span>
            </label>
            <Input
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setShowVendorDropdown(true);
              }}
              onFocus={() => setShowVendorDropdown(true)}
              placeholder="Search vendor by name or code..."
              required
            />
            {showVendorDropdown && filteredVendors.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredVendors.map(vendor => (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorSelect(vendor)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-medium text-slate-900">{vendor.vendor_name}</div>
                    <div className="text-sm text-slate-500">{vendor.vendor_code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <DatePicker
              label="Return Date"
              value={formData.document_date}
              onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
              required
            />
          </div>

          {formData.vendor_id && (
            <div className="lg:col-span-2">
              <Select
                label="Reference Bill (Optional)"
                value={formData.bill_id || ''}
                onChange={(value) => value && handleBillSelect(value)}
                options={billOptions}
                placeholder="Select bill to load items automatically"
              />
              {vendorBills.length === 0 && formData.vendor_id && (
                <p className="text-xs text-slate-500 mt-1">No approved bills found for this vendor</p>
              )}
            </div>
          )}

          <div className={formData.vendor_id ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <Select
              label="Return Reason"
              value={formData.reason}
              onChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              options={returnReasons}
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Return Items</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addNewLine}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Line
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-24">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-32">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-24">Disc%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-20">Tax%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-32">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-16"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 relative">
                    <Input
                      value={itemSearchIndex === index ? itemSearch : item.item_name}
                      onChange={(e) => {
                        setItemSearchIndex(index);
                        setItemSearch(e.target.value);
                      }}
                      onFocus={() => setItemSearchIndex(index)}
                      placeholder="Search item..."
                      className="text-sm"
                    />
                    {itemSearchIndex === index && itemSearch && (
                      <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {availableItems
                          .filter(i => 
                            i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                            i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
                          )
                          .map(availItem => (
                            <div
                              key={availItem.id}
                              onClick={() => handleItemSelect(index, availItem)}
                              className="p-2 hover:bg-slate-50 cursor-pointer text-sm"
                            >
                              <div className="font-medium">{availItem.item_name}</div>
                              <div className="text-xs text-slate-500">{availItem.item_code}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.unit_name || '-'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.discount_percentage}
                      onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{item.tax_rate}%</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    ₹{item.total_amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-96 space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.cgst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">CGST:</span>
                <span className="font-semibold">₹{totals.cgst.toFixed(2)}</span>
              </div>
            )}
            {totals.sgst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">SGST:</span>
                <span className="font-semibold">₹{totals.sgst.toFixed(2)}</span>
              </div>
            )}
            {totals.igst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span className="font-semibold">₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-slate-300">
              <span>Total Return Amount:</span>
              <span className="text-red-600">₹{totals.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Information</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Return details, condition of items..."
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/purchase/returns')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          icon={loading ? null : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        >
          {loading ? 'Saving...' : returnId ? 'Update Return' : 'Create Return'}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseReturnForm;
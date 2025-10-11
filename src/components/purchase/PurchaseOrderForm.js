// src/components/purchase/PurchaseOrderForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  Save, 
  Printer, 
  Send, 
  Calculator, 
  Users,
  FileText,
  ShoppingCart,
  Search,
  Trash2,
  Loader2,
  Package
} from 'lucide-react';

const PurchaseOrderForm = ({ poId, companyId }) => {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  // ✅ Get today's date in local timezone
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [poNumber, setPoNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    document_date: getTodayDate(),
    due_date: '',
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

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  useEffect(() => {
    if (!poId) {
      setPoNumber('Loading...');
    }

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
    }

    return () => {
      if (!poId) {
        setPoNumber('Loading...');
      }
    };
  }, [poId, companyId]);

  const fetchNextPONumber = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=purchase_order&action=next`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data?.next_number) {
      setPoNumber(result.data.next_number);
    } else {
      setPoNumber('PO-0001');
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
      setPoNumber(po.document_number);
      setFormData({
        vendor_id: po.vendor_id,
        document_date: po.document_date,
        due_date: po.due_date || '',
        notes: po.notes || '',
        terms_conditions: po.terms_conditions || '',
        status: po.status
      });
      setItems(po.items || []);
      if (po.vendor) {
        setSelectedVendor(po.vendor);
        setVendorSearch(po.vendor.vendor_name);
      }
    }
  };

  const handleVendorSelect = (vendor) => {
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
  };

  const removeLine = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemSelect = (item) => {
    // Check if item already exists
    const existingItemIndex = items.findIndex(i => i.item_id === item.id);
    
    if (existingItemIndex !== -1) {
      // Increment quantity
      setItems(prev => {
        const newItems = [...prev];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + 1
        };
        return calculateLineAmounts(newItems, existingItemIndex);
      });
      
      setItemSearch('');
      setShowItemDropdown(false);
      return;
    }
    
    const unit = units.find(u => u.id === item.primary_unit_id);
    
    let taxInfo = { tax_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 };
    if (item.tax_rate_id) {
      const taxRate = taxRates.find(t => t.id === item.tax_rate_id);
      if (taxRate) {
        taxInfo = {
          tax_rate: taxRate.tax_rate,
          cgst_rate: taxRate.tax_rate / 2,
          sgst_rate: taxRate.tax_rate / 2,
          igst_rate: 0
        };
      }
    }

    const newItem = {
      id: Date.now(),
      item_id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      rate: item.purchase_price || 0,
      quantity: 1,
      unit_id: item.primary_unit_id,
      unit_name: unit?.unit_name || '',
      hsn_sac_code: item.hsn_sac_code || '',
      discount_percentage: 0,
      discount_amount: 0,
      taxable_amount: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_amount: 0,
      ...taxInfo
    };

    setItems(prev => {
      const newItems = [...prev, newItem];
      return calculateLineAmounts(newItems, newItems.length - 1);
    });
    
    setItemSearch('');
    setShowItemDropdown(false);
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
    const roundOff = Math.round(total) - total;

    return { 
      subtotal, 
      cgst, 
      sgst, 
      igst, 
      totalTax,
      roundOff,
      total: Math.round(total) 
    };
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

    const invalidItems = items.filter(item => item.quantity <= 0 || item.rate < 0);
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
      const url = poId ? `/api/purchase/purchase-orders/${poId}` : '/api/purchase/purchase-orders';
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
      showSuccess(`Purchase Order ${poId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        router.push('/purchase/purchase-orders');
      }, 1500);
    }
  };

  const handleItemKey = (e) => {
    if (e.key === 'Enter' && itemSearch) {
      e.preventDefault();
      const filtered = availableItems.filter(i => 
        i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        handleItemSelect(filtered[0]);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (formData.vendor_id && items.length > 0) {
          handleSubmit(e);
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search Vendor"]');
        input?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search items"]');
        input?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formData.vendor_id, items]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.vendor-dropdown') && !target.closest('.vendor-input')) {
        setShowVendorDropdown(false);
      }
      if (!target.closest('.item-dropdown') && !target.closest('.item-input')) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = calculateTotals();
  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                PO Number: <span className="text-blue-600">#{poNumber}</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSubmit}
              disabled={loading || !formData.vendor_id || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save (Ctrl+S)
            </button>
            
            <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            <button className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors">
              <Send className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Row - Vendor, PO Details, PO Summary */}
        <div className="grid grid-cols-3 gap-4">
          
          {/* Vendor Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Vendor</h3>
              </div>
              
              <div className="relative vendor-input mb-3 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search Vendor <span className="text-gray-400 text-xs">(F1)</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {showVendorDropdown && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-xl vendor-dropdown">
                    {filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => handleVendorSelect(vendor)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{vendor.vendor_name}</div>
                        <div className="text-xs text-gray-500">{vendor.vendor_code}</div>
                        {vendor.gstin && (
                          <div className="text-xs text-blue-600 font-mono mt-0.5">GSTIN: {vendor.gstin}</div>
                        )}
                        {vendor.billing_address?.address_line1 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {vendor.billing_address.address_line1}
                            {vendor.billing_address.city && `, ${vendor.billing_address.city}`}
                            {vendor.billing_address.state && `, ${vendor.billing_address.state}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedVendor && (
                <div className="space-y-2 flex-shrink-0 overflow-y-auto max-h-48">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900 mb-0.5">{selectedVendor.vendor_name}</div>
                    {selectedVendor.billing_address?.address_line1 && (
                      <div>{selectedVendor.billing_address.address_line1}</div>
                    )}
                    {selectedVendor.billing_address?.city && (
                      <div>
                        {selectedVendor.billing_address.city}
                        {selectedVendor.billing_address.state && `, ${selectedVendor.billing_address.state}`}
                        {selectedVendor.billing_address.pincode && ` - ${selectedVendor.billing_address.pincode}`}
                      </div>
                    )}
                  </div>
                  
                  {selectedVendor.gstin && (
                    <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg font-mono border border-blue-200">
                      <span className="font-semibold">GSTIN:</span> {selectedVendor.gstin}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PO Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">PO Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.document_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                      required
                      className="custom-datepicker"
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Due Date
                    </label>
                    <DatePicker
                      value={formData.due_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                      className="custom-datepicker"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PO Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">PO Summary</h3>
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                
                {totals.cgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">CGST</span>
                    <span className="font-medium text-green-400">₹{totals.cgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">SGST</span>
                    <span className="font-medium text-green-400">₹{totals.sgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.igst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">IGST</span>
                    <span className="font-medium text-blue-400">₹{totals.igst.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Round Off</span>
                  <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{totals.roundOff.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-lg font-bold pt-1.5 border-t-2 border-gray-200">
                  <span className="text-gray-900">TOTAL</span>
                  <span className="text-blue-600">₹{totals.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section - Full Width Table Below */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm" style={{ overflow: 'visible' }}>
          <div className="p-3 border-b border-gray-200" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Items ({items.length})
                </h3>
              </div>
              {/* Item Search */}
              <div className="relative item-input" style={{ zIndex: 100 }}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search items or scan barcode (F2)"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onKeyDown={handleItemKey}
                  onFocus={() => setShowItemDropdown(true)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {showItemDropdown && itemSearch && (
                  <div className="absolute right-0 bg-white border border-gray-200 rounded-lg mt-1 max-h-96 overflow-auto shadow-2xl item-dropdown" style={{
                    width: '450px',
                    zIndex: 9999
                  }}>
                    {availableItems
                      .filter(i => 
                        i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                        i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .slice(0, 10)
                      .map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">{item.item_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Code: <span className="font-mono">{item.item_code}</span> • HSN: <span className="font-mono">{item.hsn_sac_code || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-base font-bold text-blue-600">
                                ₹{item.purchase_price?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-gray-500 font-medium">Purchase Price</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    {availableItems.filter(i => 
                      i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                      i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No items found matching "{itemSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Width Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-10">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Qty</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Unit</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-28">Rate</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Disc%</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Tax</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-32">Amount</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-xs text-gray-500 font-medium">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                          <div className="text-xs text-gray-500">HSN: {item.hsn_sac_code || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-gray-600 font-medium">{item.unit_name || '-'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.discount_percentage}
                          onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-gray-600">
                        <div className="space-y-0.5">
                          <div className="text-green-600 font-medium">C: {item.cgst_rate}%</div>
                          <div className="text-green-600 font-medium">S: {item.sgst_rate}%</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                        ₹{item.total_amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center">
                      <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <div className="text-base text-gray-500 font-medium mb-1">No items added yet</div>
                      <div className="text-sm text-gray-400">Search for items above or press F2 to start adding items</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Internal notes..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
              <textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Payment terms..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
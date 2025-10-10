// src/components/purchase/BillForm.js
'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';
import { getGSTType } from '../../lib/constants';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Send, 
  Calculator, 
  Users,
  FileText,
  ShoppingCart,
  Plus,
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Package,
  Receipt
} from 'lucide-react';

const BillForm = ({ billId, companyId, purchaseOrderId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [billNumber, setBillNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_invoice_number: '',
    document_date: new Date().toISOString().split('T')[0],
    due_date: '',
    purchase_order_id: purchaseOrderId || null,
    notes: '',
    terms_conditions: '',
    status: 'received',
    discount_percentage: 0,
    discount_amount: 0,
    gst_type: null
  });

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [itemSearchIndex, setItemSearchIndex] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);

  useEffect(() => {
    if (!billId) {
      setBillNumber('Loading...');
    }

    if (companyId) {
      fetchVendors();
      fetchItems();
      fetchUnits();
      fetchTaxRates();
      
      if (!billId) {
        fetchNextBillNumber();
      }
    }
    
    if (billId) {
      fetchBill();
    } else if (purchaseOrderId) {
      loadPurchaseOrder();
    } else {
      addNewLine();
    }

    return () => {
      if (!billId) {
        setBillNumber('Loading...');
      }
    };
  }, [billId, companyId, purchaseOrderId]);

  // Calculate GST type when vendor changes
  useEffect(() => {
    if (selectedVendor && company?.address?.state) {
      const vendorState = selectedVendor.billing_address?.state;
      const companyState = company.address.state;
      
      if (vendorState && companyState) {
        const gstType = getGSTType(companyState, vendorState);
        setFormData(prev => ({ ...prev, gst_type: gstType }));
        
        // Recalculate all items with new GST type
        updateItemsWithGSTType(gstType);
      }
    }
  }, [selectedVendor, company?.address?.state]);

  const updateItemsWithGSTType = (gstType) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        const taxRate = item.tax_rate || 0;
        
        let cgstRate = 0, sgstRate = 0, igstRate = 0;
        
        if (gstType === 'intrastate') {
          cgstRate = taxRate / 2;
          sgstRate = taxRate / 2;
          igstRate = 0;
        } else {
          cgstRate = 0;
          sgstRate = 0;
          igstRate = taxRate;
        }
        
        return {
          ...item,
          cgst_rate: cgstRate,
          sgst_rate: sgstRate,
          igst_rate: igstRate
        };
      });
    });
  };

  const fetchNextBillNumber = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=bill&action=next`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data?.next_number) {
      setBillNumber(result.data.next_number);
    } else {
      setBillNumber('BILL-0001');
    }
  };

  const loadPurchaseOrder = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/purchase-orders/${purchaseOrderId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const po = result.data;
      setFormData(prev => ({
        ...prev,
        vendor_id: po.vendor_id,
        notes: po.notes || '',
        terms_conditions: po.terms_conditions || ''
      }));

      if (po.vendor) {
        setSelectedVendor(po.vendor);
        setVendorSearch(po.vendor.vendor_name);
      }

      const convertedItems = po.items?.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
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

  const fetchBill = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const bill = result.data;
      setBillNumber(bill.document_number);
      setFormData({
        vendor_id: bill.vendor_id,
        vendor_invoice_number: bill.vendor_invoice_number || '',
        document_date: bill.document_date,
        due_date: bill.due_date || '',
        purchase_order_id: bill.parent_document_id,
        notes: bill.notes || '',
        terms_conditions: bill.terms_conditions || '',
        status: bill.status,
        discount_percentage: bill.discount_percentage || 0,
        discount_amount: bill.discount_amount || 0,
        gst_type: bill.gst_type || null
      });
      setItems(bill.items || []);
      if (bill.vendor) {
        setSelectedVendor(bill.vendor);
        setVendorSearch(bill.vendor.vendor_name);
      }
    }
  };

  const handleVendorSelect = (vendor) => {
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
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
          const gstType = formData.gst_type || 'intrastate';
          
          if (gstType === 'intrastate') {
            taxInfo = {
              tax_rate: taxRate.tax_rate,
              cgst_rate: taxRate.tax_rate / 2,
              sgst_rate: taxRate.tax_rate / 2,
              igst_rate: 0
            };
          } else {
            taxInfo = {
              tax_rate: taxRate.tax_rate,
              cgst_rate: 0,
              sgst_rate: 0,
              igst_rate: taxRate.tax_rate
            };
          }
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
    
    const beforeDiscount = subtotal + totalTax;
    const discountAmount = formData.discount_percentage 
      ? (beforeDiscount * parseFloat(formData.discount_percentage)) / 100
      : parseFloat(formData.discount_amount) || 0;
    
    const total = beforeDiscount - discountAmount;
    const roundOff = Math.round(total) - total;

    return { 
      subtotal, 
      cgst, 
      sgst, 
      igst, 
      totalTax, 
      beforeDiscount,
      discountAmount,
      roundOff,
      total: Math.round(total) 
    };
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      setError('Please select a vendor');
      return false;
    }

    if (items.length === 0) {
      setError('Please add at least one item');
      return false;
    }

    const invalidItems = items.filter(item => !item.item_id || item.quantity <= 0 || item.rate < 0);
    if (invalidItems.length > 0) {
      setError('Please fill all item details correctly');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const apiCall = async () => {
      const url = billId ? `/api/purchase/bills/${billId}` : '/api/purchase/bills';
      const method = billId ? 'PUT' : 'POST';

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
      setSuccessMsg(`Bill ${billId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        router.push('/purchase/bills');
      }, 2000);
    }
  };

  const handleItemKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const filtered = availableItems.filter(i => 
        i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        const newIndex = items.length;
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
        handleItemSelect(newIndex, filtered[0]);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (formData.vendor_id && items.length > 0) {
          handleSubmit(e);
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search vendor"]');
        input?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search items"]');
        input?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formData.vendor_id, items.length]);

  // Click outside handlers
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
      {/* Compact Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/purchase/bills")} 
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">
              {billId ? 'Edit Purchase Bill' : 'New Purchase Bill'} #{billNumber}
              {loading && " (Saving...)"}
            </h1>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSubmit}
              disabled={loading || !formData.vendor_id || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save (Ctrl+S)
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
              <Send className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-2">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-4 mt-2">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-green-700">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-120px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-4 overflow-auto">
          
          {/* Vendor & Bill Info - Compact Grid */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            
            {/* Vendor Section - 4 columns */}
            <div className="col-span-4 bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">Vendor</span>
              </div>
              
              <div className="relative mb-2 vendor-input">
                <input
                  type="text"
                  placeholder="Search Vendor (F1)"
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  className="w-full px-3 py-2 border rounded focus:border-blue-500 focus:outline-none text-sm"
                />
                {showVendorDropdown && filteredVendors.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border rounded mt-1 max-h-32 overflow-auto shadow-lg vendor-dropdown">
                    {filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => handleVendorSelect(vendor)}
                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{vendor.vendor_name}</div>
                        <div className="text-xs text-gray-500">{vendor.vendor_code}</div>
                        {vendor.gstin && (
                          <div className="text-xs text-blue-600 font-mono">GSTIN: {vendor.gstin}</div>
                        )}
                        {vendor.billing_address?.address_line1 && (
                          <div className="text-xs text-gray-500 mt-1">
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
              
              {selectedVendor && selectedVendor.billing_address && (
                <>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-1">
                    {selectedVendor.billing_address.address_line1}
                    {selectedVendor.billing_address.city && `, ${selectedVendor.billing_address.city}`}
                    {selectedVendor.billing_address.state && `, ${selectedVendor.billing_address.state}`}
                    {selectedVendor.billing_address.pincode && ` - ${selectedVendor.billing_address.pincode}`}
                  </div>
                  
                  {selectedVendor.gstin && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded font-mono mb-2">
                      GSTIN: {selectedVendor.gstin}
                    </div>
                  )}

                  {/* GST Type Indicator */}
                  {formData.gst_type && (
                    <div className={`text-xs p-2 rounded border ${
                      formData.gst_type === 'intrastate'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      {formData.gst_type === 'intrastate' ? (
                        <>
                          <div className="font-medium">Same State - Intrastate</div>
                          <div className="text-xs">CGST + SGST will apply</div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium">Different State - Interstate</div>
                          <div className="text-xs">IGST will apply</div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bill Details - 8 columns */}
            <div className="col-span-8 bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm">Bill Details</span>
              </div>
              
              <div className="grid grid-cols-6 gap-2 text-sm">
                <div>
                  <DatePicker
                    label="Bill Date"
                    value={formData.document_date}
                    onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                    required
                  />
                </div>
                <div>
                  <DatePicker
                    label="Due Date"
                    value={formData.due_date}
                    onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Vendor Invoice #</label>
                  <input
                    type="text"
                    value={formData.vendor_invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_invoice_number: e.target.value }))}
                    className="w-full px-2 py-1 border rounded text-xs"
                    placeholder="Vendor's invoice number"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-2 py-1 border rounded text-xs"
                  >
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section - Compact */}
          <div className="bg-white rounded-lg border">
            
            {/* Items Header - Compact */}
            <div className="border-b p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Items ({items.length})</span>
                </div>
                
                {/* Item Search - Compact */}
                <div className="relative item-input">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items or scan barcode (F2)"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onKeyDown={handleItemKey}
                    className="pl-9 pr-4 py-2 border rounded w-72 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  
                  {showItemDropdown && itemSearch && (
                    <div className="absolute z-10 bg-white border rounded mt-1 max-h-40 overflow-auto shadow-lg w-72 top-full item-dropdown">
                      {availableItems
                        .filter(i => 
                          i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
                        )
                        .map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              const newIndex = items.length;
                              addNewLine();
                              setTimeout(() => handleItemSelect(newIndex, item), 0);
                            }}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium text-sm">{item.item_name}</div>
                            <div className="text-xs text-gray-500">
                              Code: {item.item_code} • HSN: {item.hsn_sac_code}
                            </div>
                            <div className="text-sm font-semibold text-blue-600">
                              ₹{item.purchase_price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-600">
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Item Name</th>
                    <th className="text-center p-2 w-16">Qty</th>
                    <th className="text-center p-2 w-16">Unit</th>
                    <th className="text-center p-2 w-20">Rate</th>
                    <th className="text-center p-2 w-16">Disc%</th>
                    <th className="text-center p-2 w-16">Tax%</th>
                    <th className="text-right p-2 w-20">Amount</th>
                    <th className="text-center p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-xs text-gray-500">{index + 1}</td>
                      <td className="p-2">
                        <div className="text-sm font-medium">{item.item_name || '-'}</div>
                        <div className="text-xs text-gray-500">
                          HSN: {item.hsn_sac_code || '-'}
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-1 py-1 text-sm text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2 text-sm text-center text-slate-600">{item.unit_name || '-'}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-full px-1 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.discount_percentage}
                          onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                          className="w-full px-1 py-1 text-sm text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2 text-sm text-center text-slate-600">
                        {formData.gst_type === 'intrastate' ? (
                          <div className="text-xs">
                            <div>C: {item.cgst_rate}%</div>
                            <div>S: {item.sgst_rate}%</div>
                          </div>
                        ) : (
                          <div>I: {item.igst_rate}%</div>
                        )}
                      </td>
                      <td className="p-2 text-sm text-right font-semibold text-slate-900">
                        ₹{item.total_amount.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-500">
                        <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                        <div className="text-sm">No items added yet</div>
                        <div className="text-xs mt-1">Search for items above or scan barcodes</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Compact Calculations */}
        <div className="w-72 bg-white border-l p-3 overflow-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-lg p-3 mb-3">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Calculator className="w-4 h-4" />
              Bill Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Subtotal</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              
              {formData.gst_type === 'intrastate' ? (
                <>
                  {totals.cgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">CGST</span>
                      <span>₹{totals.cgst.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.sgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">SGST</span>
                      <span>₹{totals.sgst.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {totals.igst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">IGST</span>
                      <span>₹{totals.igst.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between text-sm pt-2 border-t border-gray-600">
                <span className="text-gray-300">Before Discount</span>
                <span>₹{totals.beforeDiscount.toFixed(2)}</span>
              </div>
              
              {/* Discount Input */}
              <div className="pt-2 border-t border-gray-600 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-300 mb-1">Disc %</label>
                    <input
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_percentage: e.target.value,
                        discount_amount: 0 
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end pb-1 text-gray-400 text-xs">or</div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-300 mb-1">Disc ₹</label>
                    <input
                      type="number"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_amount: e.target.value,
                        discount_percentage: 0 
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Discount Applied</span>
                    <span>-₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-gray-300">Round Off</span>
                <span className={totals.roundOff >= 0 ? "text-green-400" : "text-red-400"}>
                  ₹{totals.roundOff.toFixed(2)}
                </span>
              </div>
              
              <hr className="border-gray-600 my-2" />
              
              <div className="flex justify-between text-base font-bold">
                <span>TOTAL</span>
                <span className="text-green-400">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions - Compact */}
          <div className="space-y-2 mb-3">
            <button 
              onClick={addNewLine}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs">
                <FileText className="w-3 h-3" />
                E-Invoice
              </button>
              <button className="flex items-center justify-center gap-1 px-2 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-xs">
                <Package className="w-3 h-3" />
                E-Way Bill
              </button>
            </div>
          </div>

          {/* Notes Section - Compact */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium mb-2 text-sm">Additional Info</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Internal notes..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Terms</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  rows="2"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Payment terms..."
                />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts - Compact */}
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <div className="font-medium mb-1 text-xs">Shortcuts</div>
            <div className="space-y-0.5 text-gray-600 text-xs">
              <div>F1 - Focus Vendor</div>
              <div>F2 - Focus Items</div>
              <div>Ctrl+S - Save</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillForm;
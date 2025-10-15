// src/components/purchase/GRNForm.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Users,
  FileText,
  ShoppingCart,
  Search,
  Trash2,
  Loader2,
  Package,
  Truck,
  AlertCircle
} from 'lucide-react';

const GRNForm = ({ grnId, companyId, purchaseOrderId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  // ✅ Ref to track if initialization has happened
  const initializationRef = useRef(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [grnNumber, setGrnNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    document_date: getTodayDate(),
    purchase_order_id: purchaseOrderId || '',
    delivery_note_number: '',
    transporter_name: '',
    vehicle_number: '',
    notes: '',
    status: 'received'
  });

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);

  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [showPODropdown, setShowPODropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // ✅ FIXED: Main initialization useEffect with proper guards
  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      // ✅ Prevent duplicate initialization (React Strict Mode protection)
      if (initializationRef.current) {
        console.log('⏭️ Skipping duplicate initialization (already ran)');
        return;
      }
      
      console.log('🚀 Starting GRN form initialization...');
      initializationRef.current = true;

      try {
        // Set loading state for new GRNs
        if (!grnId && isMounted) {
          setGrnNumber('Loading...');
        }

        // Fetch master data if we have a company
        if (companyId && isMounted) {
          console.log('📊 Fetching master data...');
          
          // Fetch all master data in parallel
          await Promise.all([
            fetchVendors(),
            fetchItems(),
            fetchUnits(),
            fetchPurchaseOrders()
          ]);
          
          console.log('✅ Master data loaded');
          
          // Only fetch GRN number preview for new GRNs (not editing)
          if (!grnId && isMounted) {
            console.log('🔢 Fetching GRN number preview...');
            await fetchNextGRNNumber();
          }
        }
        
        // Load existing GRN data if editing
        if (grnId && isMounted) {
          console.log('📝 Loading existing GRN...');
          await fetchGRN();
        } 
        // Load purchase order data if creating from PO
        else if (purchaseOrderId && isMounted) {
          console.log('📦 Loading purchase order data...');
          await loadPurchaseOrder(purchaseOrderId);
        }

        console.log('✅ GRN form initialization complete');
      } catch (error) {
        console.error('❌ Error during GRN form initialization:', error);
        if (isMounted && !grnId) {
          setGrnNumber('GRN-0001/25-26'); // Fallback
        }
      }
    };

    initializeForm();

    // Cleanup function
    return () => {
      isMounted = false;
      console.log('🧹 GRN form cleanup');
    };
  }, [companyId]); // ✅ Only depend on companyId

  // ✅ Separate effect for grnId changes (editing existing GRN)
  useEffect(() => {
    if (grnId && initializationRef.current) {
      console.log('📝 GRN ID changed, reloading GRN data...');
      fetchGRN();
    }
  }, [grnId]);

  // ✅ Separate effect for purchaseOrderId changes
  useEffect(() => {
    if (purchaseOrderId && !grnId && initializationRef.current) {
      console.log('📦 Purchase Order ID changed, reloading PO data...');
      loadPurchaseOrder(purchaseOrderId);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.vendor-dropdown') && !target.closest('.vendor-input')) {
        setShowVendorDropdown(false);
      }
      if (!target.closest('.po-dropdown') && !target.closest('.po-input')) {
        setShowPODropdown(false);
      }
      if (!target.closest('.item-dropdown') && !target.closest('.item-input')) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ FIXED: Fetch next GRN number as PREVIEW (doesn't increment database)
  const fetchNextGRNNumber = async () => {
    console.log('👁️ Fetching GRN number PREVIEW (will NOT increment database)...');
    
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=grn&action=preview`
        // ✅ CRITICAL: Using action=preview instead of action=next
      );
    };

    const result = await executeRequest(apiCall);
    console.log('📊 Preview API Result:', result);
    
    if (result.success && result.data?.preview) {
      console.log('✅ Setting GRN number to:', result.data.preview);
      setGrnNumber(result.data.preview);
    } else {
      console.warn('⚠️ No preview data received, using fallback');
      setGrnNumber('GRN-0001/25-26');
    }
  };

  const fetchPurchaseOrders = async () => {
    console.log('🔍 Fetching POs for company:', companyId);
    
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/purchase-orders?company_id=${companyId}&limit=100&sort_by=document_date&sort_order=desc`
      );
    };

    const result = await executeRequest(apiCall);
    console.log('📦 PO API Response:', result);
    
    if (result.success) {
      const allPOs = result.data || [];
      console.log('📊 Total POs fetched:', allPOs.length);
      
      const availablePOs = allPOs.filter(po => 
        po.status !== 'draft' && po.status !== 'cancelled' && po.status !== 'received'
      );
      
      console.log('✅ Available POs for GRN:', availablePOs.length);
      setPurchaseOrders(availablePOs);
    } else {
      console.error('❌ Failed to fetch POs:', result.error);
      showError('Failed to fetch purchase orders');
    }
  };

  const loadPurchaseOrder = async (poId) => {
    console.log('📥 Loading PO:', poId);
    
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/purchase-orders/${poId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const po = result.data;
      console.log('✅ PO loaded:', po);
      
      setSelectedPO(po);
      setPoSearch(po.document_number);
      
      setFormData(prev => ({
        ...prev,
        vendor_id: po.vendor_id,
        purchase_order_id: po.id,
        notes: po.notes || ''
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
        ordered_quantity: item.quantity,
        received_quantity: item.quantity,
        unit_id: item.unit_id,
        unit_name: item.unit_name,
        hsn_sac_code: item.hsn_sac_code || ''
      })) || [];

      console.log('📦 Converted items:', convertedItems.length);
      setItems(convertedItems);
    } else {
      console.error('❌ Failed to load PO:', result.error);
      showError('Failed to load purchase order');
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

  const fetchGRN = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/grn/${grnId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const grn = result.data;
      setGrnNumber(grn.document_number);
      setFormData({
        vendor_id: grn.vendor_id,
        document_date: grn.document_date,
        purchase_order_id: grn.parent_document_id || '',
        delivery_note_number: grn.delivery_note_number || '',
        transporter_name: grn.transporter_name || '',
        vehicle_number: grn.vehicle_number || '',
        notes: grn.notes || '',
        status: grn.status
      });
      setItems(grn.items || []);
      
      if (grn.vendor) {
        setSelectedVendor(grn.vendor);
        setVendorSearch(grn.vendor.vendor_name);
      }
      
      if (grn.parent_document_id) {
        loadPurchaseOrder(grn.parent_document_id);
      }
    }
  };

  const handleVendorSelect = (vendor) => {
    console.log('👤 Vendor selected:', vendor.vendor_name);
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
    
    const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendor.id);
    console.log('📋 POs for vendor:', vendorPOs.length);
    if (vendorPOs.length > 0 && !formData.purchase_order_id) {
      setPoSearch('');
      setShowPODropdown(true);
    }
  };

  const handlePOSelect = (po) => {
    console.log('📄 PO selected:', po.document_number);
    loadPurchaseOrder(po.id);
    setShowPODropdown(false);
  };

  const handlePOClear = () => {
    console.log('🗑️ Clearing PO selection');
    setSelectedPO(null);
    setPoSearch('');
    setFormData(prev => ({ ...prev, purchase_order_id: '' }));
    setItems([]);
  };

  const handleItemSelect = (item) => {
    const unit = units.find(u => u.id === item.primary_unit_id);

    const newItem = {
      id: Date.now(),
      item_id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      ordered_quantity: 0,
      received_quantity: 1,
      unit_id: item.primary_unit_id,
      unit_name: unit?.unit_name || '',
      hsn_sac_code: item.hsn_sac_code || ''
    };

    setItems(prev => [...prev, newItem]);
    setItemSearch('');
    setShowItemDropdown(false);
  };

  const removeLine = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const parsedValue = field === 'received_quantity' 
        ? parseFloat(value) || 0 
        : value;
      
      newItems[index] = { ...newItems[index], [field]: parsedValue };
      return newItems;
    });
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

    const invalidItems = items.filter(item => !item.item_id || item.received_quantity <= 0);
    if (invalidItems.length > 0) {
      showError('Please fill all item details correctly');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    console.log('🔍 FormData state before submission:', formData);

    const payload = {
      company_id: companyId,
      vendor_id: formData.vendor_id,
      document_date: formData.document_date,
      purchase_order_id: formData.purchase_order_id || null,
      delivery_note_number: formData.delivery_note_number || '',
      transporter_name: formData.transporter_name || '',
      vehicle_number: formData.vehicle_number || '',
      notes: formData.notes || '',
      status: formData.status || 'received',
      items
    };
    
    console.log('🚀 Submitting GRN with payload:', JSON.stringify(payload, null, 2));

    const apiCall = async () => {
      const url = grnId ? `/api/purchase/grn/${grnId}` : '/api/purchase/grn';
      const method = grnId ? 'PUT' : 'POST';

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
    };

    const result = await executeRequest(apiCall);
    console.log('📥 API Response:', result);

    if (result.success) {
      success(grnId ? 'GRN updated successfully' : 'GRN created successfully');
      setTimeout(() => {
        router.push('/purchase/grn');
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

  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.document_number.toLowerCase().includes(poSearch.toLowerCase());
    const matchesVendor = !formData.vendor_id || po.vendor_id === formData.vendor_id;
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/purchase/grn')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                GRN Number: <span className="text-blue-600">#{grnNumber}</span>
              </h1>
              <p className="text-xs text-gray-500">Goods Receipt Note</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSubmit}
              disabled={loading || !formData.vendor_id || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save GRN
            </button>
            
            <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Row - Vendor, PO Selection, GRN Details */}
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
                  Search Vendor <span className="text-red-500">*</span>
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
                  disabled={!!formData.purchase_order_id}
                />
                {showVendorDropdown && filteredVendors.length > 0 && !formData.purchase_order_id && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-xl vendor-dropdown">
                    {filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => handleVendorSelect(vendor)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{vendor.vendor_name}</div>
                        <div className="text-xs text-gray-500">{vendor.vendor_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedVendor && (
                <div className="space-y-2 flex-shrink-0 overflow-y-auto max-h-48">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900 mb-0.5">{selectedVendor.vendor_name}</div>
                    {selectedVendor.billing_address && (
                      <>
                        <div>{selectedVendor.billing_address.address_line1}</div>
                        {selectedVendor.billing_address.city && (
                          <div>
                            {selectedVendor.billing_address.city}
                            {selectedVendor.billing_address.state && `, ${selectedVendor.billing_address.state}`}
                            {selectedVendor.billing_address.pincode && ` - ${selectedVendor.billing_address.pincode}`}
                          </div>
                        )}
                      </>
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

          {/* Purchase Order Selection */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-50 rounded-lg">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Purchase Order (Optional)</h3>
              </div>
              
              <div className="relative po-input mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search PO Number
                </label>
                <input
                  type="text"
                  placeholder="Search purchase order..."
                  value={poSearch}
                  onChange={(e) => {
                    setPoSearch(e.target.value);
                    setShowPODropdown(true);
                  }}
                  onFocus={() => {
                    if (formData.vendor_id) {
                      setShowPODropdown(true);
                    }
                  }}
                  disabled={!formData.vendor_id}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {showPODropdown && filteredPOs.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-64 overflow-auto shadow-xl po-dropdown">
                    {filteredPOs.map((po) => (
                      <div
                        key={po.id}
                        onClick={() => handlePOSelect(po)}
                        className="p-2.5 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{po.document_number}</div>
                        <div className="text-xs text-gray-500">
                          {po.vendor_name || po.vendor?.vendor_name} • {new Date(po.document_date).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-xs text-purple-600 mt-0.5 flex items-center gap-2">
                          <span>{po.items?.length || 0} items</span>
                          <span>•</span>
                          <span>₹{po.total_amount?.toLocaleString('en-IN') || '0'}</span>
                          <span className="ml-auto">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              po.status === 'approved' ? 'bg-green-100 text-green-800' :
                              po.status === 'partially_received' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {po.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!formData.vendor_id && (
                  <p className="text-xs text-gray-500 mt-1">Select a vendor first to view POs</p>
                )}
                {formData.vendor_id && filteredPOs.length === 0 && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>No purchase orders found for this vendor</span>
                  </div>
                )}
              </div>
              
              {selectedPO && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-purple-900">PO: {selectedPO.document_number}</div>
                      <button
                        onClick={handlePOClear}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-purple-700">Date: {new Date(selectedPO.document_date).toLocaleDateString('en-IN')}</div>
                    <div className="text-purple-700">Items: {selectedPO.items?.length || 0}</div>
                    <div className="text-purple-700 font-semibold">Amount: ₹{selectedPO.total_amount?.toLocaleString('en-IN') || '0'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GRN Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <Truck className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Receipt Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Receipt Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.document_date}
                    onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Delivery Note No.
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_note_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Delivery note #"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, transporter_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Transporter"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Vehicle #"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm" style={{ overflow: 'visible' }}>
          <div className="p-3 border-b border-gray-200" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Items Received ({items.length})
                </h3>
              </div>
              
              {!formData.purchase_order_id && (
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
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-10">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-32">HSN/SAC</th>
                  {formData.purchase_order_id && (
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Ordered</th>
                  )}
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Received</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Unit</th>
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
                          <div className="text-xs text-gray-500">Code: {item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.hsn_sac_code}
                          onChange={(e) => handleItemChange(index, 'hsn_sac_code', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="HSN/SAC"
                        />
                      </td>
                      {formData.purchase_order_id && (
                        <td className="px-3 py-2 text-sm text-center text-gray-600 font-medium">
                          {item.ordered_quantity || 0}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.received_quantity}
                          onChange={(e) => handleItemChange(index, 'received_quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-gray-600 font-medium">{item.unit_name || '-'}</td>
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
                    <td colSpan={formData.purchase_order_id ? 7 : 6} className="px-3 py-12 text-center">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <div className="text-base text-gray-500 font-medium mb-1">No items added yet</div>
                      <div className="text-sm text-gray-400">
                        {formData.purchase_order_id 
                          ? 'Items will be loaded from the purchase order' 
                          : 'Search for items above or press F2 to start adding items'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Internal notes about this receipt..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRNForm;
// src/components/purchase/GRNForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import Badge from '../shared/ui/Badge';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const GRNForm = ({ grnId, companyId, purchaseOrderId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [grnNumber, setGrnNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    document_date: new Date().toISOString().split('T')[0],
    purchase_order_id: purchaseOrderId || null,
    delivery_note_number: '',
    transporter_name: '',
    vehicle_number: '',
    notes: '',
    status: 'received'
  });

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [itemSearchIndex, setItemSearchIndex] = useState(null);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (!grnId) {
      setGrnNumber('Loading...');
    }

    if (companyId) {
      fetchVendors();
      fetchItems();
      fetchUnits();
      
      if (!grnId) {
        fetchNextGRNNumber();
      }
    }
    
    if (grnId) {
      fetchGRN();
    } else if (purchaseOrderId) {
      loadPurchaseOrder();
    } else {
      addNewLine();
    }

    return () => {
      if (!grnId) {
        setGrnNumber('Loading...');
      }
    };
  }, [grnId, companyId, purchaseOrderId, router.asPath]);

  const fetchNextGRNNumber = async () => {
    console.log('🔍 Fetching next GRN number...');
    
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=grn&action=next`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data?.next_number) {
      setGrnNumber(result.data.next_number);
      console.log('✅ Fetched GRN number:', result.data.next_number);
    } else {
      setGrnNumber('GRN-0001');
      console.warn('⚠️ Failed to fetch GRN number, using default');
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
        purchase_order_id: grn.parent_document_id,
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
      ordered_quantity: 0,
      received_quantity: 0,
      unit_id: '',
      unit_name: '',
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

      newItems[index] = {
        ...newItems[index],
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        unit_id: item.primary_unit_id,
        unit_name: unit?.unit_name || '',
        hsn_sac_code: item.hsn_sac_code || ''
      };

      return newItems;
    });
    setItemSearchIndex(null);
    setItemSearch('');
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const parsedValue = ['received_quantity', 'ordered_quantity'].includes(field) 
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

    const apiCall = async () => {
      const url = grnId ? `/api/purchase/grn/${grnId}` : '/api/purchase/grn';
      const method = grnId ? 'PUT' : 'POST';

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
      success(grnId ? 'GRN updated successfully' : 'GRN created successfully');
      router.push('/purchase/grn');
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* GRN Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {grnId ? 'Edit Goods Receipt Note' : 'New Goods Receipt Note'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              GRN Number: <span className="font-semibold text-blue-600">{grnNumber}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendor Selection */}
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
              label="Receipt Date"
              value={formData.document_date}
              onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Note No.</label>
            <Input
              value={formData.delivery_note_number}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))}
              placeholder="Enter delivery note number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Transporter Name</label>
            <Input
              value={formData.transporter_name}
              onChange={(e) => setFormData(prev => ({ ...prev, transporter_name: e.target.value }))}
              placeholder="Enter transporter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Number</label>
            <Input
              value={formData.vehicle_number}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
              placeholder="Enter vehicle number"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Items Received</h3>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">HSN/SAC</th>
                {formData.purchase_order_id && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-24">Ordered</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-24">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">Unit</th>
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
                      type="text"
                      value={item.hsn_sac_code}
                      onChange={(e) => handleItemChange(index, 'hsn_sac_code', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="HSN/SAC"
                    />
                  </td>
                  {formData.purchase_order_id && (
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {item.ordered_quantity || 0}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.received_quantity}
                      onChange={(e) => handleItemChange(index, 'received_quantity', e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.unit_name || '-'}</td>
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
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Information</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Internal notes about this receipt..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/purchase/grn')}
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
          {loading ? 'Saving...' : grnId ? 'Update GRN' : 'Create GRN'}
        </Button>
      </div>
    </form>
  );
};

export default GRNForm;
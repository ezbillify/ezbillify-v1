// src/components/purchase/PurchaseReturnForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import DatePicker from '../shared/calendar/DatePicker';

const PurchaseReturnForm = ({ companyId, returnId = null }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { branches, selectedBranch, selectBranch } = useBranch();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [returnNumber, setReturnNumber] = useState('Select Branch...');
  const [returnBranch, setReturnBranch] = useState(null);

  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_id: '',
    document_date: new Date().toISOString().split('T')[0],
    return_reason: '',
    notes: ''
    // status removed as per requirement to simplify workflow
  });

  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [returnItems, setReturnItems] = useState([]);

  useEffect(() => {
    if (companyId) {
      fetchVendors();
    }
  }, [companyId]);

  useEffect(() => {
    if (formData.vendor_id) {
      fetchVendorBills(formData.vendor_id);
    }
  }, [formData.vendor_id]);

  useEffect(() => {
    if (formData.bill_id) {
      fetchBillDetails(formData.bill_id);
    }
  }, [formData.bill_id]);

  const fetchVendors = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors?company_id=${companyId}&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendors(result.data || []);
    }
  };

  const fetchVendorBills = async (vendorId) => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&status=received&limit=100`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBills(result.data || []);
    }
  };

  const fetchBillDetails = async (billId) => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/bills/${billId}?company_id=${companyId}`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setSelectedBill(result.data);
      
      console.log('📋 Bill Items:', result.data.items); // DEBUG
      
      // Initialize return items from bill items
      const items = result.data.items.map(item => {
        console.log(`   Item: ${item.item_name}, Discount: ${item.discount_percentage}%`); // DEBUG
        
        return {
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          received_quantity: item.quantity,
          return_quantity: 0,
          rate: parseFloat(item.rate) || 0,
          unit_name: item.unit_name,
          discount_percentage: parseFloat(item.discount_percentage) || 0, // ✅ ENSURE NUMBER
          cgst_rate: parseFloat(item.cgst_rate) || 0,
          sgst_rate: parseFloat(item.sgst_rate) || 0,
          igst_rate: parseFloat(item.igst_rate) || 0,
          hsn_sac_code: item.hsn_sac_code
        };
      });
      
      console.log('✅ Return Items with Discounts:', items); // DEBUG
      setReturnItems(items);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReturnQuantityChange = (index, value) => {
    const updatedItems = [...returnItems];
    const numValue = parseFloat(value) || 0;
    
    // Validate not more than received
    if (numValue > updatedItems[index].received_quantity) {
      showError(`Cannot return more than received quantity (${updatedItems[index].received_quantity})`);
      return;
    }
    
    updatedItems[index].return_quantity = numValue;
    setReturnItems(updatedItems);
  };

  // 🔥 CORRECT CALCULATION - Same as API
  const calculateItemTotal = (item) => {
    const lineAmount = item.return_quantity * item.rate;
    const discountAmount = (lineAmount * item.discount_percentage) / 100;
    const taxableAmount = lineAmount - discountAmount;
    
    const cgst = (taxableAmount * item.cgst_rate) / 100;
    const sgst = (taxableAmount * item.sgst_rate) / 100;
    const igst = (taxableAmount * item.igst_rate) / 100;
    
    return taxableAmount + cgst + sgst + igst;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    returnItems.forEach(item => {
      if (item.return_quantity > 0) {
        const lineAmount = item.return_quantity * item.rate;
        const discountAmount = (lineAmount * item.discount_percentage) / 100;
        const taxableAmount = lineAmount - discountAmount;
        
        const cgst = (taxableAmount * item.cgst_rate) / 100;
        const sgst = (taxableAmount * item.sgst_rate) / 100;
        const igst = (taxableAmount * item.igst_rate) / 100;
        
        totalDiscount += discountAmount;
        subtotal += taxableAmount;
        totalTax += (cgst + sgst + igst);
      }
    });
    
    return {
      subtotal,
      totalDiscount,
      totalTax,
      total: subtotal + totalTax
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.vendor_id || !formData.bill_id) {
      showError('Please select vendor and bill');
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
    
    if (itemsToReturn.length === 0) {
      showError('Please specify at least one item to return');
      return;
    }

    const payload = {
      company_id: companyId,
      vendor_id: formData.vendor_id,
      bill_id: formData.bill_id,
      document_date: formData.document_date,
      return_reason: formData.return_reason,
      notes: formData.notes,
      // status removed as per requirement to simplify workflow
      items: itemsToReturn.map(item => ({
        item_id: item.item_id,
        item_code: item.item_code,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.return_quantity
      }))
    };

    const apiCall = async () => {
      return await authenticatedFetch('/api/purchase/returns', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Debit note created successfully');
      router.push(`/purchase/returns/${result.data.id}`);
    }
  };

  const totals = calculateTotals();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const returnReasonOptions = [
    { value: '', label: 'Select Reason' },
    { value: 'damaged', label: 'Damaged Goods' },
    { value: 'defective', label: 'Defective/Not Working' },
    { value: 'wrong_item', label: 'Wrong Item Received' },
    { value: 'excess_quantity', label: 'Excess Quantity' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'expired', label: 'Expired Products' },
    { value: 'not_as_described', label: 'Not As Described' },
    { value: 'duplicate', label: 'Duplicate Delivery' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">
          Create Purchase Return (Debit Note)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vendor <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.vendor_id}
              onChange={(value) => {
                handleInputChange('vendor_id', value);
                handleInputChange('bill_id', '');
                setSelectedBill(null);
                setReturnItems([]);
              }}
              options={[
                { value: '', label: 'Select Vendor' },
                ...vendors.map(v => ({
                  value: v.id,
                  label: `${v.vendor_name} ${v.vendor_code ? `(${v.vendor_code})` : ''}`
                }))
              ]}
              required
            />
          </div>

          {/* Bill Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bill <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.bill_id}
              onChange={(value) => handleInputChange('bill_id', value)}
              options={[
                { value: '', label: 'Select Bill' },
                ...bills.map(b => ({
                  value: b.id,
                  label: `${b.document_number} - ${formatCurrency(b.total_amount)}`
                }))
              ]}
              disabled={!formData.vendor_id}
              required
            />
            {selectedBill && (
              <p className="mt-2 text-sm text-slate-600">
                Bill Date: {new Date(selectedBill.document_date).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>

          {/* Return Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Return Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={formData.document_date}
              onChange={(date) => handleInputChange('document_date', date)}
              required
            />
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Return Reason <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.return_reason}
              onChange={(value) => handleInputChange('return_reason', value)}
              options={returnReasonOptions}
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes about the return..."
          />
        </div>
      </div>

      {/* Return Items */}
      {selectedBill && returnItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Return Items</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Received Qty
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Return Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Tax
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {returnItems.map((item, index) => {
                  const lineAmount = item.return_quantity * item.rate;
                  const discountAmount = (lineAmount * item.discount_percentage) / 100;
                  
                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                        <div className="text-xs text-slate-500">{item.item_code}</div>
                        {item.hsn_sac_code && (
                          <div className="text-xs text-slate-500">HSN: {item.hsn_sac_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-sm text-slate-900">
                          {item.received_quantity} {item.unit_name}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max={item.received_quantity}
                          step="0.01"
                          value={item.return_quantity}
                          onChange={(e) => handleReturnQuantityChange(index, e.target.value)}
                          className="w-24 px-2 py-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm text-slate-900">
                          {formatCurrency(item.rate)}
                        </div>
                        {item.return_quantity > 0 && item.discount_percentage === 0 && (
                          <div className="text-xs text-slate-500">
                            = {formatCurrency(lineAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.discount_percentage > 0 ? (
                          <div>
                            <div className="text-sm font-medium text-orange-600">
                              {item.discount_percentage}%
                            </div>
                            {item.return_quantity > 0 && (
                              <div className="text-xs text-slate-500">
                                -{formatCurrency(discountAmount)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-slate-600">
                        {item.cgst_rate > 0 && `C: ${item.cgst_rate}%`}
                        {item.sgst_rate > 0 && ` S: ${item.sgst_rate}%`}
                        {item.igst_rate > 0 && `I: ${item.igst_rate}%`}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">
                        {item.return_quantity > 0 ? formatCurrency(calculateItemTotal(item)) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2">
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Discount:</span>
                  <span className="font-medium text-orange-600">-{formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Tax:</span>
                <span className="font-medium text-slate-900">{formatCurrency(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-2">
                <span className="text-slate-800">Return Amount:</span>
                <span className="text-orange-600">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            disabled={loading || !formData.bill_id || returnItems.filter(i => i.return_quantity > 0).length === 0}
            onClick={(e) => {
              e.preventDefault();
              handleInputChange('status', 'draft');
              setTimeout(() => handleSubmit(e), 0);
            }}
          >
            Save as Draft
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.bill_id || returnItems.filter(i => i.return_quantity > 0).length === 0}
            onClick={(e) => {
              e.preventDefault();
              handleInputChange('status', 'processed');
              setTimeout(() => handleSubmit(e), 0);
            }}
          >
            {loading ? 'Creating...' : 'Create & Process'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PurchaseReturnForm;
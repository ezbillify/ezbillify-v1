// src/components/purchase/PurchaseOrderView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const PurchaseOrderView = ({ poId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [purchaseOrder, setPurchaseOrder] = useState(null);

  useEffect(() => {
    if (poId && companyId) {
      fetchPurchaseOrder();
    }
  }, [poId, companyId]);

  const fetchPurchaseOrder = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/purchase-orders/${poId}?company_id=${companyId}`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setPurchaseOrder(result.data);
    } else {
      showError('Failed to load purchase order');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      sent: 'info',
      approved: 'success',
      rejected: 'error',
      closed: 'warning'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-800">Purchase order not found</h3>
        <p className="text-slate-600 mt-2">The purchase order you're looking for doesn't exist.</p>
        <Button
          className="mt-4"
          onClick={() => router.push('/purchase/purchase-orders')}
        >
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {purchaseOrder.document_number}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Date: {formatDate(purchaseOrder.document_date)}
              {purchaseOrder.due_date && ` • Due: ${formatDate(purchaseOrder.due_date)}`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(purchaseOrder.status)}
            <Button
              variant="primary"
              onClick={() => router.push(`/purchase/purchase-orders/${poId}/edit`)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Vendor Details</h3>
            <p className="text-base font-medium text-slate-900">{purchaseOrder.vendor_name}</p>
            {purchaseOrder.vendor?.vendor_code && (
              <p className="text-sm text-slate-600">Code: {purchaseOrder.vendor.vendor_code}</p>
            )}
            {purchaseOrder.vendor?.email && (
              <p className="text-sm text-slate-600">Email: {purchaseOrder.vendor.email}</p>
            )}
            {purchaseOrder.vendor?.phone && (
              <p className="text-sm text-slate-600">Phone: {purchaseOrder.vendor.phone}</p>
            )}
            {purchaseOrder.vendor_gstin && (
              <p className="text-sm text-slate-600">GSTIN: {purchaseOrder.vendor_gstin}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Billing Address</h3>
            {purchaseOrder.billing_address && Object.keys(purchaseOrder.billing_address).length > 0 ? (
              <div className="text-sm text-slate-600 space-y-1">
                {purchaseOrder.billing_address.address_line1 && <p>{purchaseOrder.billing_address.address_line1}</p>}
                {purchaseOrder.billing_address.address_line2 && <p>{purchaseOrder.billing_address.address_line2}</p>}
                {purchaseOrder.billing_address.city && purchaseOrder.billing_address.state && (
                  <p>{purchaseOrder.billing_address.city}, {purchaseOrder.billing_address.state}</p>
                )}
                {purchaseOrder.billing_address.pincode && <p>{purchaseOrder.billing_address.pincode}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No billing address</p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Items</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">HSN/SAC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Taxable</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {purchaseOrder.items?.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-slate-900">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                    <div className="text-xs text-slate-500">{item.item_code}</div>
                    {item.description && (
                      <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.hsn_sac_code || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {item.quantity} {item.unit_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {formatCurrency(item.taxable_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {item.cgst_rate > 0 && <div>CGST: {item.cgst_rate}%</div>}
                    {item.sgst_rate > 0 && <div>SGST: {item.sgst_rate}%</div>}
                    {item.igst_rate > 0 && <div>IGST: {item.igst_rate}%</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    {formatCurrency(item.total_amount)}
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
              <span className="font-medium">{formatCurrency(purchaseOrder.subtotal)}</span>
            </div>
            
            {purchaseOrder.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(purchaseOrder.discount_amount)}</span>
              </div>
            )}

            {purchaseOrder.cgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">CGST:</span>
                <span className="font-medium">{formatCurrency(purchaseOrder.cgst_amount)}</span>
              </div>
            )}

            {purchaseOrder.sgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">SGST:</span>
                <span className="font-medium">{formatCurrency(purchaseOrder.sgst_amount)}</span>
              </div>
            )}

            {purchaseOrder.igst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span className="font-medium">{formatCurrency(purchaseOrder.igst_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-blue-600">{formatCurrency(purchaseOrder.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(purchaseOrder.notes || purchaseOrder.terms_conditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {purchaseOrder.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{purchaseOrder.notes}</p>
            </div>
          )}

          {purchaseOrder.terms_conditions && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Terms & Conditions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{purchaseOrder.terms_conditions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderView;
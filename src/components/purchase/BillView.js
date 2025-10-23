// src/components/purchase/BillView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';

const BillView = ({ billId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  
  const [bill, setBill] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (billId && companyId) {
      fetchBill();
    }
  }, [billId, companyId]);

  const fetchBill = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBill(result.data);
    } else {
      showError('Failed to load bill');
    }
  };

  const handleDelete = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Bill deleted successfully');
      router.push('/purchase/bills');
    }
    setShowDeleteDialog(false);
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
      received: 'success',
      approved: 'info',
      rejected: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const variants = {
      unpaid: 'error',
      partially_paid: 'warning',
      paid: 'success',
      overdue: 'error'
    };
    return <Badge variant={variants[paymentStatus] || 'default'}>{paymentStatus === 'partially_paid' ? 'partial' : paymentStatus}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">Bill not found</h3>
          <div className="mt-6">
            <Button variant="primary" onClick={() => router.push('/purchase/bills')}>
              Back to Bills
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const canDelete = bill.status === 'draft' || (bill.status === 'received' && bill.paid_amount === 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Bill #{bill.document_number}</h2>
            {bill.branch && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-900">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {bill.branch.name || bill.branch.branch_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(bill.status)}
              {getPaymentStatusBadge(bill.payment_status)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/purchase/bills/${billId}/edit`)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Edit
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              }
            >
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Bill Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Vendor Details</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600">Vendor Name</div>
              <div className="text-base font-semibold text-slate-900">{bill.vendor?.vendor_name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Vendor Code</div>
              <div className="text-base font-semibold text-slate-900">{bill.vendor?.vendor_code}</div>
            </div>
            {bill.vendor?.email && (
              <div>
                <div className="text-sm text-slate-600">Email</div>
                <div className="text-base text-slate-900">{bill.vendor.email}</div>
              </div>
            )}
            {bill.vendor?.phone && (
              <div>
                <div className="text-sm text-slate-600">Phone</div>
                <div className="text-base text-slate-900">{bill.vendor.phone}</div>
              </div>
            )}
            {bill.vendor_gstin && (
              <div>
                <div className="text-sm text-slate-600">GSTIN</div>
                <div className="text-base font-mono text-slate-900">{bill.vendor_gstin}</div>
              </div>
            )}
          </div>
        </div>

        {/* Bill Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Bill Information</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600">Bill Date</div>
              <div className="text-base font-semibold text-slate-900">{formatDate(bill.document_date)}</div>
            </div>
            {bill.due_date && (
              <div>
                <div className="text-sm text-slate-600">Due Date</div>
                <div className="text-base font-semibold text-slate-900">{formatDate(bill.due_date)}</div>
              </div>
            )}
            {bill.vendor_invoice_number && (
              <div>
                <div className="text-sm text-slate-600">Vendor Invoice Number</div>
                <div className="text-base font-semibold text-slate-900">{bill.vendor_invoice_number}</div>
              </div>
            )}
            {bill.parent_document_id && (
              <div>
                <div className="text-sm text-slate-600">Reference PO</div>
                <div className="text-base text-blue-600">Linked to Purchase Order</div>
              </div>
            )}
            <div>
              <div className="text-sm text-slate-600">Created On</div>
              <div className="text-base text-slate-900">{formatDate(bill.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Line Items ({bill.items?.length || 0})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Disc%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Taxable</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bill.items?.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.item_name}</div>
                    <div className="text-xs text-slate-500">{item.item_code}</div>
                    {item.hsn_sac_code && (
                      <div className="text-xs text-slate-400">HSN: {item.hsn_sac_code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit_name || '-'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 text-right">{item.discount_percentage || 0}%</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.taxable_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {item.cgst_rate > 0 && <div>C: {item.cgst_rate}%</div>}
                    {item.sgst_rate > 0 && <div>S: {item.sgst_rate}%</div>}
                    {item.igst_rate > 0 && <div>I: {item.igst_rate}%</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-6 flex justify-end">
          <div className="w-96 space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span className="font-semibold">-{formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            {bill.cgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">CGST:</span>
                <span className="font-semibold">{formatCurrency(bill.cgst_amount)}</span>
              </div>
            )}
            {bill.sgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">SGST:</span>
                <span className="font-semibold">{formatCurrency(bill.sgst_amount)}</span>
              </div>
            )}
            {bill.igst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span className="font-semibold">{formatCurrency(bill.igst_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-slate-200">
              <span>Grand Total:</span>
              <span className="text-orange-600">{formatCurrency(bill.total_amount)}</span>
            </div>
            {bill.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600 pt-2 border-t border-slate-200">
                  <span>Paid Amount:</span>
                  <span className="font-semibold">{formatCurrency(bill.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(bill.balance_amount)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(bill.notes || bill.terms_conditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bill.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Notes</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{bill.notes}</p>
            </div>
          )}
          {bill.terms_conditions && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Terms & Conditions</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{bill.terms_conditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete Bill "${bill.document_number}"? This will reverse inventory and vendor balance updates. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default BillView;
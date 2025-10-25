// src/components/purchase/PurchaseReturnView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';

const PurchaseReturnView = ({ companyId, returnId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [debitNote, setDebitNote] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (companyId && returnId) {
      fetchDebitNote();
    }
  }, [companyId, returnId]);

  const fetchDebitNote = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/returns/${returnId}?company_id=${companyId}`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setDebitNote(result.data);
    }
  };

  const handleDelete = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns/${returnId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Debit note deleted successfully');
      router.push('/purchase/returns');
    }
  };

  const handlePrint = () => {
    window.print();
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

  // Status badge function removed as per requirement to simplify workflow

  if (loading && !debitNote) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!debitNote) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Debit note not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          }
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
          >
            Print
          </Button>

          {/* Status check removed as per requirement to simplify workflow */}
          <Button
            variant="secondary"
            onClick={() => router.push(`/purchase/returns/${returnId}/edit`)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit
          </Button>

          <Button
            variant="error"
            onClick={() => setShowDeleteDialog(true)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Debit Note Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-8 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Debit Note
            </h1>
            <p className="text-lg text-slate-600">{debitNote.document_number}</p>
            {debitNote.branch && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-900">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {debitNote.branch.name || debitNote.branch.branch_name}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            {/* Status badge removed as per requirement to simplify workflow */}
            <p className="text-sm text-slate-600 mt-2">
              Date: {formatDate(debitNote.document_date)}
            </p>
          </div>
        </div>

        {/* Vendor & Bill Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Vendor Details</h3>
            <div className="space-y-2">
              <p className="text-base font-medium text-slate-900">{debitNote.vendor_name}</p>
              {debitNote.vendor?.vendor_code && (
                <p className="text-sm text-slate-600">Code: {debitNote.vendor.vendor_code}</p>
              )}
              {debitNote.vendor_gstin && (
                <p className="text-sm text-slate-600">GSTIN: {debitNote.vendor_gstin}</p>
              )}
              {debitNote.vendor?.email && (
                <p className="text-sm text-slate-600">Email: {debitNote.vendor.email}</p>
              )}
              {debitNote.vendor?.phone && (
                <p className="text-sm text-slate-600">Phone: {debitNote.vendor.phone}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Original Bill</h3>
            <div className="space-y-2">
              {debitNote.bill && (
                <>
                  <p className="text-base font-medium text-slate-900">
                    {debitNote.bill.document_number}
                  </p>
                  <p className="text-sm text-slate-600">
                    Date: {formatDate(debitNote.bill.document_date)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Amount: {formatCurrency(debitNote.bill.total_amount)}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/purchase/bills/${debitNote.parent_document_id}`)}
                  >
                    View Bill
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Return Reason */}
        {debitNote.return_reason && (
          <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm font-semibold text-orange-800 mb-1">Return Reason:</p>
            <p className="text-sm text-orange-700 capitalize">
              {debitNote.return_reason.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4">Returned Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
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
                {debitNote.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                      <div className="text-xs text-slate-500">{item.item_code}</div>
                      {item.hsn_sac_code && (
                        <div className="text-xs text-slate-500">HSN: {item.hsn_sac_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-900">
                      {item.quantity} {item.unit_name}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-900">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-600">
                      {item.discount_percentage > 0 
                        ? `${item.discount_percentage}%` 
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-600">
                      {formatCurrency(item.cgst_amount + item.sgst_amount + item.igst_amount)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(debitNote.subtotal)}
              </span>
            </div>
            
            {debitNote.cgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">CGST:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(debitNote.cgst_amount)}
                </span>
              </div>
            )}
            
            {debitNote.sgst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">SGST:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(debitNote.sgst_amount)}
                </span>
              </div>
            )}
            
            {debitNote.igst_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(debitNote.igst_amount)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-3">
              <span className="text-slate-800">Total Return Amount:</span>
              <span className="text-orange-600">
                {formatCurrency(debitNote.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {debitNote.notes && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-2">Notes</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{debitNote.notes}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Debit Note"
        message={`Are you sure you want to delete Debit Note "${debitNote.document_number}"? This will reverse all inventory and vendor balance changes. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
      />
    </div>
  );
};

export default PurchaseReturnView;
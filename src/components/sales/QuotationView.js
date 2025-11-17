// src/components/sales/QuotationView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import PrintButton from '../shared/print/PrintButton';
import { 
  ArrowLeft, 
  Edit, 
  Printer, 
  Send, 
  FileText,
  Calendar,
  User,
  Hash,
  IndianRupee,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const QuotationView = ({ quotationId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  
  const [quotation, setQuotation] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (quotationId && companyId) {
      fetchQuotation();
    }
  }, [quotationId, companyId]);

  const fetchQuotation = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/quotations/${quotationId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setQuotation(result.data);
    } else {
      showError('Failed to load quotation');
    }
  };

  const handleDelete = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/quotations/${quotationId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Quotation deleted successfully');
      router.push('/sales/quotations');
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

  // Status badge function removed as per requirement to simplify workflow

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">Quotation not found</h3>
          <div className="mt-6">
            <Button variant="primary" onClick={() => router.push('/sales/quotations')}>
              Back to Quotations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // canDelete logic removed as per requirement to simplify workflow
  const canDelete = true;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Quotation #{quotation.document_number}</h2>
            {quotation.branch && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-900">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {quotation.branch.name || quotation.branch.branch_name}
                </span>
              </div>
            )}
            {/* Status badge removed as per requirement to simplify workflow */}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/sales/quotations/new?id=${quotationId}`)}
              icon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
                icon={<XCircle className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
            <PrintButton
              documentData={{
                ...quotation,
                
                // COMPANY DETAILS
                company: quotation.company,
                
                // BRANCH DETAILS
                branch: quotation.branch,
                
                // CUSTOMER DETAILS
                customer: quotation.customer,
                
                // ITEMS DETAILS
                items: quotation.items,
                
                // BANK ACCOUNT (settings or company)
                bank_account: quotation.company?.settings?.bank_account || quotation.company?.bank_account || null,
                
                // IMPORTANT FIELDS
                document_number: quotation.document_number,
                document_date: quotation.document_date,
                valid_until: quotation.valid_until,
                gst_type: quotation.gst_type,
                
                // Total & tax
                subtotal: quotation.subtotal,
                cgst_amount: quotation.cgst_amount,
                sgst_amount: quotation.sgst_amount,
                igst_amount: quotation.igst_amount,
                discount_amount: quotation.discount_amount,
                total_amount: quotation.total_amount,
                
                // Customer extra (fallbacks)
                customer_name: quotation.customer?.name,
                customer_phone: quotation.customer?.phone,
                customer_gstin: quotation.customer?.gstin,
                customer_address: quotation.customer?.billing_address,
              }}
              documentType="quotation"
              filename={`quotation-${quotation.document_number}.pdf`}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Send className="w-4 h-4" />}
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Customer Details
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600">Customer Name</div>
              <div className="text-sm font-medium text-slate-900">
                {quotation.customer?.name}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Customer Code</div>
              <div className="text-sm text-slate-900">{quotation.customer?.customer_code}</div>
            </div>
            {quotation.customer?.gstin && (
              <div>
                <div className="text-sm text-slate-600">GSTIN</div>
                <div className="text-sm font-mono text-blue-600">{quotation.customer?.gstin}</div>
              </div>
            )}
            {quotation.customer?.billing_address && (
              <div>
                <div className="text-sm text-slate-600">Billing Address</div>
                <div className="text-sm text-slate-900">
                  {quotation.customer?.billing_address.address_line1}<br />
                  {quotation.customer?.billing_address.city && `${quotation.customer?.billing_address.city}, `}
                  {quotation.customer?.billing_address.state && `${quotation.customer?.billing_address.state} `}
                  {quotation.customer?.billing_address.pincode && `${quotation.customer?.billing_address.pincode}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quotation Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Quotation Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Quotation Date</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(quotation.document_date)}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Valid Until</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(quotation.valid_until)}
              </div>
            </div>
            {/* Status display removed as per requirement to simplify workflow */}
            {quotation.notes && (
              <div>
                <div className="text-sm text-slate-600">Notes</div>
                <div className="text-sm text-slate-900">{quotation.notes}</div>
              </div>
            )}
            {quotation.terms_conditions && (
              <div>
                <div className="text-sm text-slate-600">Terms & Conditions</div>
                <div className="text-sm text-slate-900">{quotation.terms_conditions}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HSN/SAC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Discount %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxable Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotation.items && quotation.items.map((item, index) => {
                // Use the rate field directly instead of calculating from total
                const rate = parseFloat(item.rate) || 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                      <div className="text-xs text-slate-500">{item.item_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.hsn_sac_code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.unit_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatCurrency(rate)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.discount_percentage}%</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatCurrency(item.taxable_amount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {quotation.gst_type === 'intrastate' ? (
                        <div>
                          <div>CGST: {item.cgst_rate}% ({formatCurrency(item.cgst_amount)})</div>
                          <div>SGST: {item.sgst_rate}% ({formatCurrency(item.sgst_amount)})</div>
                        </div>
                      ) : (
                        <div>IGST: {item.igst_rate}% ({formatCurrency(item.igst_amount)})</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(item.total_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">Subtotal</td>
                <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(quotation.subtotal)}</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
              </tr>
              {quotation.gst_type === 'intrastate' ? (
                <>
                  <tr>
                    <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">CGST</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(quotation.cgst_amount)}</td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3"></td>
                  </tr>
                  <tr>
                    <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">SGST</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(quotation.sgst_amount)}</td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3"></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">IGST</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(quotation.igst_amount)}</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3"></td>
                </tr>
              )}
              {quotation.discount_amount > 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">Discount</td>
                  <td className="px-6 py-3 text-sm font-medium text-green-600">-{formatCurrency(quotation.discount_amount)}</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3"></td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-300">
                <td colSpan="7" className="px-6 py-3 text-lg font-bold text-slate-900 text-right">Total Amount</td>
                <td className="px-6 py-3 text-lg font-bold text-slate-900">{formatCurrency(quotation.total_amount)}</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation ${quotation.document_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default QuotationView;

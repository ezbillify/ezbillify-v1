// src/components/sales/InvoiceView.js - COMPLETELY REWRITTEN
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import ConfirmDialog from '../shared/feedback/ConfirmDialog';
import PrintButton from '../shared/print/PrintButton';
import { useAuth } from '../../context/AuthContext';
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
  AlertCircle,
  FileCheck,
  Building2
} from 'lucide-react';

const InvoiceView = ({ invoiceId, companyId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [invoice, setInvoice] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (invoiceId && companyId) {
      fetchInvoice();
    }
  }, [invoiceId, companyId]);

  const fetchInvoice = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/invoices/${invoiceId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setInvoice(result.data);
    } else {
      showError('Failed to load invoice');
    }
  };

  const handleDelete = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/sales/invoices/${invoiceId}`, {
        method: 'DELETE',
        body: JSON.stringify({ company_id: companyId })
      });
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      success('Invoice deleted successfully');
      router.push('/sales/invoices');
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

  // ✅ CORRECT: Return ONLY the stored total_amount - do NOT recalculate
  const getTotalAmount = () => {
    if (!invoice) {
      return 0;
    }
    // This is the ONLY value - it already includes everything (base + tax + discount)
    return parseFloat(invoice.total_amount) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Safety check for nested objects
  const safeInvoice = invoice || {};
  const safeCustomer = safeInvoice.customer || {};
  const safeBranch = safeInvoice.branch || {};
  const safeCompany = company || {};

  // Check if user can delete (e.g., if invoice is not paid or partially paid)
  const canDelete = !invoice || invoice.paid_amount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Invoice #{safeInvoice.document_number}</h2>
            {safeInvoice.branch && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-900">
                  <Building2 className="w-3 h-3" />
                  {safeInvoice.branch.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/sales/invoices/new?id=${invoiceId}`)}
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
                ...safeInvoice,

                // COMPANY DETAILS
                company: safeCompany,

                // BRANCH DETAILS
                branch: safeBranch,

                // CUSTOMER DETAILS
                customer: safeCustomer,

                // ITEMS DETAILS
                items: safeInvoice.items,

                // BANK ACCOUNT (settings or company)
                bank_account: safeCompany?.settings?.bank_account || safeCompany?.bank_account || null,

                // IMPORTANT FIELDS
                document_number: safeInvoice.document_number,
                document_date: safeInvoice.document_date,
                due_date: safeInvoice.due_date,
                gst_type: safeInvoice.gst_type,

                // Total & tax
                subtotal: safeInvoice.subtotal,
                cgst_amount: safeInvoice.cgst_amount,
                sgst_amount: safeInvoice.sgst_amount,
                igst_amount: safeInvoice.igst_amount,
                discount_amount: safeInvoice.discount_amount,
                total_amount: safeInvoice.total_amount,

                // Customer extra (fallbacks)
                customer_name: safeCustomer.name,
                customer_phone: safeCustomer.phone,
                customer_gstin: safeCustomer.gstin,
                customer_address: safeCustomer.billing_address,

                // Force size
                paper_size: "80mm",
              }}
              documentType="invoice"
              filename={`invoice-${safeInvoice.document_number}.pdf`}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Send className="w-4 h-4" />}
            >
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/sales/payments/new?invoiceId=${invoiceId}`)}
              icon={<FileCheck className="w-4 h-4" />}
            >
              Receive Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Details Grid */}
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
                {safeCustomer.name || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Customer Code</div>
              <div className="text-sm text-slate-900">{safeCustomer.customer_code || '-'}</div>
            </div>
            {safeCustomer.gstin && (
              <div>
                <div className="text-sm text-slate-600">GSTIN</div>
                <div className="text-sm font-mono text-blue-600">{safeCustomer.gstin}</div>
              </div>
            )}
            {safeCustomer.billing_address && (
              <div>
                <div className="text-sm text-slate-600">Billing Address</div>
                <div className="text-sm text-slate-900">
                  {safeCustomer.billing_address.address_line1}<br />
                  {safeCustomer.billing_address.city && `${safeCustomer.billing_address.city}, `}
                  {safeCustomer.billing_address.state && `${safeCustomer.billing_address.state} `}
                  {safeCustomer.billing_address.pincode && `${safeCustomer.billing_address.pincode}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Invoice Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Invoice Date</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(safeInvoice.document_date)}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Due Date</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(safeInvoice.due_date)}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Amount Paid</div>
              <div className="text-sm font-medium text-slate-900">{formatCurrency(safeInvoice.paid_amount || 0)}</div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-slate-600">Balance Due</div>
              <div className="text-sm font-medium text-slate-900">{formatCurrency(safeInvoice.balance_amount || 0)}</div>
            </div>
            {safeInvoice.notes && (
              <div>
                <div className="text-sm text-slate-600">Notes</div>
                <div className="text-sm text-slate-900">{safeInvoice.notes}</div>
              </div>
            )}
            {safeInvoice.terms_conditions && (
              <div>
                <div className="text-sm text-slate-600">Terms & Conditions</div>
                <div className="text-sm text-slate-900">{safeInvoice.terms_conditions}</div>
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
              {safeInvoice.items && safeInvoice.items.map((item, index) => {
                // Display rate as stored in database (including tax)
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
                    <td className="px-6 py-4 text-sm text-slate-900">{item.discount_percentage || 0}%</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatCurrency(item.taxable_amount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {safeInvoice.gst_type === 'intrastate' ? (
                        <div>
                          <div>CGST: {parseFloat(item.cgst_rate || 0).toFixed(2)}% ({formatCurrency(item.cgst_amount)})</div>
                          <div>SGST: {parseFloat(item.sgst_rate || 0).toFixed(2)}% ({formatCurrency(item.sgst_amount)})</div>
                        </div>
                      ) : (
                        <div>IGST: {parseFloat(item.igst_rate || 0).toFixed(2)}% ({formatCurrency(item.igst_amount)})</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(item.total_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              {/* Subtotal row - showing sum of taxable amounts (excluding tax) */}
              <tr className="border-t border-slate-200">
                <td colSpan="7" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">Subtotal (Excl. Tax)</td>
                <td className="px-6 py-3 text-sm font-medium text-slate-900">
                  {formatCurrency(safeInvoice.items?.reduce((sum, item) => sum + (parseFloat(item.taxable_amount) || 0), 0) || 0)}
                </td>
                <td colSpan="2"></td>
              </tr>

              {/* Tax rows */}
              {safeInvoice.cgst_amount > 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan="8" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">CGST</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(safeInvoice.cgst_amount)}</td>
                  <td></td>
                </tr>
              )}

              {safeInvoice.sgst_amount > 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan="8" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">SGST</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(safeInvoice.sgst_amount)}</td>
                  <td></td>
                </tr>
              )}

              {safeInvoice.igst_amount > 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan="8" className="px-6 py-3 text-sm font-medium text-slate-900 text-right">IGST</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(safeInvoice.igst_amount)}</td>
                  <td></td>
                </tr>
              )}
              
              {/* Total amount row */}
              <tr className="border-t-2 border-slate-300">
                <td colSpan="9" className="px-6 py-4 text-lg font-bold text-slate-900 text-right">Total Amount</td>
                <td className="px-6 py-4 text-lg font-bold text-blue-600">{formatCurrency(getTotalAmount())}</td>
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
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${safeInvoice.document_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default InvoiceView;
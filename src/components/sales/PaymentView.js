// src/components/sales/PaymentView.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import Modal from '../shared/overlay/Modal';
import InvoiceView from './InvoiceView';
import { ArrowLeft, Printer, Send, FileText, Users, Calculator } from 'lucide-react';

const PaymentView = ({ paymentId, companyId }) => {
  const router = useRouter();
  const { error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [payment, setPayment] = useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    if (paymentId && companyId) {
      fetchPayment();
    }
  }, [paymentId, companyId]);

  const fetchPayment = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/payments/${paymentId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        setPayment(response.data);
      } else {
        showError('Failed to load payment details');
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      showError('Failed to load payment details');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card'
    };
    
    return labels[method] || method;
  };

  // Function to open invoice in modal
  const openInvoiceModal = (invoiceId, invoiceNumber) => {
    setModalContent(
      <InvoiceView invoiceId={invoiceId} companyId={companyId} />
    );
    setModalTitle(`Invoice #${invoiceNumber}`);
    setModalOpen(true);
  };

  if (!payment && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Payment not found</h3>
          <p className="text-slate-500 mb-6">The payment you're looking for doesn't exist or has been deleted.</p>
          <Button
            variant="primary"
            onClick={() => router.push('/sales/payments')}
          >
            Back to Payments
          </Button>
        </div>
      </div>
    );
  }

  const totalAllocated = payment?.allocations?.reduce((sum, alloc) => sum + (parseFloat(alloc.allocated_amount) || 0), 0) || 0;
  const unallocatedAmount = parseFloat(payment?.amount || 0) - totalAllocated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  View Payment
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    View Only
                  </span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div>
                    <h1 className="text-sm font-semibold text-gray-900">
                      Payment Number: <span className="text-blue-600">#{payment?.payment_number}</span>
                    </h1>
                  </div>
                  
                  {payment?.branch && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm font-medium text-blue-900">
                        Branch: {payment.branch.name || payment.branch.branch_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button 
                onClick={() => router.push(`/sales/payments/new?id=${paymentId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Edit Payment
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
      </div>

      {payment && (
        <div className="p-4 space-y-4">
          {/* Top Row - Customer, Payment Details, Summary */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Customer Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
                </div>
                
                <div className="space-y-2 flex-shrink-0 overflow-y-auto max-h-48">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900 mb-0.5">{payment.customer?.name}</div>
                    {payment.customer?.customer_type === 'b2b' && payment.customer?.company_name && (
                      <div className="text-xs text-gray-700 font-medium mb-0.5">{payment.customer?.company_name}</div>
                    )}
                    <div>{payment.customer?.billing_address?.address_line1}</div>
                    {payment.customer?.billing_address?.city && (
                      <div>
                        {payment.customer?.billing_address?.city}
                        {payment.customer?.billing_address?.state && `, ${payment.customer?.billing_address?.state}`}
                        {payment.customer?.billing_address?.pincode && ` - ${payment.customer?.billing_address?.pincode}`}
                      </div>
                    )}
                  </div>
                  
                  {payment.customer?.gstin && (
                    <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg font-mono border border-blue-200">
                      <span className="font-semibold">GSTIN:</span> {payment.customer?.gstin}
                    </div>
                  )}

                  <div className="text-xs p-2.5 rounded-lg border bg-purple-50 border-purple-200">
                    <div className="font-semibold text-purple-800 mb-0.5">Customer Balance</div>
                    <div className={`text-sm font-semibold ${payment.customer_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(payment.customer_balance || 0).toFixed(2)} {payment.customer_balance >= 0 ? 'Credit' : 'Debit'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-50 rounded-lg">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
                      <div className="text-sm font-medium text-gray-900">{formatDate(payment.payment_date)}</div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                      <div className="text-sm font-medium text-gray-900">{getPaymentMethodLabel(payment.payment_method)}</div>
                    </div>
                    
                    {payment.bank_account && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bank Account</label>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.bank_account.account_name} ({payment.bank_account.account_number})
                        </div>
                      </div>
                    )}
                  </div>

                  {payment.reference_number && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Reference Number</label>
                      <div className="text-sm font-medium text-gray-900">{payment.reference_number}</div>
                    </div>
                  )}

                  {payment.notes && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{payment.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Summary Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Payment Summary</h3>
                </div>
                
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Payment Amount</span>
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-300">Allocated Amount</span>
                    <span className="font-medium text-green-400">{formatCurrency(totalAllocated)}</span>
                  </div>
                  
                  <div className="flex justify-between pt-1.5 border-t border-gray-600">
                    <span className="text-gray-300">Unallocated Amount</span>
                    <span className={`font-medium ${unallocatedAmount >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatCurrency(unallocatedAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Allocations</h3>

              {/* Allocations Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payment.allocations && payment.allocations.length > 0 ? (
                        payment.allocations.map((allocation, index) => (
                          <tr key={allocation.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                <button
                                  onClick={() => openInvoiceModal(allocation.document?.id, allocation.document?.document_number)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {allocation.document?.document_number}
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">
                                Total: {formatCurrency(allocation.document?.total_amount)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(allocation.document?.document_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(allocation.document?.total_amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency((allocation.document?.total_amount || 0) - (allocation.document?.paid_amount || 0))}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                              {formatCurrency(allocation.allocated_amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                            <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            <p>No allocations found for this payment</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {payment.allocations && payment.allocations.length > 0 && (
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="5" className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Total Allocated</td>
                          <td className="px-4 py-2 text-sm font-medium text-green-600">{formatCurrency(totalAllocated)}</td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Unallocated Amount</td>
                          <td className={`px-4 py-2 text-sm font-medium ${unallocatedAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(unallocatedAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing invoices */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        size="xl"
      >
        <div className="p-1">
          {modalContent}
        </div>
      </Modal>
    </div>
  );
};

export default PaymentView;
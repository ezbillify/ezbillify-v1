// pages/purchase/payments-made/[id].js (View Payment)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import Button from '../../../components/shared/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useAPI } from '../../../hooks/useAPI';

export default function ViewPaymentPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && company) {
      fetchPayment();
    }
  }, [id, company]);

  const fetchPayment = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/${id}?company_id=${company.id}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setPayment(result.data);
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

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      card: 'Card',
      other: 'Other'
    };
    return labels[method] || method;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!company || !payment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Payment Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title={`Payment - ${payment.payment_number}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'Payments Made', href: '/purchase/payments-made' },
        { label: payment.payment_number, href: `/purchase/payments-made/${id}` }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{payment.payment_number}</h1>
            <p className="text-slate-600 mt-1">Payment Made Details</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/purchase/payments-made')}
            >
              Back to List
            </Button>
            <Button
              variant="primary"
              onClick={() => window.print()}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              }
            >
              Print
            </Button>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600">Payment Number</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{payment.payment_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Payment Date</label>
              <p className="mt-1 text-lg text-slate-900">{formatDate(payment.payment_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Amount</label>
              <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Vendor</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{payment.vendor?.vendor_name}</p>
              <p className="text-sm text-slate-500">{payment.vendor?.vendor_code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Payment Method</label>
              <p className="mt-1 text-slate-900">{getPaymentMethodLabel(payment.payment_method)}</p>
            </div>
            {payment.reference_number && (
              <div>
                <label className="block text-sm font-medium text-slate-600">Reference Number</label>
                <p className="mt-1 text-slate-900">{payment.reference_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bill Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Bills Paid</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bill Number</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Payment Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {payment.bill_payments?.map((bp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{bp.bill_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(bp.payment_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">Total Payment</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes</h3>
            <p className="text-slate-700 whitespace-pre-wrap">{payment.notes}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
// pages/purchase/returns/[id].js (View Return)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import Button from '../../../components/shared/ui/Button';
import Badge from '../../../components/shared/ui/Badge';
import { useAuth } from '../../../hooks/useAuth';
import { useAPI } from '../../../hooks/useAPI';

export default function ViewReturnPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  
  const [returnDoc, setReturnDoc] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && company) {
      fetchReturn();
    }
  }, [id, company]);

  const fetchReturn = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/returns/${id}?company_id=${company.id}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReturnDoc(result.data);
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
      approved: 'success',
      processed: 'info',
      rejected: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      defective: 'Defective/Damaged',
      wrong_item: 'Wrong Item',
      quality_issue: 'Quality Issue',
      excess_quantity: 'Excess Quantity',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!company || !returnDoc) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Return Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title={`Return - ${returnDoc.document_number}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Returns', href: '/purchase/returns' },
        { label: returnDoc.document_number, href: `/purchase/returns/${id}` }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{returnDoc.document_number}</h1>
            <p className="text-slate-600 mt-1">Purchase Return Details</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/purchase/returns')}
            >
              Back to List
            </Button>
            {returnDoc.status === 'draft' && (
              <Button
                variant="primary"
                onClick={() => router.push(`/purchase/returns/${id}/edit`)}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Return Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600">Return Number</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{returnDoc.document_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Return Date</label>
              <p className="mt-1 text-lg text-slate-900">{formatDate(returnDoc.document_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Status</label>
              <div className="mt-1">{getStatusBadge(returnDoc.status)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Total Amount</label>
              <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(returnDoc.total_amount)}</p>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-600">Vendor</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{returnDoc.vendor?.vendor_name}</p>
              <p className="text-sm text-slate-500">{returnDoc.vendor?.vendor_code}</p>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-600">Return Reason</label>
              <p className="mt-1 text-slate-900">{getReasonLabel(returnDoc.reason)}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Returned Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tax</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {returnDoc.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                      <div className="text-xs text-slate-500">{item.item_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.unit_name}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-900">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-900">{item.tax_rate}%</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">
                      {formatCurrency(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-sm font-bold text-slate-900">Total Return Amount</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                    {formatCurrency(returnDoc.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {returnDoc.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes</h3>
            <p className="text-slate-700 whitespace-pre-wrap">{returnDoc.notes}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

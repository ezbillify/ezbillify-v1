// pages/purchase/grn/[id].js (View GRN)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import Button from '../../../components/shared/ui/Button';
import Badge from '../../../components/shared/ui/Badge';
import { useAuth } from '../../../hooks/useAuth';
import { useAPI } from '../../../hooks/useAPI';

export default function ViewGRNPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  
  const [grn, setGrn] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && company) {
      fetchGRN();
    }
  }, [id, company]);

  const fetchGRN = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/grn/${id}?company_id=${company.id}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setGrn(result.data);
    }
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
      verified: 'info',
      rejected: 'error'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!company || !grn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">GRN Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title={`GRN - ${grn.document_number}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'GRN', href: '/purchase/grn' },
        { label: grn.document_number, href: `/purchase/grn/${id}` }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{grn.document_number}</h1>
            <p className="text-slate-600 mt-1">Goods Receipt Note Details</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/purchase/grn')}
            >
              Back to List
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/purchase/grn/${id}/edit`)}
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

        {/* GRN Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600">GRN Number</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{grn.document_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Receipt Date</label>
              <p className="mt-1 text-lg text-slate-900">{formatDate(grn.document_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Status</label>
              <div className="mt-1">{getStatusBadge(grn.status)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Vendor</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{grn.vendor?.vendor_name}</p>
              <p className="text-sm text-slate-500">{grn.vendor?.vendor_code}</p>
            </div>
            {grn.delivery_note_number && (
              <div>
                <label className="block text-sm font-medium text-slate-600">Delivery Note No.</label>
                <p className="mt-1 text-slate-900">{grn.delivery_note_number}</p>
              </div>
            )}
            {grn.transporter_name && (
              <div>
                <label className="block text-sm font-medium text-slate-600">Transporter</label>
                <p className="mt-1 text-slate-900">{grn.transporter_name}</p>
              </div>
            )}
            {grn.vehicle_number && (
              <div>
                <label className="block text-sm font-medium text-slate-600">Vehicle Number</label>
                <p className="mt-1 text-slate-900">{grn.vehicle_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Items Received</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">HSN/SAC</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Received Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {grn.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                      <div className="text-xs text-slate-500">{item.item_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.hsn_sac_code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">
                      {item.received_quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.unit_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {grn.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes</h3>
            <p className="text-slate-700 whitespace-pre-wrap">{grn.notes}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
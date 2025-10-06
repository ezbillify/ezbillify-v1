// pages/purchase/purchase-orders/[id]/edit.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import PurchaseOrderForm from '../../../../components/purchase/PurchaseOrderForm';
import BackButton from '../../../../components/shared/navigation/BackButton';
import { useAuth } from '../../../../hooks/useAuth';

export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company || !id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Invalid Request</h2>
          <p className="text-slate-600 mt-2">Purchase order ID or company not found</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Edit Purchase Order"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'Purchase Orders', href: '/purchase/purchase-orders' },
        { label: 'Edit', href: `/purchase/purchase-orders/${id}/edit` }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <BackButton href={`/purchase/purchase-orders/${id}`} />
          <h1 className="text-2xl font-bold text-slate-800">Edit Purchase Order</h1>
          <div></div>
        </div>

        <PurchaseOrderForm poId={id} companyId={company.id} />
      </div>
    </AppLayout>
  );
}
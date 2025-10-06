// pages/purchase/purchase-orders/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import PurchaseOrderView from '../../../components/purchase/PurchaseOrderView';
import BackButton from '../../../components/shared/navigation/BackButton';
import { useAuth } from '../../../hooks/useAuth';

export default function PurchaseOrderDetailPage() {
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
      title="Purchase Order Details"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'Purchase Orders', href: '/purchase/purchase-orders' },
        { label: 'View', href: `/purchase/purchase-orders/${id}` }
      ]}
    >
      <div className="space-y-6">
        <BackButton href="/purchase/purchase-orders" />
        <PurchaseOrderView poId={id} companyId={company.id} />
      </div>
    </AppLayout>
  );
}
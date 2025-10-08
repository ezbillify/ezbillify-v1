// pages/purchase/bills/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import BillForm from '../../../components/purchase/BillForm';
import BackButton from '../../../components/shared/navigation/BackButton';
import { useAuth } from '../../../hooks/useAuth';

export default function NewBillPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { purchase_order_id } = router.query;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">No Company Found</h2>
          <p className="text-slate-600 mt-2">Please set up your company first</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Create Purchase Bill"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'Bills', href: '/purchase/bills' },
        { label: 'New', href: '/purchase/bills/new' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <BackButton href="/purchase/bills" />
          <h1 className="text-2xl font-bold text-slate-800">Create Purchase Bill</h1>
          <div></div>
        </div>

        <BillForm 
          companyId={company.id}
          purchaseOrderId={purchase_order_id}
        />
      </div>
    </AppLayout>
  );
}
// pages/purchase/bills/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import BillView from '../../../components/purchase/BillView';
import BackButton from '../../../components/shared/navigation/BackButton';
import { useAuth } from '../../../hooks/useAuth';

export default function BillDetailPage() {
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
          <p className="text-slate-600 mt-2">Bill ID or company not found</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Purchase Bill Details"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Bills', href: '/purchase/bills' },
        { label: 'View', href: `/purchase/bills/${id}` }
      ]}
    >
      <div className="space-y-6">
        <BackButton href="/purchase/bills" />
        <BillView billId={id} companyId={company.id} />
      </div>
    </AppLayout>
  );
}
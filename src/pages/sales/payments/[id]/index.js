// pages/sales/payments/[id]/index.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import PaymentView from '../../../../components/sales/PaymentView';
import { useAuth } from '../../../../hooks/useAuth';

export default function PaymentViewPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { id } = router.query;

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
      title="View Customer Payment"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Payments', href: '/sales/payments' },
        { label: 'View', href: `/sales/payments/${id}` }
      ]}
    >
      <div className="space-y-6">
        <PaymentView paymentId={id} companyId={company.id} />
      </div>
    </AppLayout>
  );
}
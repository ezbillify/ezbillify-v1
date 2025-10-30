// pages/accounting/reports/purchase/bill-wise.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import BillWisePurchaseReport from '../../../../components/accounting/reports/purchase/BillWisePurchase';
import { useAuth } from '../../../../hooks/useAuth';

export default function BillWisePurchasePage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();

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
      title="Bill-wise Purchase Report"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounting', href: '/accounting' },
        { label: 'Reports', href: '/accounting/reports' },
        { label: 'Purchase Reports', href: '/accounting/detailed-reports' },
        { label: 'Bill-wise Purchase', href: '/accounting/reports/purchase/bill-wise' }
      ]}
    >
      <BillWisePurchaseReport companyId={company.id} />
    </AppLayout>
  );
}
// pages/sales/sales-orders/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import SalesOrderView from '../../../components/sales/SalesOrderView';
import { useAuth } from '../../../hooks/useAuth';

export default function SalesOrderViewPage() {
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

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Sales Order Not Found</h2>
          <p className="text-slate-600 mt-2">Invalid sales order ID</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="View Sales Order"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales Orders', href: '/sales/sales-orders' },
        { label: 'View', href: `/sales/sales-orders/${id}` }
      ]}
    >
      <div className="space-y-6">
        <SalesOrderView companyId={company.id} salesOrderId={id} />
      </div>
    </AppLayout>
  );
}
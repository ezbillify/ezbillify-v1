// pages/gst-integration/ewaybill-list.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/shared/layout/AppLayout';
import EWayBillList from '../../components/gst/EWayBillList';
import { useAuth } from '../../context/AuthContext';

export default function EWayBillListPage() {
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
      title="e-Way Bills"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'GST Integration', href: '/gst-integration/dashboard' },
        { label: 'e-Way Bills', href: '/gst-integration/ewaybill-list' }
      ]}
    >
      <EWayBillList companyId={company.id} />
    </AppLayout>
  );
}
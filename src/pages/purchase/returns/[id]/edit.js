// pages/purchase/returns/[id]/edit.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import PurchaseReturnForm from '../../../../components/purchase/PurchaseReturnForm';
import { useAuth } from '../../../../hooks/useAuth';

export default function EditReturnPage() {
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

  return (
    <AppLayout
      title="Edit Purchase Return"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Returns', href: '/purchase/returns' },
        { label: 'Edit', href: `/purchase/returns/${id}/edit` }
      ]}
    >
      <PurchaseReturnForm companyId={company.id} returnId={id} />
    </AppLayout>
  );
}
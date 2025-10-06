// src/pages/purchase/vendors/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import VendorList from '../../../components/purchase/VendorList';
import { useAuth } from '../../../hooks/useAuth';

export default function VendorsPage() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">No Company Selected</h2>
          <p className="text-slate-600 mt-2">Please select a company to continue</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Vendors"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchase', href: '/purchase' },
        { label: 'Vendors', href: '/purchase/vendors' }
      ]}
    >
      <VendorList companyId={company.id} />
    </AppLayout>
  );
}
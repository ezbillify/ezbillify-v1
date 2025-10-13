// src/pages/purchase/vendors/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import VendorLedger from '../../../components/purchase/VendorLedger';
import { useAuth } from '../../../hooks/useAuth';
import BackButton from '../../../components/shared/navigation/BackButton';

export default function VendorDetailPage() {
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
          <p className="text-slate-600 mt-2">Vendor ID or company not found</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Vendor Details"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vendors', href: '/purchase/vendors' },
        { label: 'View', href: `/purchase/vendors/${id}` }
      ]}
    >
      <div className="space-y-6">
        <BackButton href="/purchase/vendors" />
        <VendorLedger 
          vendorId={id} 
          companyId={company.id} 
        />
      </div>
    </AppLayout>
  );
}
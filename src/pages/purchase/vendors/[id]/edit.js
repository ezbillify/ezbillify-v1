// src/pages/purchase/vendors/[id]/edit.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import VendorForm from '../../../../components/purchase/VendorForm';
import { useAuth } from '../../../../hooks/useAuth';
import BackButton from '../../../../components/shared/navigation/BackButton';

export default function EditVendorPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleComplete = (vendor) => {
    router.push(`/purchase/vendors/${id}`);
  };

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
      title="Edit Vendor"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vendors', href: '/purchase/vendors' },
        { label: 'Edit', href: `/purchase/vendors/${id}/edit` }
      ]}
    >
      <div className="space-y-6">
        <BackButton href={`/purchase/vendors/${id}`} />
        <VendorForm 
          vendorId={id}
          companyId={company.id} 
          onComplete={handleComplete}
        />
      </div>
    </AppLayout>
  );
}
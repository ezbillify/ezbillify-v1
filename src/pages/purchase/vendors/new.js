// src/pages/purchase/vendors/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import VendorForm from '../../../components/purchase/VendorForm';
import { useAuth } from '../../../hooks/useAuth';
import BackButton from '../../../components/shared/navigation/BackButton';

export default function NewVendorPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleComplete = (vendor) => {
    router.push('/purchase/vendors');
  };

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
      title="Add New Vendor"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vendors', href: '/purchase/vendors' },
        { label: 'New', href: '/purchase/vendors/new' }
      ]}
    >
      <div className="space-y-6">
        <BackButton href="/purchase/vendors" />
        <VendorForm 
          companyId={company.id} 
          onComplete={handleComplete}
        />
      </div>
    </AppLayout>
  );
}
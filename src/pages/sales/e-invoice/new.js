// pages/sales/e-invoice/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import { useAuth } from '../../../hooks/useAuth';

export default function NewEInvoicePage() {
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
      title="Create e-Invoice"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'e-Invoices', href: '/sales/e-invoice' },
        { label: 'New', href: '/sales/e-invoice/new' }
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">e-Invoice Creation</h2>
          <p className="text-slate-600">
            Select an invoice to generate an e-Invoice. This feature requires GST integration to be set up.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
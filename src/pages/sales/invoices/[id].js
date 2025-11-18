// pages/sales/invoices/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import InvoiceView from '../../../components/sales/InvoiceView';
import { useAuth } from '../../../hooks/useAuth';

export default function InvoiceViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || router.isFallback) {
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
          <h2 className="text-xl font-semibold text-slate-800">Invoice Not Found</h2>
          <p className="text-slate-600 mt-2">Invalid invoice ID</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="View Sales Invoice"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/sales/invoices' },
        { label: 'View', href: `/sales/invoices/${id}` }
      ]}
    >
      <div className="space-y-6">
        <InvoiceView companyId={company.id} invoiceId={id} />
      </div>
    </AppLayout>
  );
}

// Enable server-side rendering for this page to handle refreshes properly
export async function getServerSideProps(context) {
  const { id } = context.params;

  // Return the id as a prop to ensure it's available on server-side render
  return {
    props: {
      invoiceId: id
    }
  };
}
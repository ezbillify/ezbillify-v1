// pages/sales/quotations/[id].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import QuotationView from '../../../components/sales/QuotationView';
import { useAuth } from '../../../hooks/useAuth';

export default function QuotationViewPage() {
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
          <h2 className="text-xl font-semibold text-slate-800">Quotation Not Found</h2>
          <p className="text-slate-600 mt-2">Invalid quotation ID</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="View Sales Quotation"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Quotations', href: '/sales/quotations' },
        { label: 'View', href: `/sales/quotations/${id}` }
      ]}
    >
      <div className="space-y-6">
        <QuotationView companyId={company.id} quotationId={id} />
      </div>
    </AppLayout>
  );
}

// Add getServerSideProps to prevent static generation issues
export async function getServerSideProps(context) {
  return {
    props: {}, // No props needed, component will fetch data client-side
  };
}
// pages/sales/invoices/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import InvoiceForm from '../../../components/sales/InvoiceForm';
import { useAuth } from '../../../hooks/useAuth';

export default function NewInvoicePage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { sales_order_id, id } = router.query; // Added id parameter for editing

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
      title={id ? "Edit Sales Invoice" : "Create Sales Invoice"}  // Updated title based on edit or create
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/sales/invoices' },
        { label: id ? 'Edit' : 'New', href: id ? `/sales/invoices/new?id=${id}` : '/sales/invoices/new' }  // Updated breadcrumb
      ]}
    >
      <div className="space-y-6">
        <InvoiceForm 
          companyId={company.id}
          salesOrderId={sales_order_id}
          invoiceId={id}  // Pass invoiceId for editing
        />
      </div>
    </AppLayout>
  );
}
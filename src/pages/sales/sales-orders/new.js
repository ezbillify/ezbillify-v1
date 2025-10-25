// pages/sales/sales-orders/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import SalesOrderForm from '../../../components/sales/SalesOrderForm';
import { useAuth } from '../../../hooks/useAuth';

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { quotation_id, id } = router.query; // Added id parameter for editing

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
      title={id ? "Edit Sales Order" : "Create Sales Order"}  // Updated title based on edit or create
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales Orders', href: '/sales/sales-orders' },
        { label: id ? 'Edit' : 'New', href: id ? `/sales/sales-orders/new?id=${id}` : '/sales/sales-orders/new' }  // Updated breadcrumb
      ]}
    >
      <div className="space-y-6">
        <SalesOrderForm 
          companyId={company.id}
          quotationId={quotation_id}
          salesOrderId={id}  // Pass salesOrderId for editing
        />
      </div>
    </AppLayout>
  );
}
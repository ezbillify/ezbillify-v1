// pages/sales/payments/new.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import PaymentForm from '../../../components/sales/PaymentForm';
import { useAuth } from '../../../hooks/useAuth';

export default function NewPaymentPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { id, invoiceId } = router.query; // Added id parameter for editing and invoiceId for creating payment from invoice

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
      title={id ? "Edit Customer Payment" : invoiceId ? "Record Payment for Invoice" : "Record Customer Payment"}  // Updated title based on edit, create from invoice, or create
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Payments', href: '/sales/payments' },
        { label: id ? 'Edit' : invoiceId ? 'New from Invoice' : 'New', href: id ? `/sales/payments/new?id=${id}` : invoiceId ? `/sales/payments/new?invoiceId=${invoiceId}` : '/sales/payments/new' }  // Updated breadcrumb
      ]}
    >
      <div className="space-y-6">
        <PaymentForm companyId={company.id} paymentId={id} invoiceId={invoiceId} />  // Pass paymentId for editing and invoiceId for creating payment from invoice
      </div>
    </AppLayout>
  );
}
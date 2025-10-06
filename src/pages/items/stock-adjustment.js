// src/pages/items/stock-adjustment.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/shared/layout/AppLayout';
import AdjustmentForm from '../../components/items/AdjustmentForm';
import AdjustmentList from '../../components/items/AdjustmentList';
import { useAuth } from '../../hooks/useAuth';

export default function StockAdjustmentPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleAdjustmentComplete = () => {
    window.location.reload();
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
      title="Stock Adjustment"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Items', href: '/items' },
        { label: 'Stock Adjustment', href: '/items/stock-adjustment' }
      ]}
    >
      <div className="space-y-6">
        <AdjustmentForm 
          companyId={company.id} 
          onComplete={handleAdjustmentComplete}
        />
        <AdjustmentList companyId={company.id} />
      </div>
    </AppLayout>
  );
}

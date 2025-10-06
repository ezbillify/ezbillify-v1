// src/pages/items/stock-in.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AppLayout from '../../components/shared/layout/AppLayout';
import StockIn from '../../components/items/StockIn';
import { useAuth } from '../../hooks/useAuth';
import { useAPI } from '../../hooks/useAPI';

export default function StockInPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();
  const { authenticatedFetch } = useAPI();
  const { item: itemId } = router.query;
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (itemId && company?.id) {
      fetchItemDetails(itemId);
    }
  }, [itemId, company?.id]);

  const fetchItemDetails = async (id) => {
    setItemLoading(true);
    try {
      const responseData = await authenticatedFetch(`/api/items/${id}?company_id=${company.id}`);
      
      if (responseData.success) {
        setSelectedItem(responseData.data);
      }
    } catch (error) {
      console.error('Failed to fetch item details:', error);
    } finally {
      setItemLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/items/current-stock');
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
      title="Stock In"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Items', href: '/items' },
        { label: 'Stock In', href: '/items/stock-in' }
      ]}
    >
      {itemLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading item...</span>
        </div>
      ) : (
        <StockIn 
          companyId={company.id}
          onComplete={handleComplete}
          selectedItem={selectedItem}
        />
      )}
    </AppLayout>
  );
}
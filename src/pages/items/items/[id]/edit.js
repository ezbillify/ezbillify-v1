// src/pages/items/items/[id]/edit.js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AppLayout from '../../../../components/shared/layout/AppLayout';
import ItemForm from '../../../../components/items/ItemForm';
import { useAuth } from '../../../../hooks/useAuth';
import BackButton from '../../../../components/shared/navigation/BackButton';

export default function EditItemPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, company, loading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (router.isReady && id && company) {
      setTimeout(() => setIsReady(true), 200);
    }
  }, [router.isReady, id, company]);

  const handleSave = (updatedItem) => {
    setTimeout(() => {
      router.push('/items/item-list');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/items/item-list');
  };

  if (authLoading || !router.isReady || !id || !isReady) {
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
      title="Edit Item"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Items', href: '/items' },
        { label: 'All Items', href: '/items/item-list' },
        { label: 'Edit', href: `/items/items/${id}/edit` }
      ]}
    >
      <div className="space-y-6">
        <BackButton href={`/items/items/${id}`} />
        <ItemForm 
          key={`item-form-${id}`}
          itemId={id}
          companyId={company.id}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </AppLayout>
  );
}
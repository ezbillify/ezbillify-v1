// src/pages/items/items/[id]/edit.js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ItemsLayout from '../../../../components/items/ItemsLayout';
import ItemForm from '../../../../components/items/ItemForm';
import { useAuth } from '../../../../hooks/useAuth';

export default function EditItemPage() {
  const router = useRouter();
  const { id } = router.query;
  const { company } = useAuth();
  const [isReady, setIsReady] = useState(false);

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

  if (!company || !router.isReady || !id || !isReady) {
    return (
      <ItemsLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading...</span>
        </div>
      </ItemsLayout>
    );
  }

  return (
    <ItemsLayout>
      <ItemForm 
        key={`item-form-${id}`}
        itemId={id}
        companyId={company.id}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </ItemsLayout>
  );
}
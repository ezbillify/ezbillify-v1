// src/pages/items/items/new.js
import { useRouter } from 'next/router';
import ItemsLayout from '../../../components/items/ItemsLayout';
import ItemForm from '../../../components/items/ItemForm';
import { useAuth } from '../../../hooks/useAuth';

export default function NewItemPage() {
  const router = useRouter();
  const { company } = useAuth();

  const handleSave = (newItem) => {
    setTimeout(() => {
      router.push('/items/item-list');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/items/item-list');
  };

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading company data...</span>
      </div>
    );
  }

  return (
    <ItemsLayout>
      <ItemForm 
        companyId={company.id}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </ItemsLayout>
  );
}
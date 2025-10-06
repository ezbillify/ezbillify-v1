// src/pages/items/items/[id].js
import { useRouter } from 'next/router';
import AppLayout from '../../../components/shared/layout/AppLayout';
import ItemView from '../../../components/items/ItemView';
import { useAuth } from '../../../hooks/useAuth';
import BackButton from '../../../components/shared/navigation/BackButton';

export default function ItemDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { company } = useAuth();

  const handleEdit = (itemId) => {
    router.push(`/items/items/${itemId}/edit`);
  };

  const handleDelete = () => {
    router.push('/items');
  };

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading company data...</span>
      </div>
    );
  }

  if (!id) {
    return (
      <AppLayout title="Item Not Found">
        <div className="p-6 text-center">
          <h3 className="text-lg font-medium text-slate-900">Item not found</h3>
          <p className="text-slate-500">The item you're looking for doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Item Details"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Items', href: '/items' },
        { label: 'View', href: `/items/items/${id}` }
      ]}
    >
      <BackButton href="/items/item-list" />
      <ItemView 
        itemId={id}
        companyId={company.id}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
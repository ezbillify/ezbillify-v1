// src/pages/items/stock-out.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ItemsLayout from '../../components/items/ItemsLayout';
import StockOut from '../../components/items/StockOut';
import { useAuth } from '../../hooks/useAuth';

export default function StockOutPage() {
  const router = useRouter();
  const { company, loading } = useAuth();
  const { item: itemId } = router.query;
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (itemId && company) {
      fetchItemDetails(itemId);
    }
  }, [itemId, company]);

  const fetchItemDetails = async (id) => {
    try {
      const response = await fetch(`/api/items/${id}?company_id=${company.id}`);
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          setSelectedItem(responseData.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch item details:', error);
    }
  };

  const handleComplete = () => {
    router.push('/items/current-stock');
  };

  if (loading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading company data...</span>
      </div>
    );
  }

  return (
    <ItemsLayout>
      <StockOut 
        companyId={company.id}
        onComplete={handleComplete}
        selectedItem={selectedItem}
      />
    </ItemsLayout>
  );
}
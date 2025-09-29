// src/pages/items/current-stock.js
import ItemsLayout from '../../components/items/ItemsLayout';
import StockList from '../../components/items/StockList';
import { useAuth } from '../../hooks/useAuth';

export default function CurrentStockPage() {
  const { company } = useAuth();

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading company data...</span>
      </div>
    );
  }

  return (
    <ItemsLayout activeTab="current-stock">
      <StockList companyId={company.id} />
    </ItemsLayout>
  );
}
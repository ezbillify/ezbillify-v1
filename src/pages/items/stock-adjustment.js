// src/pages/items/stock-adjustment.js
import ItemsLayout from '../../components/items/ItemsLayout';
import AdjustmentForm from '../../components/items/AdjustmentForm';
import AdjustmentList from '../../components/items/AdjustmentList';
import { useAuth } from '../../hooks/useAuth';

export default function StockAdjustmentPage() {
  const { company, loading } = useAuth();

  const handleAdjustmentComplete = () => {
    window.location.reload();
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
    <ItemsLayout activeTab="stock-adjustment">
      <div className="space-y-6">
        <AdjustmentForm 
          companyId={company.id} 
          onComplete={handleAdjustmentComplete}
        />
        <AdjustmentList companyId={company.id} />
      </div>
    </ItemsLayout>
  );
}
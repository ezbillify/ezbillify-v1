// src/pages/items/item-list.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ItemsLayout from '../../components/items/ItemsLayout';
import ItemList from '../../components/items/ItemList';
import { useAuth } from '../../hooks/useAuth';

export default function ItemListPage() {
  const router = useRouter();
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
    <ItemsLayout activeTab="items">
      <ItemList companyId={company.id} />
    </ItemsLayout>
  );
}
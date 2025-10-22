// src/pages/master-data/categories.js - FINAL VERSION
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import CategoriesForm from '../../components/master-data/CategoriesForm'
import CategoriesList from '../../components/master-data/CategoriesList'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import masterDataService from '../../services/masterDataService'

const CategoriesPage = () => {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const { user, company } = useAuth()

  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    if (company?.id) {
      loadCategories()
    }
  }, [company?.id])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await masterDataService.getCategories(company.id)
      setCategories(data || [])
    } catch (err) {
      console.error('Failed to load categories:', err)
      showError('Failed to load categories')
    }
    setLoadingCategories(false)
  }

  const handleReset = () => {
    setEditingId(null)
    setIsAddingNew(false)
  }

  const handleSave = () => {
    handleReset()
    loadCategories()
  }

  const handleEdit = (categoryId) => {
    setEditingId(categoryId)
    setIsAddingNew(false)
  }

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return
    }

    try {
      await masterDataService.deleteCategory(categoryId)
      success('Category deleted successfully')
      loadCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      showError(err.message || 'Failed to delete category')
    }
  }

  const handleAddNew = () => {
    setIsAddingNew(true)
    setEditingId(null)
  }

  return (
    <MasterDataLayout
      title="Categories"
      showAddButton={!isAddingNew && !editingId}
      onAdd={handleAddNew}
      addButtonText="Add Category"
    >
      <div className="space-y-6">
        {(isAddingNew || editingId) && (
          <CategoriesForm
            categoryId={editingId}
            companyId={company?.id}
            onSave={handleSave}
            onCancel={handleReset}
            onSuccess={success}
            onError={showError}
          />
        )}

        <CategoriesList
          categories={categories}
          loading={loadingCategories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </MasterDataLayout>
  )
}

export default CategoriesPage
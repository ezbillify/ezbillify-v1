// src/components/master-data/CategoriesForm.js - CATEGORIES FORM COMPONENT
import { useState, useEffect } from 'react'
import Button from '../shared/ui/Button'
import Input from '../shared/ui/Input'
import Card from '../shared/ui/Card'
import { useAPI } from '../../hooks/useAPI'
import masterDataService from '../../services/masterDataService'

const CategoriesForm = ({ categoryId, companyId, onSave, onCancel, onSuccess, onError }) => {
  const { loading, executeRequest } = useAPI()

  const [formData, setFormData] = useState({
    category_code: '',
    category_name: '',
    description: '',
    is_active: true
  })
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (categoryId) {
      loadCategory()
    }
  }, [categoryId])

  const loadCategory = async () => {
    try {
      const categories = await masterDataService.getCategories(companyId)
      const category = categories.find(c => c.id === categoryId)
      if (category) {
        setFormData({
          category_code: category.category_code || '',
          category_name: category.category_name,
          description: category.description || '',
          is_active: category.is_active
        })
      }
    } catch (err) {
      console.error('Failed to load category:', err)
      onError('Failed to load category')
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.category_name?.trim()) {
      errors.category_name = 'Category name is required'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      onError('Please fix the errors')
      return
    }

    try {
      if (categoryId) {
        await masterDataService.updateCategory(categoryId, {
          category_code: formData.category_code?.trim() || null,
          category_name: formData.category_name.trim(),
          description: formData.description?.trim() || null,
          is_active: formData.is_active
        })
        onSuccess('Category updated successfully')
      } else {
        await masterDataService.createCategory(companyId, {
          category_code: formData.category_code?.trim() || null,
          category_name: formData.category_name.trim(),
          description: formData.description?.trim() || null,
          is_active: true
        })
        onSuccess('Category created successfully')
      }
      onSave()
    } catch (err) {
      console.error('Error saving category:', err)
      onError(err.message || 'Failed to save category')
    }
  }

  return (
    <Card title={categoryId ? 'Edit Category' : 'Add New Category'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Category Code"
            value={formData.category_code}
            onChange={(e) => setFormData({ ...formData, category_code: e.target.value })}
            placeholder="e.g. CAT-001"
            helperText="Optional unique identifier"
          />
          <Input
            label="Category Name"
            value={formData.category_name}
            onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
            error={validationErrors.category_name}
            placeholder="e.g. Electronics"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Describe this category..."
          />
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="mr-3 h-5 w-5 text-blue-600 rounded"
          />
          <span className="text-base font-medium text-slate-700">Active</span>
        </label>

        <div className="flex gap-4 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {categoryId ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default CategoriesForm
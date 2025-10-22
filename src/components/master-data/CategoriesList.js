// src/components/master-data/CategoriesList.js - CATEGORIES LIST COMPONENT
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

const CategoriesList = ({ categories, loading, onEdit, onDelete }) => {
  return (
    <>
      <Card title="Categories List">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">No categories found</p>
            <p className="text-sm text-slate-500 mt-2">Create your first category to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Category Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {category.category_code || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{category.category_name}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm">
                      {category.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(category.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onDelete(category.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <h3 className="font-semibold text-blue-900 mb-2">About Categories</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Categories help organize and classify your products and services</li>
          <li>Assign categories to items when creating or editing them</li>
          <li>Use category codes for reference and reporting</li>
          <li>Inactive categories won't appear in dropdowns but remain in the system</li>
        </ul>
      </Card>
    </>
  )
}

export default CategoriesList
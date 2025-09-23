import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import UnitList from '../../components/master-data/UnitList'
import UnitForm from '../../components/master-data/UnitForm'

const UnitsPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)

  const handleAdd = () => {
    console.log('Add button clicked!') // Debug log
    setEditingUnit(null)
    setShowForm(true)
    console.log('showForm set to:', true) // Debug log
  }

  const handleEdit = (unit) => {
    console.log('Edit clicked for unit:', unit) // Debug log
    setEditingUnit(unit)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingUnit(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingUnit(null)
  }

  console.log('Current showForm state:', showForm) // Debug log

  return (
    <MasterDataLayout 
      title="Units of Measurement"
      showAddButton={true}
      addButtonText="Add Unit"
      onAdd={handleAdd}
    >
      <UnitList 
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      {/* Simple Modal Alternative - No external Modal component needed */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h3>
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <UnitForm
              unit={editingUnit}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </MasterDataLayout>
  )
}

export default UnitsPage
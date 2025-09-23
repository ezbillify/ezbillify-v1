import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import TaxRateList from '../../components/master-data/TaxRateList'
import TaxRateForm from '../../components/master-data/TaxRateForm'
import Modal from '../../components/shared/ui/Modal'

const TaxRatesPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingTaxRate, setEditingTaxRate] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAdd = () => {
    setEditingTaxRate(null)
    setShowForm(true)
  }

  const handleEdit = (taxRate) => {
    setEditingTaxRate(taxRate)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingTaxRate(null)
    setRefreshList(prev => prev + 1)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTaxRate(null)
  }

  return (
    <MasterDataLayout 
      title="Tax Rates"
      showAddButton={true}
      addButtonText="Add Tax Rate"
      onAdd={handleAdd}
    >
      <TaxRateList 
        key={refreshList}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      <Modal
        isOpen={showForm}
        title={editingTaxRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
        onClose={handleCancel}
        size="lg"
      >
        <TaxRateForm
          taxRate={editingTaxRate}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    </MasterDataLayout>
  )
}

export default TaxRatesPage
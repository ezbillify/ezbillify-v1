import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import CurrencyList from '../../components/master-data/CurrencyList'
import CurrencyForm from '../../components/master-data/CurrencyForm'
import Modal from '../../components/shared/ui/Modal'

const CurrencyPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAdd = () => {
    setEditingCurrency(null)
    setShowForm(true)
  }

  const handleEdit = (currency) => {
    setEditingCurrency(currency)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingCurrency(null)
    setRefreshList(prev => prev + 1)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCurrency(null)
  }

  return (
    <MasterDataLayout 
      title="Currencies"
      showAddButton={true}
      addButtonText="Add Currency"
      onAdd={handleAdd}
    >
      <CurrencyList 
        key={refreshList}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      <Modal
        isOpen={showForm}
        title={editingCurrency ? 'Edit Currency' : 'Add New Currency'}
        onClose={handleCancel}
        size="lg"
      >
        <CurrencyForm
          currency={editingCurrency}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    </MasterDataLayout>
  )
}

export default CurrencyPage
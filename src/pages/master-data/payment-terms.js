import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import PaymentTermsList from '../../components/master-data/PaymentTermsList'
import PaymentTermsForm from '../../components/master-data/PaymentTermsForm'
import Modal from '../../components/shared/ui/Modal'

const PaymentTermsPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingPaymentTerm, setEditingPaymentTerm] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAdd = () => {
    setEditingPaymentTerm(null)
    setShowForm(true)
  }

  const handleEdit = (paymentTerm) => {
    setEditingPaymentTerm(paymentTerm)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingPaymentTerm(null)
    setRefreshList(prev => prev + 1)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPaymentTerm(null)
  }

  return (
    <MasterDataLayout 
      title="Payment Terms"
      showAddButton={true}
      addButtonText="Add Payment Term"
      onAdd={handleAdd}
    >
      <PaymentTermsList 
        key={refreshList}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      <Modal
        isOpen={showForm}
        title={editingPaymentTerm ? 'Edit Payment Term' : 'Add New Payment Term'}
        onClose={handleCancel}
        size="lg"
      >
        <PaymentTermsForm
          paymentTerm={editingPaymentTerm}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    </MasterDataLayout>
  )
}

export default PaymentTermsPage
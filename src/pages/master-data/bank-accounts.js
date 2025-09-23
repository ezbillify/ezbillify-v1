import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import BankAccountList from '../../components/master-data/BankAccountList'
import BankAccountForm from '../../components/master-data/BankAccountForm'
import Modal from '../../components/shared/ui/Modal'

const BankAccountsPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingBankAccount, setEditingBankAccount] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAdd = () => {
    setEditingBankAccount(null)
    setShowForm(true)
  }

  const handleEdit = (bankAccount) => {
    setEditingBankAccount(bankAccount)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingBankAccount(null)
    setRefreshList(prev => prev + 1)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingBankAccount(null)
  }

  return (
    <MasterDataLayout 
      title="Bank Accounts"
      showAddButton={true}
      addButtonText="Add Bank Account"
      onAdd={handleAdd}
    >
      <BankAccountList 
        key={refreshList}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      <Modal
        isOpen={showForm}
        title={editingBankAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
        onClose={handleCancel}
        size="lg"
      >
        <BankAccountForm
          bankAccount={editingBankAccount}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    </MasterDataLayout>
  )
}

export default BankAccountsPage
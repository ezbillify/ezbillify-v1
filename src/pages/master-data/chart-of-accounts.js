import { useState } from 'react'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import AccountList from '../../components/master-data/AccountList'
import AccountForm from '../../components/master-data/AccountForm'
import Modal from '../../components/shared/ui/Modal'

const ChartOfAccountsPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAdd = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const handleEdit = (account) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingAccount(null)
    setRefreshList(prev => prev + 1) // Trigger list refresh
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  return (
    <MasterDataLayout 
      title="Chart of Accounts"
      showAddButton={true}
      addButtonText="Add Account"
      onAdd={handleAdd}
    >
      <AccountList 
        key={refreshList}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      <Modal
        isOpen={showForm}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        onClose={handleCancel}
        size="lg"
      >
        <AccountForm
          account={editingAccount}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    </MasterDataLayout>
  )
}

export default ChartOfAccountsPage
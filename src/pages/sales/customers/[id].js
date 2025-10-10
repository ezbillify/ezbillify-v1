// pages/sales/customers/[id].js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import AppLayout from '../../../components/shared/layout/AppLayout'
import CustomerView from '../../../components/sales/CustomerView'
import B2BCustomerForm from '../../../components/sales/B2BCustomerForm'
import B2CCustomerForm from '../../../components/sales/B2CCustomerForm'
import customerService from '../../../services/customerService'
import Loading from '../../../components/shared/ui/Loading'

const CustomerDetailPage = () => {
  const router = useRouter()
  const { id, edit } = router.query
  const { user, company, loading: authLoading } = useAuth()
  const { error: showError } = useToast()
  
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (edit === 'true') {
      setIsEditMode(true)
    }
  }, [edit])

  useEffect(() => {
    if (id && company?.id) {
      loadCustomer()
    }
  }, [id, company])

  const loadCustomer = async () => {
    try {
      setLoading(true)
      const result = await customerService.getCustomer(id, company.id)
      
      if (result.success) {
        setCustomer(result.data)
      } else {
        showError(result.error || 'Failed to load customer')
        router.push('/sales/customers')
      }
    } catch (err) {
      console.error('Error loading customer:', err)
      showError('Failed to load customer')
      router.push('/sales/customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (savedCustomer) => {
    setCustomer(savedCustomer)
    setIsEditMode(false)
    router.push(`/sales/customers/${id}`)
  }

  const handleCancel = () => {
    setIsEditMode(false)
    router.push(`/sales/customers/${id}`)
  }

  const handleEdit = () => {
    setIsEditMode(true)
    router.push(`/sales/customers/${id}?edit=true`, undefined, { shallow: true })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="large" />
      </div>
    )
  }

  if (!user || !company || !id || !customer) {
    return null
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Customers', href: '/sales/customers' },
    { label: isEditMode ? 'Edit Customer' : customer.name || 'Customer Details', current: true }
  ]

  return (
    <>
      <Head>
        <title>
          {isEditMode ? 'Edit Customer' : customer.name || 'Customer Details'} - EzBillify
        </title>
        <meta name="description" content="View and manage customer information" />
      </Head>

      <AppLayout 
        title={isEditMode ? 'Edit Customer' : customer.name || 'Customer Details'}
        breadcrumbs={breadcrumbs}
      >
        {isEditMode ? (
          customer.customer_type === 'b2b' ? (
            <B2BCustomerForm 
              customerId={id}
              initialData={customer}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <B2CCustomerForm 
              customerId={id}
              initialData={customer}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )
        ) : (
          <CustomerView 
            customerId={id}
            customer={customer}
            onEdit={handleEdit}
            onRefresh={loadCustomer}
          />
        )}
      </AppLayout>
    </>
  )
}

export default CustomerDetailPage
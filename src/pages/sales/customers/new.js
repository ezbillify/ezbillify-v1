import React from 'react'
import Head from 'next/head'
import { useAuth } from '../../../context/AuthContext'
import AppLayout from '../../../components/shared/layout/AppLayout'
import CustomerForm from '../../../components/sales/CustomerForm'

const NewCustomerPage = () => {
  const { user, company, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !company) {
    return null // Let AuthGuard handle redirects
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Customers', href: '/sales/customers' },
    { label: 'New Customer', current: true }
  ]

  return (
    <>
      <Head>
        <title>Add New Customer - EzBillify</title>
        <meta name="description" content="Add a new customer to your EzBillify database" />
      </Head>

      <AppLayout 
        title="Add New Customer"
        breadcrumbs={breadcrumbs}
      >
        <CustomerForm />
      </AppLayout>
    </>
  )
}

export default NewCustomerPage
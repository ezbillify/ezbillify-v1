import React from 'react'
import Head from 'next/head'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/shared/layout/AppLayout'
import CustomerList from '../../components/sales/CustomerList'

const CustomersPage = () => {
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
    { label: 'Customers', current: true }
  ]

  return (
    <>
      <Head>
        <title>Customers - EzBillify</title>
        <meta name="description" content="Manage your customer database with EzBillify" />
      </Head>

      <AppLayout 
        title="Customers"
        breadcrumbs={breadcrumbs}
      >
        <CustomerList />
      </AppLayout>
    </>
  )
}

export default CustomersPage
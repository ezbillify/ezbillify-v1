// src/pages/sales/customers/[id].js
import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../../context/AuthContext'
import SalesLayout from '../../../components/sales/SalesLayout'
import CustomerView from '../../../components/sales/CustomerView'
import CustomerForm from '../../../components/sales/CustomerForm'

const CustomerDetailPage = () => {
  const router = useRouter()
  const { id } = router.query
  const { user, company, loading } = useAuth()
  const isEdit = router.query.edit === 'true'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !company || !id) {
    return null // Let AuthGuard handle redirects
  }

  return (
    <>
      <Head>
        <title>{isEdit ? 'Edit Customer' : 'Customer Details'} - EzBillify</title>
        <meta name="description" content="View and manage customer information" />
      </Head>

      <SalesLayout>
        {isEdit ? (
          <CustomerForm customerId={id} />
        ) : (
          <CustomerView customerId={id} />
        )}
      </SalesLayout>
    </>
  )
}

export default CustomerDetailPage

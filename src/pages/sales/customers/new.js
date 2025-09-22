// src/pages/sales/customers/new.js
import React from 'react'
import Head from 'next/head'
import { useAuth } from '../../../context/AuthContext'
import SalesLayout from '../../../components/sales/SalesLayout'
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

  return (
    <>
      <Head>
        <title>Add New Customer - EzBillify</title>
        <meta name="description" content="Add a new customer to your EzBillify database" />
      </Head>

      <SalesLayout>
        <CustomerForm />
      </SalesLayout>
    </>
  )
}

export default NewCustomerPage
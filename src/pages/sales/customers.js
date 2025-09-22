// src/pages/sales/customers.js
import React from 'react'
import Head from 'next/head'
import { useAuth } from '../../context/AuthContext'
import SalesLayout from '../../components/sales/SalesLayout'
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

  return (
    <>
      <Head>
        <title>Customers - EzBillify</title>
        <meta name="description" content="Manage your customer database with EzBillify" />
      </Head>

      <SalesLayout>
        <CustomerList />
      </SalesLayout>
    </>
  )
}

export default CustomersPage
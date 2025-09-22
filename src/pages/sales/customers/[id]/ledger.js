// src/pages/sales/customers/[id]/ledger.js
import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../../../context/AuthContext'
import SalesLayout from '../../../../components/sales/SalesLayout'
import CustomerLedger from '../../../../components/sales/CustomerLedger'

const CustomerLedgerPage = () => {
  const router = useRouter()
  const { id } = router.query
  const { user, company, loading } = useAuth()

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
        <title>Customer Ledger - EzBillify</title>
        <meta name="description" content="View customer transaction history and account balance" />
      </Head>

      <SalesLayout>
        <CustomerLedger customerId={id} />
      </SalesLayout>
    </>
  )
}

export default CustomerLedgerPage
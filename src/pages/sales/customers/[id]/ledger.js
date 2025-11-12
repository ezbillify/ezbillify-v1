import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../../../context/AuthContext'
import AppLayout from '../../../../components/shared/layout/AppLayout'
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

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Customers', href: '/sales/customers' },
    { label: 'Customer Details', href: `/sales/customers/${id}` },
    { label: 'Ledger', current: true }
  ]

  return (
    <>
      <Head>
        <title>Customer Ledger - EzBillify</title>
        <meta name="description" content="View customer transaction history and account balance" />
      </Head>

      <AppLayout 
        title="Customer Ledger"
        breadcrumbs={breadcrumbs}
      >
        <CustomerLedger customerId={id} companyId={company.id} />
      </AppLayout>
    </>
  )
}

export default CustomerLedgerPage
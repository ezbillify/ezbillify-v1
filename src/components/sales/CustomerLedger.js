// src/components/sales/CustomerLedger.js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import customerService from '../../services/customerService'
import Button from '../shared/ui/Button'
import Select from '../shared/ui/Select'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const CustomerLedger = ({ customerId }) => {
  const router = useRouter()
  const { company } = useAuth()
  const { success, error: showError } = useToast()
  
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    transactionType: '' // 'invoice', 'payment', 'credit_note', 'debit_note'
    // status filter removed as per requirement to simplify workflow
  })

  useEffect(() => {
    if (customerId && company?.id) {
      loadCustomer()
    }
  }, [customerId, company?.id])

  useEffect(() => {
    if (customerId && company?.id && customer) {
      // Add a small delay to ensure customer data is fully loaded
      const timer = setTimeout(() => {
        loadLedgerData()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [customerId, company?.id, customer, filters])

  const loadCustomer = async () => {
    const result = await customerService.getCustomer(customerId, company.id)
    if (result.success) {
      setCustomer(result.data)
    }
  }

  const loadLedgerData = async () => {
    // Don't load ledger data until we have customer info
    if (!customerId || !company?.id || !customer) {
      console.log('Missing required data for ledger loading:', { customerId, companyId: company?.id, customer });
      return;
    }

    setLoading(true)
    
    try {
      console.log('Loading ledger data for customer:', customerId, 'company:', company.id);
      
      // Get real ledger data from database
      const result = await customerService.getCustomerLedger(customerId, company.id, filters)
      console.log('Ledger service result:', result);
      
      if (result.success) {
        console.log('Ledger data loaded successfully:', result.data);
        // Real data from sales_documents and payments tables
        const { data } = result
        setTransactions(data.transactions || [])
        setSummary(data.summary || {
          opening_balance: customer?.opening_balance || 0,
          total_sales: data.summary?.total_sales || 0,
          total_payments: data.summary?.total_payments || 0,
          current_balance: data.summary?.current_balance || customer?.opening_balance || 0,
          overdue_amount: data.summary?.overdue_amount || 0,
          credit_limit: customer?.credit_limit || 0,
          available_credit: data.summary?.available_credit || (customer?.credit_limit || 0) - (customer?.opening_balance || 0)
        })
      } else {
        console.log('Ledger data fetch failed:', result.error);
        // If no transactions yet, show empty state with real customer data
        setTransactions([])
        setSummary({
          opening_balance: customer?.opening_balance || 0,
          total_sales: 0,
          total_payments: 0,
          current_balance: customer?.opening_balance || 0,
          overdue_amount: 0,
          credit_limit: customer?.credit_limit || 0,
          available_credit: (customer?.credit_limit || 0) - (customer?.opening_balance || 0)
        })
      }
    } catch (error) {
      console.error('Failed to load ledger data:', error);
      showError('Failed to load ledger data: ' + error.message)
      setTransactions([])
      setSummary(null)
    }
    
    setLoading(false)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAmount = (amount) => {
    // Indian number formatting without currency symbol
    const numAmount = parseFloat(amount || 0)
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(numAmount))
    return formatted
  }

  const generateLedgerPDF = () => {
    if (!customer || !summary) {
      showError('Unable to generate PDF. Missing data.')
      return
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.width
    let yPos = 15

    // Header Section
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235) // Blue color
    doc.text('LEDGER', 15, yPos)
    yPos += 8

    // Company Name - USE REAL DATA
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(company?.name || 'Company Name', 15, yPos)
    yPos += 6

    // Company Address - USE REAL DATA
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (company?.address) {
      let addressText = ''
      if (typeof company.address === 'string') {
        addressText = company.address
      } else {
        const addressParts = []
        if (company.address.address_line1) addressParts.push(company.address.address_line1)
        if (company.address.address_line2) addressParts.push(company.address.address_line2)
        if (company.address.city) addressParts.push(company.address.city)
        if (company.address.state) addressParts.push(company.address.state)
        if (company.address.pincode) addressParts.push(company.address.pincode)
        addressText = addressParts.join(', ')
      }

      // Split long address into multiple lines if needed
      const addressLines = doc.splitTextToSize(addressText, pageWidth - 30)
      addressLines.forEach(line => {
        doc.text(line, 15, yPos)
        yPos += 4
      })
      yPos += 2
    }

    // Company Phone - USE REAL DATA
    if (company?.phone) {
      doc.setFont('helvetica', 'bold')
      doc.text(`Mobile ${company.phone}`, 15, yPos)
      yPos += 8
    }

    // Customer Info (Centered) - USE REAL DATA
    yPos += 5
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(customer.name || 'Customer Name', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const customerInfo = `Ph: ${customer.phone || 'N/A'}, ${customer.email || 'N/A'}`
    doc.text(customerInfo, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    // Date Range - USE ACTUAL FILTER DATES OR DEFAULT TO CURRENT YEAR
    let dateRangeText = ''
    if (filters.dateFrom && filters.dateTo) {
      dateRangeText = `(${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)})`
    } else if (filters.dateFrom) {
      dateRangeText = `(From ${formatDate(filters.dateFrom)})`
    } else if (filters.dateTo) {
      dateRangeText = `(Until ${formatDate(filters.dateTo)})`
    } else {
      const year = new Date().getFullYear()
      dateRangeText = `(01-01-${year} - 31-12-${year})`
    }
    doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    // Summary Boxes (4 boxes in a row)
    const boxWidth = (pageWidth - 30) / 4
    const boxHeight = 15
    const boxStartX = 15
    const boxY = yPos

    // Box backgrounds and borders
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)

    // Previous Balance Box - NO RUPEE SYMBOL
    doc.rect(boxStartX, boxY, boxWidth, boxHeight)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Previous Balance', boxStartX + boxWidth / 2, boxY + 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(formatAmount(summary.opening_balance), boxStartX + boxWidth / 2, boxY + 11, { align: 'center' })

    // Total Debit Box - NO RUPEE SYMBOL, RED COLOR
    doc.rect(boxStartX + boxWidth, boxY, boxWidth, boxHeight)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Total Debit (-)', boxStartX + boxWidth + boxWidth / 2, boxY + 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38) // Red
    doc.text(formatAmount(summary.total_sales), boxStartX + boxWidth + boxWidth / 2, boxY + 11, { align: 'center' })

    // Total Credit Box - NO RUPEE SYMBOL, GREEN COLOR
    doc.setTextColor(0, 0, 0)
    doc.rect(boxStartX + boxWidth * 2, boxY, boxWidth, boxHeight)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Total Credit (+)', boxStartX + boxWidth * 2 + boxWidth / 2, boxY + 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74) // Green
    doc.text(formatAmount(summary.total_payments), boxStartX + boxWidth * 2 + boxWidth / 2, boxY + 11, { align: 'center' })

    // Closing Balance Box - NO RUPEE SYMBOL, RED COLOR
    doc.setTextColor(0, 0, 0)
    doc.rect(boxStartX + boxWidth * 3, boxY, boxWidth, boxHeight)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Closing Balance', boxStartX + boxWidth * 3 + boxWidth / 2, boxY + 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38) // Red
    doc.text(formatAmount(summary.current_balance), boxStartX + boxWidth * 3 + boxWidth / 2, boxY + 11, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    yPos = boxY + boxHeight + 10

    // Transaction Table - SHOW ALL ENTRIES ONE BY ONE
    const tableData = []

    // Add opening balance row FIRST
    const openingDateText = filters.dateFrom
      ? formatDate(filters.dateFrom)
      : `01 Jan ${new Date().getFullYear()}`

    tableData.push([
      `Balance as of ${openingDateText}`,
      '',
      '',
      '',
      '',
      formatAmount(summary.opening_balance)
    ])

    // Add each transaction one by one - REAL DATA
    if (transactions && transactions.length > 0) {
      transactions.forEach((transaction, index) => {
        const docType = transaction.type === 'payment' ? 'Payment' :
                       transaction.type === 'invoice' ? 'Invoice' :
                       transaction.type === 'credit_note' ? 'Credit Note' :
                       transaction.type === 'debit_note' ? 'Debit Note' :
                       transaction.type || 'Transaction'

        tableData.push([
          `${transaction.document_number || `#${index + 1}`}, ${docType}`,
          formatDate(transaction.date),
          docType,
          transaction.debit > 0 ? formatAmount(transaction.debit) : '',
          transaction.credit > 0 ? formatAmount(transaction.credit) : '',
          formatAmount(Math.abs(transaction.balance))
        ])
      })
    }

    autoTable(doc, {
      startY: yPos,
      head: [['# Id', 'Date', 'Mode', 'Debit (-)', 'Credit (+)', 'Closing Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249], // Light gray
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'left' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'right', fontStyle: 'normal' },
        4: { cellWidth: 25, halign: 'right', fontStyle: 'normal' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        // First row is opening balance - make it different
        if (data.row.index === 0 && data.section === 'body') {
          data.cell.styles.fillColor = [219, 234, 254] // Light blue
          data.cell.styles.fontStyle = 'bold'
        }

        // Color for debit column (red) - only if value exists
        if (data.column.index === 3 && data.cell.raw && data.section === 'body' && data.row.index !== 0) {
          data.cell.styles.textColor = [220, 38, 38]
        }

        // Color for credit column (green) - only if value exists
        if (data.column.index === 4 && data.cell.raw && data.section === 'body' && data.row.index !== 0) {
          data.cell.styles.textColor = [22, 163, 74]
        }

        // Color for closing balance (red for all rows except opening)
        if (data.column.index === 5 && data.section === 'body' && data.row.index !== 0) {
          data.cell.styles.textColor = [220, 38, 38]
        }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Very light gray for alternate rows
      }
    })

    // Footer
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : yPos + 50
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('This is a computer generated document and requires no signature.', pageWidth / 2, finalY, { align: 'center' })

    // Save PDF
    const fileName = `${customer.name}-Ledger-${new Date().getTime()}.pdf`
    doc.save(fileName)
    success('Ledger PDF downloaded successfully')
  }

  // Status badge function removed as per requirement to simplify workflow

  const getTransactionIcon = (type) => {
    const icons = {
      invoice: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      payment: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      credit_note: (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" clipRule="evenodd" />
        </svg>
      ),
      debit_note: (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM13 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm-5 5a.5.5 0 11-1 0 .5.5 0 011 0z" clipRule="evenodd" />
        </svg>
      ),
      sales_order: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      quotation: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    return icons[type] || icons.invoice
  }

  // Options for custom Select components
  const transactionTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'payment', label: 'Payments' },
    { value: 'credit_note', label: 'Credit Notes' },
    { value: 'debit_note', label: 'Debit Notes' },
    { value: 'sales_order', label: 'Sales Orders' },
    { value: 'quotation', label: 'Quotations' }
  ]

  // Status options removed as per requirement to simplify workflow

  if (loading || !customer) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{customer.name} - Ledger</h1>
          <p className="text-slate-600 mt-1">
            {customer.customer_type.toUpperCase()} Customer • {customer.customer_code}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/sales/customers/${customerId}`)}
          >
            Back to Customer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={generateLedgerPDF}
            disabled={!customer || !summary}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          >
            Download Ledger PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Current Balance Card */}
          <div className={`rounded-xl shadow-sm border p-6 ${
            summary.current_balance >= 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Current Balance</h3>
              <svg className={`w-8 h-8 ${summary.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className={`text-3xl font-bold mb-2 ${summary.current_balance >= 0 ? 'text-red-700' : 'text-green-700'}`}>
              {formatCurrency(Math.abs(summary.current_balance))}
              <span className="text-lg ml-2">
                {summary.current_balance >= 0 ? '(Dr)' : '(Cr)'}
              </span>
            </div>
            <p className={`text-sm font-medium ${summary.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.current_balance >= 0 ? 'Customer owes you' : 'You owe customer'}
            </p>
          </div>

          {/* Pending Invoices Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pending Invoices</h3>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-blue-700 mb-2">
              {transactions.filter(t => t.type === 'invoice' && t.balance > 0).length}
            </div>
            <p className="text-sm font-medium text-blue-600">
              {transactions.filter(t => t.type === 'invoice' && t.balance > 0).length === 1 ? 'invoice' : 'invoices'} pending payment
            </p>
          </div>

          {/* Overdue Amount Card */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Overdue Amount</h3>
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-orange-700 mb-2">
              {(() => {
                const today = new Date()
                const overdueAmount = transactions
                  .filter(t =>
                    t.type === 'invoice' &&
                    t.balance > 0 &&
                    t.due_date &&
                    new Date(t.due_date) < today
                  )
                  .reduce((sum, t) => sum + t.balance, 0)
                return formatCurrency(overdueAmount)
              })()}
            </div>
            <p className="text-sm font-medium text-orange-600">
              {(() => {
                const today = new Date()
                const overdueCount = transactions.filter(t =>
                  t.type === 'invoice' &&
                  t.balance > 0 &&
                  t.due_date &&
                  new Date(t.due_date) < today
                ).length
                return overdueCount > 0 ? 'Action required - Past due' : 'No overdue invoices'
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Type</label>
            <Select
              value={filters.transactionType}
              onChange={(value) => handleFilterChange('transactionType', value)}
              options={transactionTypeOptions}
              className="text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ dateFrom: '', dateTo: '', transactionType: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Combined Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Customer Ledger</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implement export functionality
                showError('Export functionality coming soon')
              }}
            >
              Export
            </Button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No transactions found</h3>
            <p className="text-slate-600 mb-4">
              {Object.values(filters).some(v => v) 
                ? 'No transactions match your current filters.'
                : 'No transactions recorded for this customer yet.'
              }
            </p>
            <Button
              variant="primary"
              onClick={() => router.push(`/sales/invoices/new?customer=${customerId}`)}
            >
              Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {/* Opening Balance Row */}
                <tr className="bg-blue-50">
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900">
                    {customer.created_at ? formatDate(customer.created_at) : 'N/A'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          Opening Balance
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                    {summary.opening_balance >= 0 ? formatCurrency(summary.opening_balance) : '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                    {summary.opening_balance < 0 ? formatCurrency(Math.abs(summary.opening_balance)) : '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <span className={summary.opening_balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(Math.abs(summary.opening_balance))}
                      <span className="ml-1 text-xs">
                        {summary.opening_balance >= 0 ? '(Dr)' : '(Cr)'}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center text-sm font-medium">
                    -
                  </td>
                </tr>

                {/* Transaction Rows */}
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(transaction.date)}
                      {transaction.due_date && (
                        <div className="text-xs text-slate-500 mt-1">
                          Due: {formatDate(transaction.due_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {transaction.document_number}
                          </div>
                          <div className="text-sm text-slate-500">
                            {transaction.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                      {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                      {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <span className={transaction.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(transaction.balance))}
                        <span className="ml-1 text-xs">
                          {transaction.balance >= 0 ? '(Dr)' : '(Cr)'}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => {
                          // Navigate to document based on type
                          if (transaction.type === 'invoice') {
                            router.push(`/sales/invoices/${transaction.id}`)
                          } else if (transaction.type === 'payment') {
                            router.push(`/sales/payments/${transaction.id}`)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Summary Row */}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900">
                    {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          Current Balance
                        </div>
                        <div className="text-xs text-slate-500">
                          Calculation: Opening Balance + Total Sales - Total Payments
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {summary.opening_balance >= 0 ? formatCurrency(summary.opening_balance) : formatCurrency(0)} 
                          {summary.opening_balance >= 0 ? ' (Dr)' : ' (Cr)'} + 
                          {formatCurrency(summary.total_sales)} (Dr) - 
                          {formatCurrency(summary.total_payments)} (Cr) = 
                          <span className={summary.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {' '}{formatCurrency(Math.abs(summary.current_balance))}
                            {summary.current_balance >= 0 ? ' (Dr)' : ' (Cr)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                    {summary.current_balance >= 0 ? formatCurrency(summary.current_balance) : '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                    {summary.current_balance < 0 ? formatCurrency(Math.abs(summary.current_balance)) : '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-right">
                    <span className={summary.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(Math.abs(summary.current_balance))}
                      <span className="ml-1 text-xs">
                        {summary.current_balance >= 0 ? '(Dr)' : '(Cr)'}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center text-sm font-medium">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Information for B2B */}
      {customer.customer_type === 'b2b' && summary && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Credit Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Credit Limit</label>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.credit_limit)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Available Credit</label>
              <p className={`text-xl font-bold ${summary.available_credit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(summary.available_credit))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Credit Utilization</label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (summary.current_balance / (summary.credit_limit || 1)) > 0.8 ? 'bg-red-500' : 
                      (summary.current_balance / (summary.credit_limit || 1)) > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (summary.current_balance / (summary.credit_limit || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {summary.credit_limit ? Math.round((summary.current_balance / summary.credit_limit) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerLedger
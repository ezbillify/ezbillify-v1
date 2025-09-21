// hooks/useReports.js
import { useState } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../services/utils/supabase'

export const useReports = () => {
  const { company } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateSalesReport = async (dateRange) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales_documents')
        .select(`
          *,
          customers (
            id,
            name,
            gstin
          )
        `)
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Calculate totals
      const totalSales = data.reduce((sum, doc) => sum + (doc.total_amount || 0), 0)
      const totalTax = data.reduce((sum, doc) => sum + (doc.total_tax || 0), 0)
      const totalInvoices = data.length

      return { 
        success: true, 
        data: {
          invoices: data,
          summary: {
            totalSales,
            totalTax,
            totalInvoices,
            avgInvoiceValue: totalInvoices > 0 ? totalSales / totalInvoices : 0
          }
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const generatePurchaseReport = async (dateRange) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchase_documents')
        .select(`
          *,
          vendors (
            id,
            name,
            gstin
          )
        `)
        .eq('company_id', company.id)
        .eq('document_type', 'bill')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Calculate totals
      const totalPurchases = data.reduce((sum, doc) => sum + (doc.total_amount || 0), 0)
      const totalTax = data.reduce((sum, doc) => sum + (doc.total_tax || 0), 0)
      const totalBills = data.length

      return { 
        success: true, 
        data: {
          bills: data,
          summary: {
            totalPurchases,
            totalTax,
            totalBills,
            avgBillValue: totalBills > 0 ? totalPurchases / totalBills : 0
          }
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const generateInventoryReport = async () => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (error) throw error
      
      // Calculate inventory value
      const totalItems = data.length
      const totalStockValue = data.reduce((sum, item) => {
        return sum + ((item.current_stock || 0) * (item.purchase_rate || 0))
      }, 0)
      
      const lowStockItems = data.filter(item => 
        item.current_stock <= (item.reorder_level || 0)
      )

      return { 
        success: true, 
        data: {
          items: data,
          summary: {
            totalItems,
            totalStockValue,
            lowStockItems: lowStockItems.length,
            outOfStockItems: data.filter(item => item.current_stock === 0).length
          },
          lowStockItems
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const generateCustomerReport = async (dateRange = null) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      // Get customers with their invoice data
      let invoiceQuery = supabase
        .from('sales_documents')
        .select('customer_id, total_amount, created_at')
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')

      if (dateRange) {
        invoiceQuery = invoiceQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data: invoices, error: invoiceError } = await invoiceQuery

      if (invoiceError) throw invoiceError

      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)

      if (customerError) throw customerError

      // Calculate customer-wise sales
      const customerSales = customers.map(customer => {
        const customerInvoices = invoices.filter(inv => inv.customer_id === customer.id)
        const totalSales = customerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
        const invoiceCount = customerInvoices.length

        return {
          ...customer,
          totalSales,
          invoiceCount,
          avgInvoiceValue: invoiceCount > 0 ? totalSales / invoiceCount : 0,
          lastInvoiceDate: customerInvoices.length > 0 
            ? new Date(Math.max(...customerInvoices.map(inv => new Date(inv.created_at))))
            : null
        }
      })

      // Sort by total sales
      customerSales.sort((a, b) => b.totalSales - a.totalSales)

      return { 
        success: true, 
        data: {
          customers: customerSales,
          summary: {
            totalCustomers: customers.length,
            activeCustomers: customerSales.filter(c => c.invoiceCount > 0).length,
            topCustomers: customerSales.slice(0, 10),
            totalSales: customerSales.reduce((sum, c) => sum + c.totalSales, 0)
          }
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const generateGSTReport = async (dateRange) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      // Get sales invoices for GST
      const { data: salesInvoices, error: salesError } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)

      if (salesError) throw salesError

      // Get purchase bills for GST
      const { data: purchaseBills, error: purchaseError } = await supabase
        .from('purchase_documents')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'bill')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)

      if (purchaseError) throw purchaseError

      // Calculate GST summary
      const outputGST = salesInvoices.reduce((sum, inv) => sum + (inv.total_tax || 0), 0)
      const inputGST = purchaseBills.reduce((sum, bill) => sum + (bill.total_tax || 0), 0)
      const netGST = outputGST - inputGST

      return { 
        success: true, 
        data: {
          salesInvoices,
          purchaseBills,
          summary: {
            outputGST,
            inputGST,
            netGST,
            totalSales: salesInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
            totalPurchases: purchaseBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0)
          }
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const generateProfitLossReport = async (dateRange) => {
    if (!company) return { success: false, error: 'No company found' }

    setLoading(true)
    try {
      // Get revenue (sales)
      const { data: salesData } = await supabase
        .from('sales_documents')
        .select('total_amount, total_tax')
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)

      // Get expenses (purchases)
      const { data: purchaseData } = await supabase
        .from('purchase_documents')
        .select('total_amount, total_tax')
        .eq('company_id', company.id)
        .eq('document_type', 'bill')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)

      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const totalExpenses = purchaseData.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0)
      const grossProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

      return { 
        success: true, 
        data: {
          revenue: {
            sales: totalRevenue,
            other: 0, // Add other revenue sources
            total: totalRevenue
          },
          expenses: {
            purchases: totalExpenses,
            operational: 0, // Add operational expenses
            total: totalExpenses
          },
          profit: {
            gross: grossProfit,
            net: grossProfit, // Add tax calculations
            margin: profitMargin
          }
        }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    generateSalesReport,
    generatePurchaseReport,
    generateInventoryReport,
    generateCustomerReport,
    generateGSTReport,
    generateProfitLossReport
  }
}

export default useReports
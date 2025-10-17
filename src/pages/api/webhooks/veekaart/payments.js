// pages/api/webhooks/veekaart/payments.js
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Extract API Key from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header'
      })
    }

    const api_key = authHeader.replace('Bearer ', '')

    // Find company by API key
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('api_key', api_key)
      .single()

    if (companyError || !company) {
      console.error('Company lookup error:', companyError)
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      })
    }

    // Extract payment data from request body
    const {
      order_id,
      payment_status,
      payment_method,
      payment_date,
      amount
    } = req.body

    // Validate required fields
    if (!order_id || !payment_status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, payment_status'
      })
    }

    // Find sales document by reference_number (veekaart order_id)
    const { data: salesDoc, error: docError } = await supabase
      .from('sales_documents')
      .select('id, total_amount, paid_amount')
      .eq('company_id', company.id)
      .eq('reference_number', order_id)
      .single()

    if (docError) {
      console.error('Error finding sales document:', docError)
      return res.status(404).json({
        success: false,
        error: 'Order not found in Ezbillify'
      })
    }

    // Calculate paid and balance amounts
    let paid_amount = salesDoc.paid_amount || 0
    let balance_amount = salesDoc.total_amount - paid_amount

    if (payment_status === 'paid') {
      paid_amount = parseFloat(amount) || salesDoc.total_amount
      balance_amount = 0
    } else if (payment_status === 'partial') {
      paid_amount = (salesDoc.paid_amount || 0) + (parseFloat(amount) || 0)
      balance_amount = salesDoc.total_amount - paid_amount
    } else if (payment_status === 'unpaid') {
      paid_amount = 0
      balance_amount = salesDoc.total_amount
    }

    // Update sales document with payment status
    const { data: updatedDoc, error: updateError } = await supabase
      .from('sales_documents')
      .update({
        payment_status: payment_status || 'unpaid',
        paid_amount: paid_amount,
        balance_amount: balance_amount,
        notes: `Payment Method: ${payment_method || 'COD'}\nPayment Date: ${payment_date || new Date().toISOString().split('T')[0]}\nVeekaart Order ID: ${order_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', salesDoc.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      throw updateError
    }

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${payment_status}`,
      data: {
        document_id: updatedDoc.id,
        document_number: updatedDoc.document_number,
        order_id: order_id,
        payment_status: payment_status,
        paid_amount: paid_amount,
        balance_amount: balance_amount
      }
    })

  } catch (error) {
    console.error('Error in payments webhook:', error.message, error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}
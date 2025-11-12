// src/pages/api/gst/e-invoices/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase';
import { withAuth } from '../../../../lib/middleware';
import gstService from '../../../../services/gstService';

async function handler(req, res) {
  const { method } = req;
  const { company_id } = req.query;

  switch (method) {
    case 'GET':
      return await getEInvoices(req, res);
    case 'POST':
      return await generateEInvoice(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        error: `Method ${method} not allowed`
      });
  }
}

// Get e-Invoices for a company
async function getEInvoices(req, res) {
  const { company_id, search, status, sort_by, sort_order } = req.query;

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    });
  }

  try {
    // First get GST credentials
    const credentialsResult = await gstService.getCredentials(company_id);
    if (!credentialsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch GST credentials'
      });
    }

    if (!credentialsResult.data) {
      return res.status(400).json({
        success: false,
        error: 'GST credentials not found. Please connect your GST account first.'
      });
    }

    // In a real implementation, you would fetch actual e-invoices from the Whitebooks API
    // For now, we'll return an empty array since this is a mock implementation
    const eInvoices = [];

    return res.status(200).json({
      success: true,
      data: eInvoices
    });
  } catch (error) {
    console.error('Error fetching e-Invoices:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch e-Invoices'
    });
  }
}

// Generate e-Invoice
async function generateEInvoice(req, res) {
  const { company_id, invoice_id, invoice_data } = req.body;

  if (!company_id || !invoice_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and Invoice ID are required'
    });
  }

  try {
    // First get GST credentials
    const credentialsResult = await gstService.getCredentials(company_id);
    if (!credentialsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch GST credentials'
      });
    }

    if (!credentialsResult.data) {
      return res.status(400).json({
        success: false,
        error: 'GST credentials not found. Please connect your GST account first.'
      });
    }

    const credentials = credentialsResult.data;

    // In a real implementation, you would:
    // 1. Fetch the actual invoice data from your database
    // 2. Format it according to GST e-Invoice schema
    // 3. Call the Whitebooks API to generate the e-Invoice
    // 4. Store the e-Invoice details in your database

    // For now, we'll simulate the process
    const result = await gstService.generateEInvoice(credentials, invoice_data || {});

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate e-Invoice'
      });
    }

    // In a real implementation, you would store these details in your database
    const eInvoiceData = {
      id: 'einv_' + Date.now(),
      company_id,
      invoice_id,
      irn: result.data.irn,
      ack_no: result.data.ack_no,
      ack_date: result.data.ack_date,
      qr_code: result.data.qr_code,
      status: 'generated',
      created_at: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: eInvoiceData,
      message: 'e-Invoice generated successfully'
    });
  } catch (error) {
    console.error('Error generating e-Invoice:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate e-Invoice'
    });
  }
}

export default withAuth(handler);
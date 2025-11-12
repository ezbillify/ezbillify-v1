// src/pages/api/gst/e-way-bills/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase';
import { withAuth } from '../../../../lib/middleware';
import gstService from '../../../../services/gstService';

async function handler(req, res) {
  const { method } = req;
  const { company_id } = req.query;

  switch (method) {
    case 'GET':
      return await getEWayaBills(req, res);
    case 'POST':
      return await generateEWayaBill(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        error: `Method ${method} not allowed`
      });
  }
}

// Get e-Way Bills for a company
async function getEWayaBills(req, res) {
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

    // In a real implementation, you would fetch actual e-way bills from the Whitebooks API
    // For now, we'll return an empty array since this is a mock implementation
    const eWayBills = [];

    return res.status(200).json({
      success: true,
      data: eWayBills
    });
  } catch (error) {
    console.error('Error fetching e-Way Bills:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch e-Way Bills'
    });
  }
}

// Generate e-Way Bill
async function generateEWayaBill(req, res) {
  const { company_id, invoice_id, eway_bill_data } = req.body;

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
    // 2. Format it according to GST e-Way Bill schema
    // 3. Call the Whitebooks API to generate the e-Way Bill
    // 4. Store the e-Way Bill details in your database

    // For now, we'll simulate the process
    const result = await gstService.generateEWayaBill(credentials, eway_bill_data || {});

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate e-Way Bill'
      });
    }

    // In a real implementation, you would store these details in your database
    const eWayBillData = {
      id: 'eway_' + Date.now(),
      company_id,
      invoice_id,
      eway_bill_no: result.data.ewayBillNo,
      eway_bill_date: result.data.ewayBillDate,
      valid_upto: result.data.validUpto,
      qr_code: result.data.qr_code,
      status: 'generated',
      created_at: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: eWayBillData,
      message: 'e-Way Bill generated successfully'
    });
  } catch (error) {
    console.error('Error generating e-Way Bill:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate e-Way Bill'
    });
  }
}

export default withAuth(handler);
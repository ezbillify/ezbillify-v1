// src/pages/api/gst/credentials.js
import { supabaseAdmin } from '../../../services/utils/supabase';
import { withAuth } from '../../../lib/middleware';

async function handler(req, res) {
  const { method } = req;
  const { company_id } = req.query;

  switch (method) {
    case 'GET':
      return await getCredentials(req, res);
    case 'POST':
      return await saveCredentials(req, res);
    case 'DELETE':
      return await deleteCredentials(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({
        success: false,
        error: `Method ${method} not allowed`
      });
  }
}

// Get GST credentials for a company
async function getCredentials(req, res) {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('gst_credentials')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (error) {
      // If no credentials found, return success with null data
      if (error.code === 'PGRST116') {
        return res.status(200).json({
          success: true,
          data: null
        });
      }
      throw error;
    }

    // Don't send password back to client
    const credentials = {
      ...data,
      password: undefined,
      asppassword: undefined,
      client_secret: undefined
    };

    return res.status(200).json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('Error fetching GST credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GST credentials'
    });
  }
}

// Save GST credentials for a company
async function saveCredentials(req, res) {
  const {
    company_id,
    gstin,
    username,
    password,
    client_id,
    client_secret,
    is_sandbox,
    provider // Add provider field
  } = req.body;

  if (!company_id || !gstin) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and GSTIN are required'
    });
  }

  // Validate required fields for Whitebooks
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  try {
    // Check if credentials already exist for this company
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('gst_credentials')
      .select('id')
      .eq('company_id', company_id)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing credentials
      result = await supabaseAdmin
        .from('gst_credentials')
        .update({
          gstin,
          username: username || null,
          password: password || null, // In a real implementation, this should be encrypted
          client_id: client_id || null,
          client_secret: client_secret || null, // In a real implementation, this should be encrypted
          is_sandbox: is_sandbox || false,
          provider: provider || 'whitebooks', // Default to whitebooks
          updated_at: new Date().toISOString()
        })
        .eq('company_id', company_id);
    } else {
      // Insert new credentials
      result = await supabaseAdmin
        .from('gst_credentials')
        .insert({
          company_id,
          gstin,
          username: username || null,
          password: password || null, // In a real implementation, this should be encrypted
          client_id: client_id || null,
          client_secret: client_secret || null, // In a real implementation, this should be encrypted
          is_sandbox: is_sandbox || false,
          provider: provider || 'whitebooks', // Default to whitebooks
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      throw result.error;
    }

    return res.status(200).json({
      success: true,
      message: 'GST credentials saved successfully'
    });
  } catch (error) {
    console.error('Error saving GST credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save GST credentials'
    });
  }
}

// Delete GST credentials for a company
async function deleteCredentials(req, res) {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    });
  }

  try {
    const { error } = await supabaseAdmin
      .from('gst_credentials')
      .delete()
      .eq('company_id', company_id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'GST credentials deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GST credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete GST credentials'
    });
  }
}

export default withAuth(handler);
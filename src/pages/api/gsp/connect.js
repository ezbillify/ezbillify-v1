// src/pages/api/gsp/connect.js
import { supabaseAdmin } from '../../../services/utils/supabase';
import { withAuth } from '../../../lib/middleware';

// Ezbillify's fixed Whitebooks client credentials (kept in backend only)
const WHITEBOOKS_CLIENT_ID = process.env.WHITEBOOKS_CLIENT_ID;
const WHITEBOOKS_CLIENT_SECRET = process.env.WHITEBOOKS_CLIENT_SECRET;
const WHITEBOOKS_MODE = process.env.WHITEBOOKS_MODE || 'production'; // 'sandbox' or 'production'

// Whitebooks API endpoints
const WHITEBOOKS_ENDPOINTS = {
  sandbox: 'https://sandbox.whitebooks.in',
  production: 'https://api.whitebooks.in'
};

const WHITEBOOKS_BASE_URL = WHITEBOOKS_ENDPOINTS[WHITEBOOKS_MODE] || WHITEBOOKS_ENDPOINTS.production;

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  const { business_id, gstin, username, password } = req.body;

  // Validate required fields (GSTIN is now auto-filled)
  if (!business_id || !gstin || !username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Business ID, GSTIN, username, and password are required'
    });
  }

  try {
    // Step 1: Get access token from Whitebooks using Ezbillify's credentials
    const tokenResponse = await fetch(`${WHITEBOOKS_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: WHITEBOOKS_CLIENT_ID,
        client_secret: WHITEBOOKS_CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Whitebooks token error:', errorText);
      throw new Error(`Failed to get access token from Whitebooks: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Step 2: Save connection details to Supabase
    const { data, error } = await supabaseAdmin
      .from('gsp_connections')
      .upsert({
        business_id: business_id,
        gstin: gstin,
        type: 'whitebooks',
        mode: WHITEBOOKS_MODE, // Store the mode used for this connection
        username: username,
        token: accessToken,
        expiry: new Date(Date.now() + expiresIn * 1000).toISOString()
      }, {
        onConflict: 'business_id,gstin'
      });

    if (error) {
      console.error('Supabase error:', error);
      // Handle case where table doesn't exist
      if (error.code === '42P01') { // Undefined table error
        return res.status(500).json({
          success: false,
          error: 'Database table not found. Please contact support.'
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: `Connected to Whitebooks ${WHITEBOOKS_MODE} successfully`
    });
  } catch (error) {
    console.error('Error connecting to Whitebooks:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Whitebooks'
    });
  }
}

export default withAuth(handler);
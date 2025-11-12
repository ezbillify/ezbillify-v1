// src/services/gstService.js
import { supabaseAdmin } from './utils/supabase';

class GSTService {
  // WhiteBooks API endpoints
  static WHITEBOOKS_SERVERS = {
    production: 'https://api.whitebooks.in',
    sandbox: 'https://sandbox.whitebooks.in'
  };

  // Get GST credentials for a company
  async getCredentials(companyId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('gst_credentials')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching GST credentials:', error);
      return { success: false, error: error.message };
    }
  }

  // Get the appropriate server URL based on credentials and provider
  getServerUrl(credentials, endpoint = '') {
    // For Whitebooks GSP connections, use the mode from environment or default to production
    const mode = process.env.WHITEBOOKS_MODE || 'production';
    const baseUrl = mode === 'sandbox' 
      ? this.WHITEBOOKS_SERVERS.sandbox 
      : this.WHITEBOOKS_SERVERS.production;
    return `${baseUrl}${endpoint}`;
  }

  // Generate auth token for WhiteBooks API
  async generateWhiteBooksAuthToken(credentials) {
    try {
      const serverUrl = this.getServerUrl(credentials);
      const url = `${serverUrl}/api/v1/auth/token`;
      
      // For WhiteBooks, we need to make a POST request with client credentials
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          grant_type: 'client_credentials'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        data: {
          auth_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          expiry: new Date(Date.now() + data.expires_in * 1000).toISOString()
        }
      };
    } catch (error) {
      console.error('Error generating WhiteBooks auth token:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate auth token based on provider
  async generateAuthToken(credentials) {
    return await this.generateWhiteBooksAuthToken(credentials);
  }

  // Generate e-Invoice
  async generateEInvoice(credentials, invoiceData) {
    try {
      // First get auth token
      const authResult = await this.generateAuthToken(credentials);
      if (!authResult.success) {
        return authResult;
      }

      const authToken = authResult.data.auth_token;
      const serverUrl = this.getServerUrl(credentials);
      
      // WhiteBooks e-Invoice API
      const url = `${serverUrl}/api/v1/einvoice/generate`;
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const body = JSON.stringify(invoiceData);

      // In a real implementation, you would make the actual API call
      console.log('Generating e-Invoice with URL:', url);
      console.log('Invoice data:', invoiceData);
      
      // Simulate API response
      return {
        success: true,
        data: {
          irn: 'sample_irn_' + Date.now(),
          ack_no: 'sample_ack_no_' + Date.now(),
          ack_date: new Date().toISOString(),
          qr_code: 'sample_qr_code_data',
          signed_invoice: 'sample_signed_invoice_data'
        }
      };
    } catch (error) {
      console.error('Error generating e-Invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate e-Way Bill
  async generateEWayaBill(credentials, ewayBillData) {
    try {
      // First get auth token
      const authResult = await this.generateAuthToken(credentials);
      if (!authResult.success) {
        return authResult;
      }

      const authToken = authResult.data.auth_token;
      const serverUrl = this.getServerUrl(credentials);
      
      // WhiteBooks e-Way Bill API
      const url = `${serverUrl}/api/v1/ewaybill/generate`;
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const body = JSON.stringify(ewayBillData);

      // In a real implementation, you would make the actual API call
      console.log('Generating e-Way Bill with URL:', url);
      console.log('e-Way Bill data:', ewayBillData);
      
      // Simulate API response
      return {
        success: true,
        data: {
          ewayBillNo: 'sample_eway_bill_no_' + Date.now(),
          ewayBillDate: new Date().toISOString(),
          validUpto: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
          qr_code: 'sample_qr_code_data'
        }
      };
    } catch (error) {
      console.error('Error generating e-Way Bill:', error);
      return { success: false, error: error.message };
    }
  }
}

const gstService = new GSTService();
export default gstService;
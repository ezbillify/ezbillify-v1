// pages/api/companies/setup.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple auth helper - gets user from Authorization header
async function getUserFromAuth(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Get user from Supabase using the token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get user from auth header
    const user = await getUserFromAuth(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized - Invalid token' });
    }

    console.log('✅ User authenticated:', user.id);

    const {
      name,
      email,
      phone,
      gstin,
      pan,
      tan,
      cin,
      business_type,
      address,
      billing_address,
      website,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    console.log('📝 Creating company:', name);

    // Check if email already exists
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check email error:', checkError);
      return res.status(400).json({ success: false, error: 'Database error: ' + checkError.message });
    }

    if (existingCompany) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([
        {
          name,
          email,
          phone: phone || null,
          gstin: gstin || null,
          pan: pan || null,
          tan: tan || null,
          cin: cin || null,
          business_type: business_type || 'proprietorship',
          address: address || {},
          billing_address: billing_address || {},
          website: website || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ])
      .select()
      .single();

    if (companyError) {
      console.error('❌ Company creation error:', companyError);
      return res.status(400).json({ success: false, error: 'Failed to create company: ' + companyError.message });
    }

    console.log('✅ Company created:', company.id);

    // Create default branch for the company
    const branchPrefix = name.substring(0, 3).toUpperCase();
    
    console.log('📍 Creating branch...');

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert([
        {
          company_id: company.id,
          name: `${name} - Main Branch`,
          address: address || {},
          billing_address: billing_address || {},
          document_prefix: branchPrefix,
          document_number_counter: 1,
          phone: phone || null,
          email: email || null,
          is_active: true,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ])
      .select()
      .single();

    if (branchError) {
      console.error('❌ Branch creation failed:', {
        message: branchError.message,
        code: branchError.code,
        details: branchError.details,
      });
      
      // Still return success - company is created even if branch fails
      return res.status(201).json({
        success: true,
        data: {
          company,
          branch: null,
        },
        message: 'Company created but branch creation had issues',
      });
    }

    console.log('✅ Branch created:', branch.id);

    // Update user with company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({
        company_id: company.id,
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (userError) {
      console.error('User update error:', userError);
      // Don't fail - company and branch already created
    }

    console.log('✅ Setup complete');

    return res.status(201).json({
      success: true,
      data: {
        company,
        branch,
      },
      message: 'Company and branch created successfully',
    });
  } catch (error) {
    console.error('❌ Company setup error:', error);
    console.error('Error message:', error.message);
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}
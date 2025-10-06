// src/pages/api/vendors/index.js
import { query } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/middleware';

export default async function handler(req, res) {
  try {
    const { user, company } = await authenticateRequest(req);

    if (req.method === 'GET') {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = 'active',
        sort_by = 'vendor_name',
        sort_order = 'asc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build WHERE clause
      let whereConditions = ['company_id = $1'];
      let params = [company.id];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereConditions.push(`(
          vendor_name ILIKE $${paramCount} OR 
          vendor_code ILIKE $${paramCount} OR 
          email ILIKE $${paramCount} OR
          gstin ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereConditions.push(`status = $${paramCount}`);
        params.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM vendors WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get vendors
      const allowedSortFields = ['vendor_name', 'vendor_code', 'created_at', 'email'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'vendor_name';
      const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      params.push(parseInt(limit), offset);
      const vendorsResult = await query(
        `SELECT 
          id, vendor_code, vendor_name, display_name, email, phone, mobile,
          gstin, pan, billing_address, opening_balance, status, 
          vendor_category, credit_limit, payment_terms, created_at
        FROM vendors 
        WHERE ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.status(200).json({
        success: true,
        data: vendorsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    if (req.method === 'POST') {
      const {
        vendor_name,
        display_name,
        email,
        phone,
        mobile,
        website,
        contact_person,
        designation,
        gstin,
        pan,
        tan,
        business_type,
        billing_address,
        shipping_address,
        credit_limit,
        payment_terms,
        tax_preference,
        bank_details,
        opening_balance,
        opening_balance_type,
        vendor_category,
        tags,
        notes
      } = req.body;

      // Validation
      if (!vendor_name) {
        return res.status(400).json({
          success: false,
          error: 'Vendor name is required'
        });
      }

      // Get next vendor code
      const codeResult = await query(
        `SELECT vendor_code FROM vendors 
         WHERE company_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [company.id]
      );

      let nextCode = 'VEN-0001';
      if (codeResult.rows.length > 0) {
        const lastCode = codeResult.rows[0].vendor_code;
        const match = lastCode.match(/VEN-(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          nextCode = `VEN-${String(nextNum).padStart(4, '0')}`;
        }
      }

      const result = await query(
        `INSERT INTO vendors (
          company_id, vendor_code, vendor_name, display_name, email, phone, mobile,
          website, contact_person, designation, gstin, pan, tan, business_type,
          billing_address, shipping_address, credit_limit, payment_terms,
          tax_preference, bank_details, opening_balance, opening_balance_type,
          vendor_category, tags, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
          company.id, nextCode, vendor_name, display_name || vendor_name, 
          email, phone, mobile, website, contact_person, designation,
          gstin, pan, tan, business_type,
          JSON.stringify(billing_address || {}),
          JSON.stringify(shipping_address || {}),
          credit_limit || 0, payment_terms || 30, tax_preference || 'taxable',
          JSON.stringify(bank_details || {}),
          opening_balance || 0, opening_balance_type || 'credit',
          vendor_category, tags || [], notes
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Vendor created successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Vendor API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
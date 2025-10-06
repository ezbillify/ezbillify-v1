// src/pages/api/vendors/[id].js
import { query } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/middleware';

export default async function handler(req, res) {
  try {
    const { user, company } = await authenticateRequest(req);
    const { id } = req.query;

    if (req.method === 'GET') {
      const result = await query(
        `SELECT * FROM vendors WHERE id = $1 AND company_id = $2`,
        [id, company.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    if (req.method === 'PUT') {
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
        status,
        vendor_category,
        tags,
        notes
      } = req.body;

      const result = await query(
        `UPDATE vendors SET
          vendor_name = COALESCE($1, vendor_name),
          display_name = COALESCE($2, display_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          mobile = COALESCE($5, mobile),
          website = COALESCE($6, website),
          contact_person = COALESCE($7, contact_person),
          designation = COALESCE($8, designation),
          gstin = COALESCE($9, gstin),
          pan = COALESCE($10, pan),
          tan = COALESCE($11, tan),
          business_type = COALESCE($12, business_type),
          billing_address = COALESCE($13, billing_address),
          shipping_address = COALESCE($14, shipping_address),
          credit_limit = COALESCE($15, credit_limit),
          payment_terms = COALESCE($16, payment_terms),
          tax_preference = COALESCE($17, tax_preference),
          bank_details = COALESCE($18, bank_details),
          status = COALESCE($19, status),
          vendor_category = COALESCE($20, vendor_category),
          tags = COALESCE($21, tags),
          notes = COALESCE($22, notes),
          updated_at = NOW()
        WHERE id = $23 AND company_id = $24
        RETURNING *`,
        [
          vendor_name, display_name, email, phone, mobile, website,
          contact_person, designation, gstin, pan, tan, business_type,
          billing_address ? JSON.stringify(billing_address) : null,
          shipping_address ? JSON.stringify(shipping_address) : null,
          credit_limit, payment_terms, tax_preference,
          bank_details ? JSON.stringify(bank_details) : null,
          status, vendor_category, tags, notes,
          id, company.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Vendor updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      // Check if vendor has any transactions
      const checkResult = await query(
        `SELECT COUNT(*) as count FROM purchase_documents WHERE vendor_id = $1`,
        [id]
      );

      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete vendor with existing transactions. Please deactivate instead.'
        });
      }

      const result = await query(
        `DELETE FROM vendors WHERE id = $1 AND company_id = $2 RETURNING id`,
        [id, company.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully'
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
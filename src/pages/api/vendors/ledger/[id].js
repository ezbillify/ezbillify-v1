// src/pages/api/vendors/ledger/[id].js
import { query } from '../../../../lib/db';
import { authenticateRequest } from '../../../../lib/middleware';

export default async function handler(req, res) {
  try {
    const { user, company } = await authenticateRequest(req);
    const { id: vendorId } = req.query;

    if (req.method === 'GET') {
      const {
        date_from,
        date_to,
        transaction_type = 'all',
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Verify vendor belongs to company
      const vendorCheck = await query(
        `SELECT id FROM vendors WHERE id = $1 AND company_id = $2`,
        [vendorId, company.id]
      );

      if (vendorCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        });
      }

      // Build the transactions query
      let whereConditions = ['1=1'];
      let params = [];
      let paramCount = 0;

      if (date_from) {
        paramCount++;
        whereConditions.push(`transaction_date >= $${paramCount}`);
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`transaction_date <= $${paramCount}`);
        params.push(date_to);
      }

      if (transaction_type && transaction_type !== 'all') {
        paramCount++;
        whereConditions.push(`transaction_type = $${paramCount}`);
        params.push(transaction_type);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get transactions with running balance
      const transactionsQuery = `
        WITH vendor_transactions AS (
          -- Purchase documents (bills, purchase orders, returns)
          SELECT 
            pd.id,
            pd.document_date as transaction_date,
            pd.document_type as transaction_type,
            pd.document_number,
            pd.vendor_invoice_number,
            CASE 
              WHEN pd.document_type IN ('bill', 'purchase_order') THEN pd.total_amount
              ELSE 0
            END as debit_amount,
            CASE 
              WHEN pd.document_type = 'purchase_return' THEN pd.total_amount
              ELSE 0
            END as credit_amount,
            pd.notes
          FROM purchase_documents pd
          WHERE pd.vendor_id = $1 AND pd.company_id = $2
          
          UNION ALL
          
          -- Payments
          SELECT 
            p.id,
            p.payment_date as transaction_date,
            'payment' as transaction_type,
            p.payment_number as document_number,
            p.reference_number as vendor_invoice_number,
            0 as debit_amount,
            p.amount as credit_amount,
            p.notes
          FROM payments p
          WHERE p.vendor_id = $1 AND p.company_id = $2 AND p.payment_type = 'payment_made'
        ),
        filtered_transactions AS (
          SELECT * FROM vendor_transactions
          WHERE ${whereClause}
        ),
        running_balance AS (
          SELECT *,
            SUM(debit_amount - credit_amount) OVER (ORDER BY transaction_date, id) as balance
          FROM filtered_transactions
        )
        SELECT * FROM running_balance
        ORDER BY transaction_date DESC, id DESC
        LIMIT $${paramCount + 3} OFFSET $${paramCount + 4}
      `;

      params.unshift(vendorId, company.id);
      params.push(parseInt(limit), offset);

      const transactionsResult = await query(transactionsQuery, params);

      // Get total count
      const countQuery = `
        WITH vendor_transactions AS (
          SELECT id FROM purchase_documents 
          WHERE vendor_id = $1 AND company_id = $2
          UNION ALL
          SELECT id FROM payments 
          WHERE vendor_id = $1 AND company_id = $2 AND payment_type = 'payment_made'
        )
        SELECT COUNT(*) as total FROM vendor_transactions
        WHERE ${whereClause}
      `;

      const countResult = await query(countQuery, [vendorId, company.id, ...params.slice(2, -2)]);
      const total = parseInt(countResult.rows[0]?.total || 0);

      // Calculate summary
      const summaryQuery = `
        SELECT 
          v.opening_balance,
          COALESCE(SUM(CASE WHEN pd.document_type IN ('bill', 'purchase_order') THEN pd.total_amount ELSE 0 END), 0) as total_purchases,
          COALESCE(SUM(CASE WHEN pd.document_type = 'purchase_return' THEN pd.total_amount ELSE 0 END), 0) as total_returns,
          COALESCE(SUM(p.amount), 0) as total_payments
        FROM vendors v
        LEFT JOIN purchase_documents pd ON pd.vendor_id = v.id AND pd.company_id = v.company_id
        LEFT JOIN payments p ON p.vendor_id = v.id AND p.company_id = v.company_id AND p.payment_type = 'payment_made'
        WHERE v.id = $1 AND v.company_id = $2
        GROUP BY v.id, v.opening_balance
      `;

      const summaryResult = await query(summaryQuery, [vendorId, company.id]);
      const summary = summaryResult.rows[0] || {};

      const closingBalance = parseFloat(summary.opening_balance || 0) + 
                           parseFloat(summary.total_purchases || 0) - 
                           parseFloat(summary.total_returns || 0) - 
                           parseFloat(summary.total_payments || 0);

      return res.status(200).json({
        success: true,
        data: {
          transactions: transactionsResult.rows,
          total,
          summary: {
            opening_balance: parseFloat(summary.opening_balance || 0),
            total_purchases: parseFloat(summary.total_purchases || 0),
            total_payments: parseFloat(summary.total_payments || 0),
            closing_balance: closingBalance
          }
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Vendor Ledger API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
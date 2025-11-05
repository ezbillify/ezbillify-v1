// pages/api/barcode/generate.js
import { withAuth } from '../../../lib/middleware'
import QRCode from 'qrcode'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { company_id, item_ids, options } = req.body

    if (!company_id || !item_ids || !Array.isArray(item_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and item IDs are required'
      })
    }

    // Fetch items from database
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('id, item_code, item_name, selling_price, barcode')
      .eq('company_id', company_id)
      .in('id', item_ids)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch items'
      })
    }

    // Generate QR codes for each item
    const qrCodes = []
    for (const item of items) {
      try {
        // Create QR code data (you can customize this based on your needs)
        const qrData = JSON.stringify({
          id: item.id,
          code: item.item_code,
          name: item.item_name,
          price: item.selling_price,
          barcode: item.barcode
        })

        // Generate QR code as Data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })

        qrCodes.push({
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          qr_code: qrCodeDataUrl
        })
      } catch (qrError) {
        console.error('QR Code generation error for item:', item.id, qrError)
        // Continue with other items even if one fails
      }
    }

    // For sticker generation, we would typically generate a PDF here
    // For now, we'll return the QR code data
    return res.status(200).json({
      success: true,
      data: qrCodes
    })
  } catch (error) {
    console.error('Barcode generation error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate barcodes: ' + error.message
    })
  }
}

export default withAuth(handler)
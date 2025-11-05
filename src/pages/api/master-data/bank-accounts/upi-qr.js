// pages/api/master-data/bank-accounts/upi-qr.js
import { withAuth } from '../../../../lib/middleware'
import QRCode from 'qrcode'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'POST':
      try {
        const { upi_id, amount, note } = req.body

        if (!upi_id) {
          return res.status(400).json({
            success: false,
            error: 'UPI ID is required'
          })
        }

        // Validate UPI ID format
        const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/
        if (!upiPattern.test(upi_id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid UPI ID format'
          })
        }

        // Create UPI QR code data
        // Format: upi://pay?pa=UPI_ID&pn=PayeeName&am=Amount&cu=INR&tn=Note
        let upiUrl = `upi://pay?pa=${encodeURIComponent(upi_id)}`
        
        if (note) {
          upiUrl += `&tn=${encodeURIComponent(note)}`
        }
        
        if (amount) {
          upiUrl += `&am=${encodeURIComponent(amount)}`
        }
        
        upiUrl += '&cu=INR'

        // Generate QR code as Data URL
        const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })

        return res.status(200).json({
          success: true,
          data: {
            upi_qr_code: qrCodeDataUrl,
            upi_url: upiUrl
          }
        })
      } catch (error) {
        console.error('Error generating UPI QR code:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to generate UPI QR code'
        })
      }

    default:
      res.setHeader('Allow', ['POST'])
      return res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuth(handler)
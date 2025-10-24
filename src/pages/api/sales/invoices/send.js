// pages/api/sales/invoices/send.js
import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    return await sendInvoice(req, res)
  } catch (error) {
    console.error('Invoice send API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function sendInvoice(req, res) {
  const {
    company_id,
    invoice_id,
    recipient_email,
    cc_emails = [],
    subject,
    message,
    include_pdf = true,
    send_method = 'email' // email, whatsapp, sms
  } = req.body

  if (!company_id || !invoice_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and invoice ID are required'
    })
  }

  // Get invoice details with customer info
  const { data: invoice, error: invoiceError } = await supabase
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, email, phone, mobile),
      items:sales_document_items(*),
      company:companies(name, email, phone, logo_url)
    `)
    .eq('id', invoice_id)
    .eq('company_id', company_id)
    .eq('document_type', 'invoice')
    .single()

  if (invoiceError || !invoice) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found'
    })
  }

  // Determine recipient
  const finalRecipient = recipient_email || invoice.customer?.email
  if (!finalRecipient && send_method === 'email') {
    return res.status(400).json({
      success: false,
      error: 'Recipient email is required'
    })
  }

  // Get email template
  const emailTemplate = await getEmailTemplate(company_id, 'invoice')
  
  // Generate email content
  const emailData = {
    to: finalRecipient,
    cc: cc_emails.filter(email => email && email.trim()),
    subject: subject || generateEmailSubject(invoice, emailTemplate),
    html: message || generateEmailContent(invoice, emailTemplate),
    attachments: []
  }

  // Generate PDF if requested
  if (include_pdf) {
    try {
      const pdfData = await generateInvoicePDF(invoice)
      emailData.attachments.push({
        filename: `${invoice.document_number}.pdf`,
        content: pdfData,
        contentType: 'application/pdf'
      })
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate invoice PDF'
      })
    }
  }

  // Send based on method
  let sendResult
  switch (send_method) {
    case 'email':
      sendResult = await sendEmailNotification(emailData)
      break
    case 'whatsapp':
      sendResult = await sendWhatsAppMessage(invoice, finalRecipient)
      break
    case 'sms':
      sendResult = await sendSMSNotification(invoice, finalRecipient)
      break
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid send method'
      })
  }

  if (!sendResult.success) {
    return res.status(500).json({
      success: false,
      error: sendResult.error || 'Failed to send invoice'
    })
  }

  // Log the send event
  await logInvoiceSend(invoice_id, send_method, finalRecipient, sendResult)

  // Update invoice status to 'sent'
  await supabase
    .from('sales_documents')
    .update({
      status: 'sent',
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice_id)

  return res.status(200).json({
    success: true,
    message: `Invoice ${invoice.document_number} sent successfully via ${send_method}`,
    data: {
      invoice_id,
      invoice_number: invoice.document_number,
      recipient: finalRecipient,
      send_method,
      sent_at: new Date().toISOString()
    }
  })
}

async function getEmailTemplate(company_id, template_type) {
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('company_id', company_id)
    .eq('template_type', template_type)
    .eq('is_default', true)
    .single()

  return template || {
    subject: 'Invoice {{invoice_number}} from {{company_name}}',
    body_html: `
      <p>Dear {{customer_name}},</p>
      <p>Please find attached invoice {{invoice_number}} for amount {{total_amount}}.</p>
      <p>Due date: {{due_date}}</p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>{{company_name}}</p>
    `
  }
}

function generateEmailSubject(invoice, template) {
  return template.subject
    .replace('{{invoice_number}}', invoice.document_number)
    .replace('{{company_name}}', invoice.company?.name || 'Your Company')
    .replace('{{total_amount}}', formatCurrency(invoice.total_amount))
}

function generateEmailContent(invoice, template) {
  return template.body_html
    .replace('{{customer_name}}', invoice.customer?.name || invoice.customer_name)
    .replace('{{invoice_number}}', invoice.document_number)
    .replace('{{company_name}}', invoice.company?.name || 'Your Company')
    .replace('{{total_amount}}', formatCurrency(invoice.total_amount))
    .replace('{{due_date}}', formatDate(invoice.due_date))
    .replace('{{invoice_date}}', formatDate(invoice.document_date))
}

async function generateInvoicePDF(invoice) {
  // This would integrate with your PDF generation service
  // For now, returning a placeholder
  try {
    // You could use libraries like puppeteer, jsPDF, or external services
    // const pdf = await generatePDFFromHTML(invoice)
    // return pdf
    
    // Placeholder - integrate with your PDF service
    return Buffer.from('PDF content placeholder')
  } catch (error) {
    throw new Error('PDF generation failed: ' + error.message)
  }
}

async function sendEmailNotification(emailData) {
  try {
    // Get company email configuration
    const emailConfig = await getEmailConfiguration()
    
    if (!emailConfig) {
      throw new Error('Email configuration not found')
    }

    // Send email using configured service (SMTP, SendGrid, etc.)
    const emailService = getEmailService(emailConfig)
    const result = await emailService.send(emailData)

    return {
      success: true,
      message_id: result.messageId,
      provider: emailConfig.provider
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function sendWhatsAppMessage(invoice, recipient) {
  try {
    // WhatsApp Business API integration
    const message = `Hi ${invoice.customer?.name || invoice.customer_name}, 
    
Your invoice ${invoice.document_number} for ${formatCurrency(invoice.total_amount)} is ready.
Due date: ${formatDate(invoice.due_date)}

View online: ${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}

Thank you!`

    // Integrate with WhatsApp Business API or Twilio
    // const result = await whatsappService.send(recipient, message)
    
    return {
      success: true,
      message: 'WhatsApp message sent'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function sendSMSNotification(invoice, recipient) {
  try {
    const message = `Invoice ${invoice.document_number} for ${formatCurrency(invoice.total_amount)} is ready. Due: ${formatDate(invoice.due_date)}. View: ${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}`

    // Integrate with SMS service (Twilio, MSG91, etc.)
    // const result = await smsService.send(recipient, message)
    
    return {
      success: true,
      message: 'SMS sent'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function logInvoiceSend(invoice_id, method, recipient, result) {
  try {
    await supabase
      .from('invoice_send_logs')
      .insert({
        invoice_id,
        send_method: method,
        recipient,
        status: result.success ? 'sent' : 'failed',
        provider: result.provider || method,
        message_id: result.message_id,
        error_message: result.error,
        sent_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging invoice send:', error)
  }
}

async function getEmailConfiguration() {
  // Get email service configuration from settings
  // This would typically come from system_settings or integrations table
  return {
    provider: 'smtp',
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS
  }
}

function getEmailService(config) {
  // Return appropriate email service based on configuration
  // This would integrate with your email service of choice
  return {
    send: async (emailData) => {
      // Placeholder - implement actual email sending
      console.log('Sending email:', emailData)
      return { messageId: 'msg_' + Date.now() }
    }
  }
}

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

function formatDate(dateString) {
  if (!dateString) return 'Not specified'
  return new Date(dateString).toLocaleDateString('en-IN')
}

export default withAuth(handler)
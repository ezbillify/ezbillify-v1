// pages/api/test-templates.js
export default function handler(req, res) {
    console.log('Test API called successfully!')
    
    return res.status(200).json({
      success: true,
      message: 'API is working',
      method: req.method,
      data: [
        {
          id: '1',
          name: 'Modern Invoice Template',
          document_type: 'invoice',
          template_type: 'predefined',
          description: 'Clean modern design',
          paper_size: 'A4',
          orientation: 'portrait',
          is_default: true,
          is_active: true,
          created_at: '2024-09-25',
          usage_count: 0
        }
      ]
    })
  }
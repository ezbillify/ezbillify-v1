// Template definitions - simplified structure with 13 professional templates
export const templateDefinitions = {
  // A4 Templates (3)
  'A4-default': {
    name: 'Default',
    description: 'Clean standard business document',
    htmlFile: '/templates/A4-Default.html',
    paperSize: 'A4',
    orientation: 'portrait'
  },
  'A4-gst-compatible': {
    name: 'GST Compatible',
    description: 'Proper GST format with tax breakdown',
    htmlFile: '/templates/A4-GST-Compatible.html',
    paperSize: 'A4',
    orientation: 'portrait'
  },
  'A4-modern': {
    name: 'Modern',
    description: 'Contemporary design with colors',
    htmlFile: '/templates/A4-Modern.html',
    paperSize: 'A4',
    orientation: 'portrait'
  },
  // A4 Ledger Template
  'A4-ledger': {
    name: 'Ledger',
    description: 'Professional ledger format',
    htmlFile: '/templates/A4-Ledger.html',
    paperSize: 'A4',
    orientation: 'portrait'
  },

  // A3 Templates (3)
  'A3-default': {
    name: 'Default',
    description: 'Wide format standard document',
    htmlFile: '/templates/A3-Default.html',
    paperSize: 'A3',
    orientation: 'landscape'
  },
  'A3-gst-compatible': {
    name: 'GST Compatible',
    description: 'Wide format GST document',
    htmlFile: '/templates/A3-GST-Compatible.html',
    paperSize: 'A3',
    orientation: 'landscape'
  },
  'A3-modern': {
    name: 'Modern',
    description: 'Wide format modern design',
    htmlFile: '/templates/A3-Modern.html',
    paperSize: 'A3',
    orientation: 'landscape'
  },

  // A5 Templates (3)
  'A5-default': {
    name: 'Default',
    description: 'Compact standard document',
    htmlFile: '/templates/A5-Default.html',
    paperSize: 'A5',
    orientation: 'portrait'
  },
  'A5-gst-compatible': {
    name: 'GST Compatible',
    description: 'Compact GST format',
    htmlFile: '/templates/A5-GST-Compatible.html',
    paperSize: 'A5',
    orientation: 'portrait'
  },
  'A5-modern': {
    name: 'Modern',
    description: 'Compact modern design',
    htmlFile: '/templates/A5-Modern.html',
    paperSize: 'A5',
    orientation: 'portrait'
  },

  // 80mm Thermal Templates (2)
  '80mm-basic': {
    name: 'Basic',
    description: 'Essential receipt information',
    htmlFile: '/templates/80mm-Basic.html',
    paperSize: '80mm',
    orientation: 'portrait'
  },
  '80mm-detailed': {
    name: 'Detailed',
    description: 'Full information receipt',
    htmlFile: '/templates/80mm-Detailed.html',
    paperSize: '80mm',
    orientation: 'portrait'
  },
  '80mm-nocb': {
    name: 'No Company Branding',
    description: 'Receipt without company branding',
    htmlFile: '/templates/80mm-noCB.html',
    paperSize: '80mm',
    orientation: 'portrait'
  },

  // 58mm Thermal Templates (2)
  '58mm-basic': {
    name: 'Basic',
    description: 'Minimal compact receipt',
    htmlFile: '/templates/58mm-Basic.html',
    paperSize: '58mm',
    orientation: 'portrait'
  },
  '58mm-detailed': {
    name: 'Detailed',
    description: 'Compact full info receipt',
    htmlFile: '/templates/58mm-Detailed.html',
    paperSize: '58mm',
    orientation: 'portrait'
  }
};

// Helper function to get templates by paper size
export function getTemplatesByPaperSize(paperSize) {
  return Object.entries(templateDefinitions)
    .filter(([, template]) => template.paperSize === paperSize)
    .reduce((acc, [key, template]) => {
      acc[key] = template;
      return acc;
    }, {});
}

// Helper function to get template by key
export function getTemplate(templateKey) {
  return templateDefinitions[templateKey] || null;
}
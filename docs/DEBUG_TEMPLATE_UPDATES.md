# Debug: Template Not Updating

## Immediate Debugging Steps

### Step 1: Check What's in Database

Open browser console and run this on your Print Templates page:

```javascript
// Check what templates are in database
async function checkTemplates() {
  const companyId = 'YOUR_COMPANY_ID'; // Replace with actual company ID
  const response = await fetch(`/api/settings/print-templates?company_id=${companyId}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  const result = await response.json();

  console.log('=== TEMPLATES IN DATABASE ===');
  console.log('Total templates:', result.data?.length);

  result.data?.forEach((t, i) => {
    console.log(`\n--- Template ${i + 1} ---`);
    console.log('Name:', t.template_name);
    console.log('Document Type:', t.document_type);
    console.log('Paper Size:', t.paper_size);
    console.log('Updated:', t.updated_at);
    console.log('HTML Length:', t.template_html?.length);
    console.log('HTML Start:', t.template_html?.substring(0, 200));
    console.log('Is Complete HTML:', t.template_html?.trim().toLowerCase().startsWith('<!doctype'));
  });
}

checkTemplates();
```

### Step 2: Check What PrintSelectionDialog Loads

When you open print dialog, check console for:

```
🔄 PrintSelectionDialog: Loading fresh templates from API
✅ Loaded X templates from database
📋 Found X templates for invoice
Latest template: { name: "...", updated: "...", htmlLength: ... }
```

### Step 3: Check What Gets Printed

When you print/download, check console for:

```
🖨️ PRINT: Starting print with template
📋 Template info: { name: "...", updated: "...", htmlLength: ..., isCompleteHTML: true/false }
📄 Template HTML preview (first 500 chars): ...
✅ Using complete HTML template as-is  (or)
📦 Wrapping HTML fragment in document structure
```

---

## Common Issues and Fixes

### Issue 1: Template HTML not in database

**Symptom:** `htmlLength: 0` or `htmlLength: undefined`

**Fix:** Template assignment failed. Re-assign template from Print Templates page.

### Issue 2: Old template HTML in database

**Symptom:** `updated_at` shows old date, HTML content doesn't match expected

**Fix:** Template was cached during assignment. Solution:
1. Go to Print Templates
2. Click "Assign Template" again on the desired template
3. This will fetch fresh HTML from `/public/templates/` and save to DB

### Issue 3: Wrong template being used

**Symptom:** Different template name/paper size than expected

**Fix:** Check document type and paper size match:
- Invoice uses `document_type: 'invoice'`
- 80mm templates use `paper_size: '80mm'`

### Issue 4: Template not complete HTML

**Symptom:** `isCompleteHTML: false` but template should be complete

**Fix:** Check template file starts with `<!DOCTYPE html>` or `<html>`

---

## Force Complete Refresh

If templates still not updating, run this in browser console:

```javascript
// Force clear all caches and reload
async function forceRefresh() {
  // Clear any service worker caches
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    console.log('✅ Cleared service worker caches');
  }

  // Reload templates
  const companyId = 'YOUR_COMPANY_ID';
  const timestamp = Date.now();
  const response = await fetch(
    `/api/settings/print-templates?company_id=${companyId}&_t=${timestamp}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );

  const result = await response.json();
  console.log('✅ Fetched fresh templates:', result.data?.length);
  return result;
}

forceRefresh();
```

---

## Check Database Directly

If you have database access:

```sql
-- Check templates in database
SELECT
  id,
  template_name,
  document_type,
  paper_size,
  updated_at,
  LENGTH(template_html) as html_length,
  LEFT(template_html, 100) as html_preview
FROM print_templates
WHERE company_id = 'YOUR_COMPANY_ID'
ORDER BY updated_at DESC;
```

---

## Verify Template Assignment

Run this when assigning template:

```javascript
// Monitor template assignment
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0]?.includes('print-templates')) {
    console.log('🔍 Fetch intercepted:', args[0]);
    console.log('📤 Request options:', args[1]);
  }
  return originalFetch.apply(this, args).then(response => {
    if (args[0]?.includes('print-templates')) {
      return response.clone().json().then(data => {
        console.log('📥 Response data:', data);
        return response;
      });
    }
    return response;
  });
};

console.log('✅ Fetch monitoring enabled. Now assign a template.');
```

---

## Expected Console Output (Success)

When everything works correctly:

```
=== Template Assignment ===
✅ Template saved successfully - reloading to show in preview

=== Print Dialog Opens ===
🔄 PrintSelectionDialog: Loading fresh templates from API
✅ Loaded 3 templates from database
📋 Found 1 templates for invoice
Latest template: {
  name: "Invoice - No Company Branding",
  updated: "2025-11-19T...",
  htmlLength: 15234
}

=== Print/Download ===
🖨️ PRINT: Starting print with template
📋 Template info: {
  name: "Invoice - No Company Branding",
  type: "invoice",
  paperSize: "80mm",
  updated: "2025-11-19T...",
  htmlLength: 15234,
  isCompleteHTML: true
}
📄 Template HTML preview (first 500 chars): <!DOCTYPE html><html>...
✅ Using complete HTML template as-is
```

---

## Still Not Working?

### Last Resort: Manual Database Update

If automated assignment fails, manually update database:

1. Get template HTML from file:
```bash
cat /Users/devacc/ezbillify-v1/public/templates/80mm-noCB.html
```

2. Update database:
```sql
UPDATE print_templates
SET
  template_html = '<!DOCTYPE html>...',  -- Paste full HTML here
  updated_at = NOW()
WHERE
  company_id = 'YOUR_COMPANY_ID'
  AND document_type = 'invoice'
  AND paper_size = '80mm';
```

3. Verify update:
```sql
SELECT template_name, updated_at, LENGTH(template_html)
FROM print_templates
WHERE company_id = 'YOUR_COMPANY_ID';
```

---

## Contact for Help

If still not working, provide these details:

1. Console logs from all steps above
2. Screenshot of Print Templates page showing assigned badge
3. Database query results
4. Browser (Chrome/Firefox/Safari) and version
5. Any error messages

---

**Created:** 2025-11-19
**Purpose:** Debug template update issues
**Status:** Diagnostic tool

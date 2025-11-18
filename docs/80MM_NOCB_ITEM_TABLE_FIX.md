# 80mm-noCB Item Table Fix - Clean Minimal Design

## Problem
The 80mm-noCB template was displaying extra data in the item table rows that should not be visible. The PDF output showed all item details including MRP, HSN code, discount, tax rates, etc., when it should only display 4 columns: Item, Qty, Rate, and Amount.

**Issue Example:**
PDF showed: `1 TEST2 ₹120.00 9826 ₹90.00 0 1 ₹90.00 9.0% ₹6.86 9.0% ₹6.86 ₹90.00`

**Expected:**
Should show only: `TEST2 | 1 | ₹90.00 | ₹90.00`

## Root Cause
The print service in [src/services/printService.js](../src/services/printService.js) was generating the same HTML structure for all 80mm templates. The `generateItemsTable()` function created divs for HSN codes and tax info within the first table column for all 80mm templates, and CSS `display: none` rules were not effective in hiding this data in the PDF output.

## Solution
Modified the print service to generate different HTML based on the template name:

### 1. Updated `generateItemsTable()` Function
**File:** [src/services/printService.js](../src/services/printService.js)

**Changes Made:**

1. Added `templateName` parameter to `generateItemsTable()`:
   ```javascript
   generateItemsTable(items, paperSize, documentData, templateName = '')
   ```

2. Added template detection logic:
   ```javascript
   const isMinimalTemplate = templateName.includes('80mm-noCB') || templateName.includes('80mm-nocb');
   ```

3. Conditional HTML generation:
   ```javascript
   if (isMinimalTemplate) {
     // Generate simple 4-column table without HSN/tax info
     return `
       <tr>
         <td>
           <div class="item-name-cell">${this.escapeHtml(name)}</div>
         </td>
         <td class="text-center">${qty}</td>
         <td class="text-right">₹${formatAmount(rate)}</td>
         <td class="text-right">₹${formatAmount(total)}</td>
       </tr>
     `;
   } else {
     // Generate detailed table with HSN/tax info for other 80mm templates
     return `
       <tr>
         <td>
           <div class="item-name-cell">${this.escapeHtml(name)}</div>
           ${hsn ? `<div class="item-hsn">HSN: ${this.escapeHtml(hsn)}</div>` : ''}
           ${taxInfo ? `<div class="item-tax-info">${taxInfo}</div>` : ''}
         </td>
         ...
       </tr>
     `;
   }
   ```

### 2. Updated `prepareTemplateData()` Function
**File:** [src/services/printService.js](../src/services/printService.js)

Added `template` parameter to pass template information through the pipeline:

```javascript
async prepareTemplateData(documentData, documentType, template = null) {
  // ...
  const templateName = template?.template_name || '';
  const itemsTableHtml = this.generateItemsTable(
    formattedItems,
    documentData.paper_size || 'A4',
    documentData,
    templateName
  );
  // ...
}
```

### 3. Updated All Template Callers
Updated these functions to pass the template object:

- `printDocumentWithTemplate()` - Line 592
- `downloadDocumentPDFWithTemplate()` - Line 606
- `generateDocumentPDF()` - Line 633

**Before:**
```javascript
const templateData = await this.prepareTemplateData(documentData, documentType);
```

**After:**
```javascript
const templateData = await this.prepareTemplateData(documentData, documentType, template);
```

### 4. Cleaned Up Template CSS
**File:** [public/templates/80mm-noCB.html](../public/templates/80mm-noCB.html)

Removed unnecessary CSS rules since the HTML no longer contains HSN/tax divs:

**Removed:**
```css
/* Hide HSN and tax info in noCB template for cleaner look */
.item-hsn {
  display: none !important;
}

.item-tax-info {
  display: none !important;
}
```

## Benefits

✅ **Clean HTML Generation** - Only generates necessary HTML elements, not hidden ones
✅ **Better Performance** - Less HTML to render and process
✅ **Reliable Display** - No dependency on CSS display rules that may not work in all PDF renderers
✅ **Template-Specific Logic** - Each template gets exactly the HTML it needs
✅ **Maintainable** - Clear separation between minimal and detailed templates

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| [src/services/printService.js](../src/services/printService.js) | 95, 372, 427-428, 107-160, 592, 606, 633 | Added template name detection and conditional HTML generation |
| [public/templates/80mm-noCB.html](../public/templates/80mm-noCB.html) | 137-151 | Removed unnecessary CSS display:none rules |

## Testing Checklist

- [ ] Print 80mm-noCB receipt - verify only 4 columns show
- [ ] Print 80mm-detailed receipt - verify HSN and tax info still appear
- [ ] Generate PDF for 80mm-noCB - verify clean table
- [ ] Generate PDF for 80mm-detailed - verify detailed table
- [ ] Test with items that have HSN codes
- [ ] Test with items that have CGST/SGST
- [ ] Test with items that have IGST
- [ ] Test with multiple items (5+ items)

## Template Comparison

### 80mm-noCB (Minimal)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ITEM          QTY    RATE        AMT        ┃ ← Black header
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Product Name   2    ₹100.00    ₹200.00     ┃ ← Only item name
┣╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┫
┃ Another Item   1    ₹50.00     ₹50.00      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 80mm-detailed (Full Details)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ITEM          QTY    RATE        AMT        ┃ ← Black header
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Product Name   2    ₹100.00    ₹200.00     ┃ ← Item name
┃ HSN: 12345                                  ┃ ← HSN code
┃ CGST 9%, SGST 9%                           ┃ ← Tax info
┣╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┫
┃ Another Item   1    ₹50.00     ₹50.00      ┃
┃ HSN: 67890                                  ┃
┃ IGST 18%                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Technical Details

### Template Name Detection
The system checks if the template name contains "80mm-noCB" or "80mm-nocb" (case-insensitive) to determine if it should generate minimal HTML.

### HTML Output Difference

**80mm-noCB HTML:**
```html
<tr>
  <td>
    <div class="item-name-cell">Product Name</div>
  </td>
  <td class="text-center">2</td>
  <td class="text-right">₹100.00</td>
  <td class="text-right">₹200.00</td>
</tr>
```

**80mm-detailed HTML:**
```html
<tr>
  <td>
    <div class="item-name-cell">Product Name</div>
    <div class="item-hsn">HSN: 12345</div>
    <div class="item-tax-info">CGST 9%, SGST 9%</div>
  </td>
  <td class="text-center">2</td>
  <td class="text-right">₹100.00</td>
  <td class="text-right">₹200.00</td>
</tr>
```

## Related Documentation

- [80mm-noCB Template Update](./80MM_NOCB_TEMPLATE_UPDATE.md) - Initial template redesign
- [Sales Order Fixes](./SALES_ORDER_FIXES.md) - IST timezone fixes

## Migration Notes

**Existing Receipts:**
- No data migration required
- Only affects newly generated receipts
- Template HTML in database remains unchanged

**New Receipts:**
- 80mm-noCB receipts will have cleaner HTML
- 80mm-detailed receipts continue to show full details
- No changes to A4 templates

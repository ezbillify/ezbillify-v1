# Barcode Scanning - Testing & Troubleshooting Guide

## Quick Test

### Test 1: Manual Entry (Simplest Test)
1. Go to Create Invoice page
2. Click in "Search items..." field
3. Type an exact item code (e.g., `SKU001`)
4. Press **Enter**
5. **Expected**: Item should be added to table immediately

### Test 2: Barcode Scan (With Scanner)
1. Go to Create Invoice page
2. Click in "Search items..." field
3. Scan a barcode with your barcode scanner
4. **Expected**: Item should be added to table immediately

## Console Messages to Look For

### Successful Local Match
```
📦 Barcode/Item Code matched - Auto-adding item: Product Name
🛒 Selecting item: Product Name
   Item data: { id: '...', item_name: 'Product Name', ... }
   GST Type: intrastate
   Tax Info: { tax_rate: 18, cgst_rate: 9, sgst_rate: 9, ... }
   ✅ New item created with tax_rate: 18
```

### Successful API Fallback
```
📦 Barcode found via API: {itemName: "Product Name", itemId: "uuid"}
✅ Item found in current list - adding directly
🛒 Selecting item: Product Name
```

OR

```
📦 Barcode found via API: {itemName: "Product Name", itemId: "uuid"}
⏳ Item not in list - fetching full details from API...
📥 Fetched item result: {success: true, hasData: true, itemName: "Product Name"}
✅ Adding fetched item to invoice
🛒 Selecting item: Product Name
```

### Errors to Watch For

**Item Not Found:**
```
No item found matching: INVALID123
```

**API Error:**
```
Barcode API error: Error: ...
```

**Missing Company ID:**
```
❌ Failed to load item details: {success: false, error: "Company ID is required"}
```

## Step-by-Step Debugging

### Step 1: Verify Barcodes in Database

**Check if item has barcodes:**
```sql
SELECT item_name, item_code, barcodes
FROM items
WHERE company_id = 'your-company-id'
AND deleted_at IS NULL
LIMIT 10;
```

**Expected Result:**
```
item_name     | item_code | barcodes
--------------+-----------+------------------
Product ABC   | SKU001    | {9876543210, 1111111111}
Product XYZ   | SKU002    | {1234567890}
```

### Step 2: Test Validate-Barcode API

**Open browser console and run:**
```javascript
// Replace with your actual barcode and company_id
fetch('/api/items/validate-barcode?barcode=9876543210&company_id=YOUR_COMPANY_ID')
  .then(r => r.json())
  .then(console.log)
```

**Expected Response (Barcode exists):**
```json
{
  "success": true,
  "available": false,
  "status": "conflict",
  "message": "Barcode '9876543210' is already assigned to item: Product ABC (Code: SKU001)",
  "existingItem": {
    "id": "uuid-here",
    "item_name": "Product ABC",
    "item_code": "SKU001",
    "mrp": 120.00,
    "selling_price": 90.00,
    "selling_price_with_tax": 106.20
  }
}
```

**Expected Response (Barcode available):**
```json
{
  "success": true,
  "available": true,
  "status": "available",
  "message": "Barcode is available"
}
```

### Step 3: Test Items API

**Check if items are being fetched with barcodes:**
```javascript
fetch('/api/items?company_id=YOUR_COMPANY_ID&is_for_sale=true')
  .then(r => r.json())
  .then(data => {
    console.log('Total items:', data.data.length);
    console.log('Sample item:', data.data[0]);
    console.log('Has barcodes?', !!data.data[0].barcodes);
  })
```

**Expected Output:**
```
Total items: 25
Sample item: {id: "...", item_name: "Product ABC", barcodes: ["9876543210"], ...}
Has barcodes? true
```

### Step 4: Test Search Filter

**In invoice form, open browser console:**
```javascript
// This should show the filtered items
console.log('Available items:', availableItems.length);
console.log('Filtered items (search: "9876"):', filteredItems.length);
```

### Step 5: Test handleItemSearchKeyDown

**Add a breakpoint or console.log:**
```javascript
// In InvoiceForm.js, add at line 675:
console.log('🔍 Enter pressed with search:', itemSearch);
console.log('🔍 Search lower:', searchLower);
console.log('🔍 Available items count:', availableItems.length);
```

## Common Issues & Solutions

### Issue 1: "No item found matching: XXX"

**Possible Causes:**
1. Barcode not in database
2. Item is for a different company
3. Item is deleted (deleted_at is not null)
4. Barcode in different case (should be case-insensitive)

**Solution:**
```sql
-- Check if barcode exists anywhere
SELECT item_name, item_code, barcodes, deleted_at, company_id
FROM items
WHERE 'YOUR_BARCODE' = ANY(barcodes);

-- If found but deleted:
UPDATE items
SET deleted_at = NULL
WHERE id = 'item-id';

-- If found but wrong company:
-- Item belongs to different company - cannot use
```

### Issue 2: Item fetched but not added

**Check Console:**
```
📦 Barcode found via API: {itemName: "...", itemId: "..."}
⏳ Item not in list - fetching full details from API...
📥 Fetched item result: {success: false, ...}
❌ Failed to load item details: {error: "..."}
```

**Solution:**
Check the error message. Common errors:
- "Company ID is required" → `companyId` not set
- "Item not found" → Item deleted or wrong company
- Network error → API endpoint issue

### Issue 3: Scanner not working

**Symptoms:**
- Nothing happens when scanning
- Scanner beeps but no text appears

**Solutions:**

1. **Check scanner mode:**
   - Must be in "Keyboard Emulation" mode
   - NOT "Storage mode" or "Serial mode"

2. **Test scanner in notepad:**
   - Open Notepad/TextEdit
   - Scan a barcode
   - Should type the barcode + press Enter
   - If not working → scanner configuration issue

3. **Check suffix setting:**
   - Scanner must send Enter/Return after barcode
   - Configure suffix to "CR" or "Enter"

4. **Check cursor focus:**
   - Search field must be focused
   - Click in field before scanning

### Issue 4: Duplicate items added

**Symptom:**
Scanning same barcode multiple times creates duplicate rows

**Expected Behavior:**
Should increment quantity, not create new row

**Check:**
```javascript
// In console after adding item twice:
console.log('Items in table:', items);
// Should show 1 item with quantity: 2
```

**If duplicates appear:**
- Check `existingItemIndex` logic in handleItemSelect
- Verify `item.id` matching

### Issue 5: Wrong price or tax

**Symptom:**
Item added but price is 0 or wrong tax calculation

**Check:**
```javascript
// In handleItemSelect
console.log('Item prices:', {
  effective_selling_price: item.effective_selling_price,
  selling_price_with_tax: item.selling_price_with_tax,
  selling_price: item.selling_price,
  purchase_price: item.purchase_price
});

console.log('Tax info:', taxInfo);
```

**Solution:**
- Ensure item has `selling_price` or `selling_price_with_tax` set
- Check tax_rate_id is valid
- Verify GST type calculation (intrastate vs interstate)

## Manual Testing Checklist

- [ ] **Local Match Test**
  - [ ] Scan/type item code → item added
  - [ ] Scan/type barcode → item added
  - [ ] Case insensitive (e.g., "SKU001" = "sku001")

- [ ] **API Fallback Test**
  - [ ] Limited items list (only show 10 items)
  - [ ] Scan barcode of item #50 → should fetch and add

- [ ] **Partial Match Test**
  - [ ] Type "Lap" → shows dropdown with "Laptop", "Laptop Bag"
  - [ ] Press Enter → dropdown stays open

- [ ] **Duplicate Handling**
  - [ ] Add item once → qty = 1
  - [ ] Scan same item → qty = 2
  - [ ] Scan again → qty = 3

- [ ] **Error Handling**
  - [ ] Type "INVALID123" + Enter → error toast
  - [ ] Search field clears
  - [ ] Can scan next item

- [ ] **Multi-Barcode Items**
  - [ ] Item has barcodes: ["111", "222", "333"]
  - [ ] Scan "111" → item added
  - [ ] Scan "222" → qty increments (same item)
  - [ ] Scan "333" → qty increments again

- [ ] **Performance Test**
  - [ ] Scan 20 items rapidly
  - [ ] All items added correctly
  - [ ] No duplicates
  - [ ] Totals calculate properly

## Network Debugging

### Monitor API Calls

**Open Network tab in browser DevTools:**

1. **Filter:** XHR/Fetch
2. **Look for:**
   - `/api/items/validate-barcode?barcode=...`
   - `/api/items/uuid?company_id=...`

3. **Check Response:**
   - Status: 200 OK
   - Response body has expected data

### Example Network Log

```
Request URL: /api/items/validate-barcode?barcode=9876543210&company_id=abc-123
Request Method: GET
Status Code: 200 OK

Response:
{
  "success": true,
  "available": false,
  "existingItem": {
    "id": "item-uuid",
    "item_name": "Product ABC",
    "item_code": "SKU001"
  }
}
```

## Production Checklist

Before going live:

- [ ] Test with actual barcode scanner hardware
- [ ] Test with 100+ items in database
- [ ] Test with slow network (throttle to 3G in DevTools)
- [ ] Test with multiple users scanning simultaneously
- [ ] Verify all console.log statements removed or wrapped in DEV check
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices if applicable
- [ ] Document scanner model and configuration for support team

## Support Information

When reporting barcode issues, include:

1. **Console logs** (from browser DevTools)
2. **Network requests** (from Network tab)
3. **Scanner model** and configuration
4. **Barcode value** being scanned
5. **Item details** from database (item_name, barcodes array)
6. **Steps to reproduce** the issue
7. **Expected vs actual behavior**

## Quick Fixes

### Force Refresh Items List
```javascript
// In browser console
window.location.reload();
```

### Clear Search and Try Again
```javascript
// In browser console
document.querySelector('input[placeholder*="Search items"]').value = '';
```

### Check Company ID
```javascript
// In browser console
console.log('Company ID:', companyId);
```

### List All Available Items
```javascript
// In browser console
console.table(availableItems.map(i => ({
  name: i.item_name,
  code: i.item_code,
  barcodes: i.barcodes?.join(', ')
})));
```

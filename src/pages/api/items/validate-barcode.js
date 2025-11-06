// src/pages/api/items/validate-barcode.js
import { supabaseAdmin } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { barcode, company_id, item_id } = req.query

    console.log('🔍 Validating barcode:', barcode, 'for company:', company_id)

    if (!barcode || !company_id) {
      return res.status(400).json({
        success: false,
        error: 'Barcode and company_id are required'
      })
    }

    const cleanBarcode = barcode.trim()

    if (!cleanBarcode) {
      return res.status(400).json({
        success: false,
        error: 'Barcode cannot be empty'
      })
    }

    // STEP 1: If editing an item, fetch current item's barcodes
    let currentItemBarcodes = []
    if (item_id) {
      const { data: currentItem, error: currentError } = await supabaseAdmin
        .from('items')
        .select('barcodes')
        .eq('id', item_id)
        .is('deleted_at', null)
        .single()

      if (currentError && currentError.code !== 'PGRST116') {
        console.error('❌ Error fetching current item:', currentError)
      }

      if (currentItem && currentItem.barcodes) {
        if (Array.isArray(currentItem.barcodes)) {
          currentItemBarcodes = currentItem.barcodes.filter(b => b && b.trim())
        }
      }
    }

    // STEP 2: Check if barcode is already on current item
    if (item_id && currentItemBarcodes.length > 0) {
      const isOwnBarcode = currentItemBarcodes.some(
        bc => bc && bc.toLowerCase().trim() === cleanBarcode.toLowerCase()
      )

      if (isOwnBarcode) {
        console.log('✓ Barcode is already on this item (own barcode)')
        return res.status(200).json({
          success: true,
          available: true,
          status: 'own',
          message: 'This barcode is already on this item'
        })
      }
    }

    // STEP 3: Fetch ALL items from company with pricing and tax info
    console.log('🔎 Fetching all items from company with pricing...')
    
    const { data: allItems, error: queryError } = await supabaseAdmin
      .from('items')
      .select(`
        id,
        item_name,
        item_code,
        mrp,
        selling_price,
        selling_price_with_tax,
        tax_rate_id,
        barcodes
      `)
      .eq('company_id', company_id)
      .is('deleted_at', null)

    if (queryError) {
      console.error('❌ Error checking barcodes:', queryError)
      return res.status(500).json({
        success: false,
        error: 'Failed to validate barcode',
        details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
      })
    }

    console.log('✅ Query returned:', allItems ? `${allItems.length} items` : '0 items')

    // STEP 4: Check if barcode exists in any OTHER item
    let matchingItem = null

    if (allItems && allItems.length > 0) {
      for (const item of allItems) {
        // Skip current item when editing
        if (item_id && item.id === item_id) {
          continue
        }

        let itemBarcodes = []

        // Parse barcodes array
        if (Array.isArray(item.barcodes)) {
          itemBarcodes = item.barcodes.filter(b => b && b.trim())
        }

        // Case-insensitive comparison
        if (itemBarcodes && itemBarcodes.length > 0) {
          const foundBarcode = itemBarcodes.find(
            bc => bc && bc.toLowerCase().trim() === cleanBarcode.toLowerCase()
          )

          if (foundBarcode) {
            matchingItem = item
            break
          }
        }
      }
    }

    // STEP 5: Return results with pricing info
    if (matchingItem) {
      console.log('⚠️ Barcode already used by:', matchingItem.item_name, matchingItem.item_code)

      return res.status(200).json({
        success: true,
        available: false,
        status: 'conflict',
        message: `Barcode "${cleanBarcode}" is already assigned to item: ${matchingItem.item_name} (Code: ${matchingItem.item_code})`,
        existingItem: {
          id: matchingItem.id,
          name: matchingItem.item_name,
          item_name: matchingItem.item_name,
          code: matchingItem.item_code,
          item_code: matchingItem.item_code,
          mrp: matchingItem.mrp,
          selling_price: matchingItem.selling_price,
          selling_price_with_tax: matchingItem.selling_price_with_tax,
          tax_rate_id: matchingItem.tax_rate_id
        }
      })
    }

    console.log('✓ Barcode is available')

    return res.status(200).json({
      success: true,
      available: true,
      status: 'available',
      message: 'Barcode is available'
    })

  } catch (error) {
    console.error('❌ Barcode validation error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
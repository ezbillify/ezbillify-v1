// services/itemService.js
import { supabase } from './utils/supabase'

const itemService = {
  // Get all items for a company
  async getItems(companyId, options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      item_type = '',
      category = '',
      track_inventory = '',
      is_active = '',
      low_stock = false,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options

    try {
      // Build query
      let query = supabase
        .from('items')
        .select(`
          *,
          primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
          secondary_unit:units!items_secondary_unit_id_fkey(unit_name, unit_symbol),
          tax_rate:tax_rates(tax_name, tax_rate, cgst_rate, sgst_rate, igst_rate)
        `, { count: 'exact' })
        .eq('company_id', companyId)

      // Apply filters
      if (item_type) query = query.eq('item_type', item_type)
      if (category) query = query.eq('category', category)
      if (track_inventory !== '') query = query.eq('track_inventory', track_inventory === 'true')
      if (is_active !== '') query = query.eq('is_active', is_active === 'true')
      
      // Low stock filter
      if (low_stock) {
        query = query
          .filter('current_stock', 'lte', 'reorder_level')
          .eq('track_inventory', true)
      }

      // Search
      if (search) {
        query = query.or(`
          item_name.ilike.%${search}%,
          item_code.ilike.%${search}%,
          description.ilike.%${search}%,
          category.ilike.%${search}%,
          brand.ilike.%${search}%,
          hsn_sac_code.ilike.%${search}%,
          barcode.ilike.%${search}%
        `)
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' })

      // Pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        success: true,
        data,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit,
          has_next_page: page < Math.ceil(count / limit),
          has_prev_page: page > 1
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get single item
  async getItem(itemId, companyId) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
          secondary_unit:units!items_secondary_unit_id_fkey(unit_name, unit_symbol),
          tax_rate:tax_rates(tax_name, tax_rate, cgst_rate, sgst_rate, igst_rate)
        `)
        .eq('id', itemId)
        .eq('company_id', companyId)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching item:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Create new item
  async createItem(itemData) {
    try {
      // Generate item code if not provided
      if (!itemData.item_code && itemData.auto_generate_code) {
        const code = await this.generateItemCode(itemData.company_id, itemData.item_type)
        itemData.item_code = code
      }

      // Validate required fields
      if (!itemData.company_id || !itemData.item_name) {
        throw new Error('Company ID and item name are required')
      }

      // Check for duplicates
      if (itemData.item_code) {
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('company_id', itemData.company_id)
          .eq('item_code', itemData.item_code)
          .single()

        if (existing) {
          throw new Error('Item with this code already exists')
        }
      }

      const { data, error } = await supabase
        .from('items')
        .insert([{
          ...itemData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
          tax_rate:tax_rates(tax_name, tax_rate)
        `)
        .single()

      if (error) throw error

      // Create opening stock movement if needed
      if (itemData.track_inventory && itemData.current_stock > 0) {
        await this.createStockMovement(itemData.company_id, data.id, {
          movement_type: 'opening_stock',
          quantity: itemData.current_stock,
          reference_type: 'opening_balance',
          notes: 'Opening stock entry'
        })
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error creating item:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Update item
  async updateItem(itemId, itemData, companyId) {
    try {
      const { data, error } = await supabase
        .from('items')
        .update({
          ...itemData,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('company_id', companyId)
        .select(`
          *,
          primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
          tax_rate:tax_rates(tax_name, tax_rate)
        `)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error updating item:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Delete item
  async deleteItem(itemId, companyId) {
    try {
      // Check if item is used in any transactions
      const { data: usage, error: usageError } = await supabase
        .from('sales_document_items')
        .select('id')
        .eq('item_id', itemId)
        .limit(1)

      if (usageError) throw usageError

      if (usage && usage.length > 0) {
        throw new Error('Cannot delete item that has been used in transactions')
      }

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('company_id', companyId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting item:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Generate item code
  async generateItemCode(companyId, itemType = 'product') {
    try {
      const prefix = itemType === 'service' ? 'SER' : 'PRD'
      
      const { data } = await supabase
        .from('items')
        .select('item_code')
        .eq('company_id', companyId)
        .like('item_code', `${prefix}-%`)
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (data && data.length > 0) {
        const match = data[0].item_code.match(new RegExp(`${prefix}-(\\d+)`))
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating item code:', error)
      // Fallback
      return `${itemType === 'service' ? 'SER' : 'PRD'}-${Date.now().toString().slice(-4)}`
    }
  },

  // Bulk operations
  async bulkUpdateItems(companyId, updates) {
    try {
      const results = await Promise.all(
        updates.map(update => 
          this.updateItem(update.id, update.data, companyId)
        )
      )

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      return {
        success: failed.length === 0,
        results: {
          successful: successful.length,
          failed: failed.length,
          errors: failed.map(f => f.error)
        }
      }
    } catch (error) {
      console.error('Error in bulk update:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Stock movements
  async createStockMovement(companyId, itemId, movementData) {
    try {
      const { data: item } = await supabase
        .from('items')
        .select('item_code, current_stock')
        .eq('id', itemId)
        .single()

      if (!item) throw new Error('Item not found')

      const stockBefore = item.current_stock || 0
      let stockAfter = stockBefore

      // Calculate new stock level
      if (movementData.movement_type === 'in') {
        stockAfter = stockBefore + movementData.quantity
      } else if (movementData.movement_type === 'out') {
        stockAfter = stockBefore - movementData.quantity
      } else if (movementData.movement_type === 'adjustment') {
        stockAfter = movementData.quantity
      }

      // Create movement record
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          company_id: companyId,
          item_id: itemId,
          item_code: item.item_code,
          movement_type: movementData.movement_type,
          quantity: movementData.quantity,
          rate: movementData.rate || null,
          value: movementData.value || null,
          reference_type: movementData.reference_type,
          reference_id: movementData.reference_id || null,
          reference_number: movementData.reference_number,
          stock_before: stockBefore,
          stock_after: stockAfter,
          location: movementData.location || null,
          notes: movementData.notes,
          movement_date: movementData.movement_date || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }])

      if (movementError) throw movementError

      // Update item stock
      const { error: updateError } = await supabase
        .from('items')
        .update({
          current_stock: stockAfter,
          available_stock: Math.max(0, stockAfter - (item.reserved_stock || 0)),
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      return { success: true, stock_after: stockAfter }
    } catch (error) {
      console.error('Error creating stock movement:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get stock movements
  async getStockMovements(itemId, companyId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options

      let query = supabase
        .from('inventory_movements')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      if (itemId) {
        query = query.eq('item_id', itemId)
      }

      query = query.order('movement_date', { ascending: false })

      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        success: true,
        data,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit
        }
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get low stock items
  async getLowStockItems(companyId) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol)
        `)
        .eq('company_id', companyId)
        .eq('track_inventory', true)
        .eq('is_active', true)
        .filter('current_stock', 'lte', 'reorder_level')
        .order('current_stock', { ascending: true })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get item categories
  async getItemCategories(companyId) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('category')
        .eq('company_id', companyId)
        .not('category', 'is', null)
        .neq('category', '')

      if (error) throw error

      const categories = [...new Set(data.map(item => item.category).filter(Boolean))]
      
      return { success: true, data: categories }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Import items from CSV/Excel
  async importItems(companyId, itemsData) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      }

      for (const itemData of itemsData) {
        try {
          await this.createItem({
            ...itemData,
            company_id: companyId
          })
          results.successful++
        } catch (error) {
          results.failed++
          results.errors.push({
            item: itemData.item_name || itemData.item_code,
            error: error.message
          })
        }
      }

      return {
        success: results.failed === 0,
        data: results
      }
    } catch (error) {
      console.error('Error importing items:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default itemService
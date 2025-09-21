// lib/db.js
import { supabase } from '../services/utils/supabase'

// Database connection and query helpers
export const db = {
  // Generic CRUD operations
  async create(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single()
    
    return { data: result, error }
  },

  async read(table, filters = {}, options = {}) {
    let query = supabase.from(table).select(options.select || '*')
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })
    
    // Apply options
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      })
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }
    
    const { data, error } = await query
    return { data, error }
  },

  async update(table, id, data) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    return { data: result, error }
  },

  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    return { error }
  },

  async findById(table, id, select = '*') {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  async findOne(table, filters, select = '*') {
    let query = supabase.from(table).select(select)
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { data, error } = await query.single()
    return { data, error }
  },

  async findMany(table, filters = {}, options = {}) {
    return this.read(table, filters, options)
  },

  async count(table, filters = {}) {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })
    
    const { count, error } = await query
    return { count, error }
  },

  // Batch operations
  async batchCreate(table, dataArray) {
    const { data, error } = await supabase
      .from(table)
      .insert(dataArray)
      .select()
    
    return { data, error }
  },

  async batchUpdate(table, updates) {
    const promises = updates.map(({ id, data }) => 
      this.update(table, id, data)
    )
    
    const results = await Promise.allSettled(promises)
    const errors = results.filter(r => r.status === 'rejected').map(r => r.reason)
    const data = results.filter(r => r.status === 'fulfilled').map(r => r.value.data)
    
    return { data, errors: errors.length > 0 ? errors : null }
  },

  async batchDelete(table, ids) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', ids)
    
    return { error }
  },

  // Search operations
  async search(table, searchColumn, searchTerm, options = {}) {
    let query = supabase
      .from(table)
      .select(options.select || '*')
      .ilike(searchColumn, `%${searchTerm}%`)
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      })
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    return { data, error }
  },

  // Aggregation operations
  async sum(table, column, filters = {}) {
    let query = supabase.from(table).select(column)
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { data, error } = await query
    
    if (error) return { sum: 0, error }
    
    const sum = data.reduce((total, row) => total + (row[column] || 0), 0)
    return { sum, error: null }
  },

  async avg(table, column, filters = {}) {
    const { sum, error: sumError } = await this.sum(table, column, filters)
    const { count, error: countError } = await this.count(table, filters)
    
    if (sumError || countError) {
      return { avg: 0, error: sumError || countError }
    }
    
    const avg = count > 0 ? sum / count : 0
    return { avg, error: null }
  },

  // Transaction operations
  async transaction(operations) {
    try {
      const results = []
      
      for (const operation of operations) {
        const { table, action, data, id, filters } = operation
        
        let result
        switch (action) {
          case 'create':
            result = await this.create(table, data)
            break
          case 'update':
            result = await this.update(table, id, data)
            break
          case 'delete':
            result = await this.delete(table, id)
            break
          case 'read':
            result = await this.read(table, filters)
            break
          default:
            throw new Error(`Unknown action: ${action}`)
        }
        
        if (result.error) {
          throw new Error(`Transaction failed at operation ${results.length + 1}: ${result.error.message}`)
        }
        
        results.push(result)
      }
      
      return { data: results, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Real-time subscriptions
  subscribe(table, callback, filters = {}) {
    let channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        ...filters
      }, callback)
      .subscribe()
    
    return channel
  },

  unsubscribe(channel) {
    return supabase.removeChannel(channel)
  },

  // Company-scoped operations
  async createWithCompany(table, data, companyId) {
    return this.create(table, { ...data, company_id: companyId })
  },

  async readByCompany(table, companyId, options = {}) {
    return this.read(table, { company_id: companyId }, options)
  },

  async updateWithCompany(table, id, data, companyId) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()
    
    return { data: result, error }
  },

  async deleteWithCompany(table, id, companyId) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
    
    return { error }
  },

  // Utility functions
  formatError(error) {
    if (!error) return null
    
    // Map common Supabase errors to user-friendly messages
    const errorMap = {
      '23505': 'A record with this information already exists',
      '23503': 'Cannot delete this record as it is being used elsewhere',
      '42501': 'You do not have permission to perform this action',
      'PGRST116': 'No records found'
    }
    
    return errorMap[error.code] || error.message || 'An error occurred'
  },

  validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.trim()
    }
    return input
  }
}

export default db
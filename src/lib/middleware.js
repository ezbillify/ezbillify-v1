// lib/middleware.js
import { supabase } from '../services/utils/supabase'
import { USER_ROLES } from './constants'

// Authentication middleware
export const authMiddleware = {
  // Check if user is authenticated
  async requireAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' })
      }

      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' })
      }

      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' })
    }
  },

  // Check if user has required role
  requireRole(roles) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'User not authenticated' })
        }

        // Get user profile with role
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', req.user.id)
          .single()

        if (error || !userProfile) {
          return res.status(403).json({ error: 'User profile not found' })
        }

        const userRole = userProfile.role
        const allowedRoles = Array.isArray(roles) ? roles : [roles]

        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }

        req.userRole = userRole
        next()
      } catch (error) {
        return res.status(500).json({ error: 'Role check failed' })
      }
    }
  },

  // Check if user belongs to company
  async requireCompany(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const companyId = req.params.companyId || req.body.company_id || req.query.company_id

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID required' })
      }

      // Check if user belongs to the company
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', req.user.id)
        .single()

      if (error || !userProfile) {
        return res.status(403).json({ error: 'User profile not found' })
      }

      if (userProfile.company_id !== companyId) {
        return res.status(403).json({ error: 'Access denied to this company' })
      }

      req.companyId = companyId
      next()
    } catch (error) {
      return res.status(500).json({ error: 'Company access check failed' })
    }
  }
}

// Validation middleware
export const validationMiddleware = {
  // Validate request body against schema
  validateBody(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body)
      
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(detail => detail.message)
        })
      }
      
      req.body = value
      next()
    }
  },

  // Validate UUID parameters
  validateUUID(paramName) {
    return (req, res, next) => {
      const uuid = req.params[paramName]
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      
      if (!uuidRegex.test(uuid)) {
        return res.status(400).json({ error: `Invalid ${paramName} format` })
      }
      
      next()
    }
  },

  // Validate pagination parameters
  validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    if (page < 1) {
      return res.status(400).json({ error: 'Page must be greater than 0' })
    }
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' })
    }
    
    req.pagination = { page, limit, offset: (page - 1) * limit }
    next()
  },

  // Validate date range
  validateDateRange(req, res, next) {
    const { start_date, end_date } = req.query
    
    if (start_date && end_date) {
      const startDate = new Date(start_date)
      const endDate = new Date(end_date)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' })
      }
      
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' })
      }
      
      req.dateRange = { startDate, endDate }
    }
    
    next()
  }
}

// Rate limiting middleware
export const rateLimitMiddleware = {
  // Simple in-memory rate limiter
  createRateLimit(windowMs, maxRequests) {
    const requests = new Map()
    
    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress
      const now = Date.now()
      const windowStart = now - windowMs
      
      // Clean old entries
      const userRequests = requests.get(key) || []
      const validRequests = userRequests.filter(time => time > windowStart)
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        })
      }
      
      validRequests.push(now)
      requests.set(key, validRequests)
      
      next()
    }
  },

  // Rate limit by user
  createUserRateLimit(windowMs, maxRequests) {
    const requests = new Map()
    
    return (req, res, next) => {
      const key = req.user?.id || req.ip
      const now = Date.now()
      const windowStart = now - windowMs
      
      const userRequests = requests.get(key) || []
      const validRequests = userRequests.filter(time => time > windowStart)
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        })
      }
      
      validRequests.push(now)
      requests.set(key, validRequests)
      
      next()
    }
  }
}

// Security middleware
export const securityMiddleware = {
  // CORS middleware
  cors(req, res, next) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    const origin = req.headers.origin
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }
    
    next()
  },

  // Security headers
  securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    next()
  },

  // Content Security Policy
  csp(req, res, next) {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.supabase.co wss://api.supabase.co",
      "frame-ancestors 'none'"
    ].join('; ')
    
    res.setHeader('Content-Security-Policy', cspDirectives)
    next()
  }
}

// Error handling middleware
export const errorMiddleware = {
  // Handle async errors
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  },

  // Global error handler
  errorHandler(err, req, res, next) {
    console.error('Error:', err)
    
    // Supabase errors
    if (err.code) {
      const statusMap = {
        '23505': 409, // Unique violation
        '23503': 409, // Foreign key violation
        '42501': 403, // Insufficient privilege
        'PGRST116': 404 // Not found
      }
      
      const status = statusMap[err.code] || 500
      return res.status(status).json({
        error: err.message || 'Database error',
        code: err.code
      })
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.details
      })
    }
    
    // Default error
    const status = err.status || 500
    const message = err.message || 'Internal server error'
    
    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
  },

  // 404 handler
  notFound(req, res) {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl
    })
  }
}

// Logging middleware
export const loggingMiddleware = {
  // Request logger
  requestLogger(req, res, next) {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - start
      console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`)
    })
    
    next()
  },

  // API logger with user info
  apiLogger(req, res, next) {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - start
      const log = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      }
      
      console.log(JSON.stringify(log))
    })
    
    next()
  }
}

export default {
  authMiddleware,
  validationMiddleware,
  rateLimitMiddleware,
  securityMiddleware,
  errorMiddleware,
  loggingMiddleware
}
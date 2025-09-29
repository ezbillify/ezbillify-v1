import { supabase, supabaseAdmin } from '../services/utils/supabase'

// Main authentication wrapper function (what our APIs use)
export const withAuth = (handler) => {
  return async (req, res) => {
    try {
      // Apply security headers
      securityMiddleware.securityHeaders(req, res, () => {})
      securityMiddleware.cors(req, res, () => {})

      // Handle OPTIONS requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end()
      }

      // Get token from headers
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.token ||
                   req.headers['x-auth-token']

      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication token required' 
        })
      }

      // Verify token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired token' 
        })
      }

      // FIXED: Use supabaseAdmin to bypass RLS when fetching user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        console.error('Profile fetch error:', profileError)
        return res.status(403).json({ 
          success: false, 
          error: 'User profile not found' 
        })
      }

      // FIXED: Use supabaseAdmin to bypass RLS when fetching company
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (companyError || !company) {
        console.error('Company fetch error:', companyError)
        return res.status(403).json({ 
          success: false, 
          error: 'User not associated with any company' 
        })
      }

      // Check if user is active
      if (!userProfile.is_active) {
        return res.status(403).json({ 
          success: false, 
          error: 'User account is deactivated' 
        })
      }

      // Check if company is active
      if (company.status !== 'active') {
        return res.status(403).json({ 
          success: false, 
          error: 'Company account is not active' 
        })
      }

      // Attach auth info to request with separate company object
      req.auth = {
        user: user,
        profile: userProfile,
        company: company,
        role: userProfile.role,
        permissions: userProfile.permissions || {}
      }

      // FIXED: Use supabaseAdmin to update last login (bypass RLS)
      await supabaseAdmin
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          login_count: (userProfile.login_count || 0) + 1
        })
        .eq('id', user.id)

      // Call the actual handler
      return await handler(req, res)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

// Role-based authorization
export const withRole = (allowedRoles) => {
  return (handler) => {
    return withAuth(async (req, res) => {
      const userRole = req.auth.role
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for this action'
        })
      }

      return await handler(req, res)
    })
  }
}

// Permission-based authorization
export const withPermission = (requiredPermission) => {
  return (handler) => {
    return withAuth(async (req, res) => {
      const permissions = req.auth.permissions
      
      if (!permissions[requiredPermission]) {
        return res.status(403).json({
          success: false,
          error: `Missing required permission: ${requiredPermission}`
        })
      }

      return await handler(req, res)
    })
  }
}

// Authentication middleware (legacy - for backward compatibility)
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

        const { data: userProfile, error } = await supabaseAdmin
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

      const { data: userProfile, error } = await supabaseAdmin
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
          success: false,
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
        return res.status(400).json({ 
          success: false, 
          error: `Invalid ${paramName} format` 
        })
      }
      
      next()
    }
  },

  // Validate pagination parameters
  validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    if (page < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Page must be greater than 0' 
      })
    }
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Limit must be between 1 and 100' 
      })
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
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid date format' 
        })
      }
      
      if (startDate > endDate) {
        return res.status(400).json({ 
          success: false, 
          error: 'Start date must be before end date' 
        })
      }
      
      req.dateRange = { startDate, endDate }
    }
    
    next()
  }
}

// Rate limiting middleware
export const rateLimitMiddleware = {
  // Simple in-memory rate limiter
  createRateLimit(windowMs = 15 * 60 * 1000, maxRequests = 100) {
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
          success: false,
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
  createUserRateLimit(windowMs = 15 * 60 * 1000, maxRequests = 1000) {
    const requests = new Map()
    
    return (req, res, next) => {
      const key = req.auth?.user?.id || req.ip
      const now = Date.now()
      const windowStart = now - windowMs
      
      const userRequests = requests.get(key) || []
      const validRequests = userRequests.filter(time => time > windowStart)
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
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
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', 
      'https://ezbillify.com',
      'https://*.ezbillify.com'
    ]
    const origin = req.headers.origin
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*')
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Max-Age', '86400')
    
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
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    next()
  },

  // Content Security Policy
  csp(req, res, next) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${supabaseUrl} wss://${supabaseUrl?.replace('https://', '')} https://api.exchangerate-api.com https://ifsc.razorpay.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
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
    console.error('API Error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      userId: req.auth?.user?.id,
      timestamp: new Date().toISOString()
    })
    
    // Supabase errors
    if (err.code) {
      const statusMap = {
        '23505': 409,
        '23503': 409,
        '42501': 403,
        'PGRST116': 404,
        '42P01': 400,
        '42703': 400
      }
      
      const status = statusMap[err.code] || 500
      return res.status(status).json({
        success: false,
        error: err.message || 'Database error',
        code: err.code
      })
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.details
      })
    }
    
    // Default error
    const status = err.status || 500
    const message = err.message || 'Internal server error'
    
    res.status(status).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
  },

  // 404 handler
  notFound(req, res) {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
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
        userId: req.auth?.user?.id,
        companyId: req.auth?.company?.id,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
      
      if (process.env.NODE_ENV === 'production') {
        if (res.statusCode >= 400 || duration > 1000) {
          console.log(JSON.stringify(log))
        }
      } else {
        console.log(JSON.stringify(log))
      }
    })
    
    next()
  },

  // Audit logger for sensitive operations
  auditLogger(action) {
    return async (req, res, next) => {
      try {
        if (req.auth?.user) {
          await supabaseAdmin.from('audit_logs').insert({
            user_id: req.auth.user.id,
            company_id: req.auth.company.id,
            action: action,
            resource_type: req.originalUrl.split('/')[3] || 'unknown',
            resource_id: req.params.id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            metadata: {
              method: req.method,
              url: req.originalUrl,
              body: req.method !== 'GET' ? req.body : undefined
            }
          })
        }
      } catch (error) {
        console.error('Audit logging failed:', error)
      }
      
      next()
    }
  }
}

// Helper functions
export const helpers = {
  hasPermission(req, permission) {
    return req.auth?.permissions?.[permission] === true
  },

  hasRole(req, role) {
    const userRole = req.auth?.role
    if (Array.isArray(role)) {
      return role.includes(userRole)
    }
    return userRole === role
  },

  getCompanyId(req) {
    return req.auth?.company?.id
  },

  getUserId(req) {
    return req.auth?.user?.id
  }
}

export default {
  withAuth,
  withRole,
  withPermission,
  authMiddleware,
  validationMiddleware,
  rateLimitMiddleware,
  securityMiddleware,
  errorMiddleware,
  loggingMiddleware,
  helpers
}
// middleware/auth.js
import { supabase } from '../services/utils/supabase'
import { USER_ROLES } from '../lib/constants'

// Authentication middleware for API routes
export const withAuth = (handler) => {
  return async (req, res) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'No valid authorization token provided' 
        })
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid or expired token' 
        })
      }

      // Get user profile with company info
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select(`
          *,
          companies (
            id,
            name,
            status,
            subscription_plan
          )
        `)
        .eq('id', user.id)
        .single()

      if (profileError) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'User profile not found' 
        })
      }

      // Check if user is active
      if (!userProfile.is_active) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'User account is deactivated' 
        })
      }

      // Attach user info to request
      req.user = user
      req.userProfile = userProfile
      req.company = userProfile.companies

      // Continue to the handler
      return handler(req, res)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Authentication failed' 
      })
    }
  }
}

// Company access middleware
export const withCompanyAccess = (handler) => {
  return withAuth(async (req, res) => {
    try {
      if (!req.company) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'No company associated with user' 
        })
      }

      // Check company status
      if (req.company.status !== 'active') {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Company account is not active' 
        })
      }

      return handler(req, res)
    } catch (error) {
      console.error('Company access middleware error:', error)
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Company access check failed' 
      })
    }
  })
}

// Role-based access middleware
export const withRole = (allowedRoles) => {
  return (handler) => {
    return withAuth(async (req, res) => {
      try {
        const userRole = req.userProfile.role
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

        if (!roles.includes(userRole)) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Insufficient permissions for this action' 
          })
        }

        return handler(req, res)
      } catch (error) {
        console.error('Role middleware error:', error)
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Role check failed' 
        })
      }
    })
  }
}

// Admin only middleware
export const withAdminOnly = (handler) => {
  return withRole([USER_ROLES.ADMIN])(handler)
}

// Resource ownership middleware
export const withResourceOwnership = (getResourceOwnerId) => {
  return (handler) => {
    return withAuth(async (req, res) => {
      try {
        const resourceOwnerId = await getResourceOwnerId(req)
        
        // Admin can access all resources
        if (req.userProfile.role === USER_ROLES.ADMIN) {
          return handler(req, res)
        }

        // Check if user owns the resource or belongs to same company
        if (resourceOwnerId !== req.user.id && resourceOwnerId !== req.company?.id) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Access denied to this resource' 
          })
        }

        return handler(req, res)
      } catch (error) {
        console.error('Resource ownership middleware error:', error)
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Resource ownership check failed' 
        })
      }
    })
  }
}

// API key authentication middleware (for external integrations)
export const withApiKey = (handler) => {
  return async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key

      if (!apiKey) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'API key required' 
        })
      }

      // Find company by API key
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('api_key', apiKey)
        .eq('status', 'active')
        .single()

      if (error || !company) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid API key' 
        })
      }

      // Attach company info to request
      req.company = company
      req.isApiKeyAuth = true

      return handler(req, res)
    } catch (error) {
      console.error('API key middleware error:', error)
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'API key authentication failed' 
      })
    }
  }
}

// Session validation middleware
export const validateSession = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.session || req.headers['x-session-token']

    if (!sessionToken) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No session token provided' 
      })
    }

    // Verify session with Supabase
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session || session.access_token !== sessionToken) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired session' 
      })
    }

    req.session = session
    req.user = session.user
    next()
  } catch (error) {
    console.error('Session validation error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Session validation failed' 
    })
  }
}

// Request context middleware
export const withContext = (handler) => {
  return async (req, res) => {
    // Add request context
    req.context = {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url
    }

    // Log request
    console.log(`[${req.context.requestId}] ${req.method} ${req.url}`, {
      userAgent: req.context.userAgent,
      ip: req.context.ip
    })

    return handler(req, res)
  }
}

export default {
  withAuth,
  withCompanyAccess,
  withRole,
  withAdminOnly,
  withResourceOwnership,
  withApiKey,
  validateSession,
  withContext
}
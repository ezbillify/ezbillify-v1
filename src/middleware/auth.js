// middleware/auth.js - FIXED VERSION
import { supabase } from '../services/utils/supabase'
import { USER_ROLES } from '../lib/constants'

// Authentication middleware for API routes
export const withAuth = (handler) => {
  return async (req, res) => {
    try {
      console.log('=== AUTH MIDDLEWARE START ===');
      console.log('Request URL:', req.url);
      console.log('Request Method:', req.method);
      
      // Get token from Authorization header
      const authHeader = req.headers.authorization
      console.log('Auth Header Present:', !!authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('AUTH MIDDLEWARE - No valid auth header');
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized', 
          message: 'No valid authorization token provided' 
        })
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      console.log('Token extracted:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 20) + '...'
      });

      // Verify token with Supabase
      console.log('AUTH MIDDLEWARE - Verifying token with Supabase...');
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      console.log('Supabase getUser result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: error?.message
      });
      
      if (error || !user) {
        console.log('AUTH MIDDLEWARE - Token verification failed:', error?.message);
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized', 
          message: 'Invalid or expired token' 
        })
      }

      // Get user profile with company info
      console.log('AUTH MIDDLEWARE - Fetching user profile for:', user.id);
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

      console.log('User profile fetch result:', {
        hasUserProfile: !!userProfile,
        profileError: profileError?.message,
        profileErrorCode: profileError?.code
      });

      if (profileError) {
        console.log('AUTH MIDDLEWARE - Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // FIXED: More specific error handling
        if (profileError.code === 'PGRST116') {
          return res.status(403).json({ 
            success: false,
            error: 'Forbidden', 
            message: 'User account not found. Please contact support.' 
          })
        }
        
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden', 
          message: 'Failed to load user profile' 
        })
      }

      if (!userProfile) {
        console.log('AUTH MIDDLEWARE - No user profile returned');
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden', 
          message: 'User account not found. Please contact support.' 
        })
      }

      // Check if user is active
      if (!userProfile.is_active) {
        console.log('AUTH MIDDLEWARE - User account is deactivated');
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden', 
          message: 'User account is deactivated' 
        })
      }

      // Attach user info to request
      req.user = user
      req.userProfile = userProfile
      req.company = userProfile.companies

      console.log('AUTH MIDDLEWARE - Success! User authenticated:', {
        userId: user.id,
        userEmail: user.email,
        role: userProfile.role,
        companyId: userProfile.company_id,
        companyName: userProfile.companies?.name
      });
      console.log('=== AUTH MIDDLEWARE END ===');

      // Continue to the handler
      return handler(req, res)
    } catch (error) {
      console.error('AUTH MIDDLEWARE - Unexpected error:', error);
      return res.status(500).json({ 
        success: false,
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
          success: false,
          error: 'Forbidden', 
          message: 'No company associated with user' 
        })
      }

      // Check company status
      if (req.company.status !== 'active') {
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden', 
          message: 'Company account is not active' 
        })
      }

      return handler(req, res)
    } catch (error) {
      console.error('Company access middleware error:', error)
      return res.status(500).json({ 
        success: false,
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
            success: false,
            error: 'Forbidden', 
            message: 'Insufficient permissions for this action' 
          })
        }

        return handler(req, res)
      } catch (error) {
        console.error('Role middleware error:', error)
        return res.status(500).json({ 
          success: false,
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
            success: false,
            error: 'Forbidden', 
            message: 'Access denied to this resource' 
          })
        }

        return handler(req, res)
      } catch (error) {
        console.error('Resource ownership middleware error:', error)
        return res.status(500).json({ 
          success: false,
          error: 'Internal Server Error', 
          message: 'Resource ownership check failed' 
        })
      }
    })
  }
}

export default {
  withAuth,
  withCompanyAccess,
  withRole,
  withAdminOnly,
  withResourceOwnership
}
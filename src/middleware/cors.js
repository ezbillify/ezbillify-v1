// middleware/cors.js

// CORS configuration
const corsConfig = {
    // Allowed origins (can be environment-specific)
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    
    // Allowed HTTP methods
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    
    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key',
      'X-Session-Token',
      'X-Company-ID',
      'X-Request-ID'
    ],
    
    // Exposed headers (headers that client can access)
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    
    // Preflight cache duration (in seconds)
    maxAge: 86400 // 24 hours
  }
  
  // Main CORS middleware
  export const cors = (options = {}) => {
    const config = { ...corsConfig, ...options }
    
    return (req, res, next) => {
      const origin = req.headers.origin
      
      // Check if origin is allowed
      if (origin && config.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
      } else if (config.allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*')
      }
      
      // Set other CORS headers
      res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '))
      res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
      
      if (config.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true')
      }
      
      if (config.maxAge) {
        res.setHeader('Access-Control-Max-Age', config.maxAge.toString())
      }
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
      }
      
      next()
    }
  }
  
  // Strict CORS for production
  export const strictCors = cors({
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true
  })
  
  // Permissive CORS for development
  export const devCors = cors({
    allowedOrigins: ['*'],
    credentials: false
  })
  
  // API-specific CORS (for external integrations)
  export const apiCors = cors({
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    credentials: false
  })
  
  // Webhook CORS (for receiving webhooks)
  export const webhookCors = cors({
    allowedOrigins: ['*'],
    allowedMethods: ['POST'],
    allowedHeaders: ['Content-Type', 'User-Agent', 'X-Webhook-Signature'],
    credentials: false
  })
  
  // Domain-specific CORS
  export const createDomainCors = (domains) => {
    return cors({
      allowedOrigins: Array.isArray(domains) ? domains : [domains],
      credentials: true
    })
  }
  
  // CORS with dynamic origin checking
  export const dynamicCors = (originChecker) => {
    return (req, res, next) => {
      const origin = req.headers.origin
      
      // Check origin dynamically
      const isAllowed = originChecker(origin, req)
      
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*')
        res.setHeader('Access-Control-Allow-Credentials', 'true')
      }
      
      res.setHeader('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '))
      res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '))
      
      if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
      }
      
      next()
    }
  }
  
  // CORS for file uploads
  export const uploadCors = cors({
    allowedOrigins: corsConfig.allowedOrigins,
    allowedMethods: ['POST', 'PUT'],
    allowedHeaders: [
      ...corsConfig.allowedHeaders,
      'Content-Length',
      'Content-Range',
      'X-File-Name',
      'X-File-Size'
    ],
    credentials: true
  })
  
  export default {
    cors,
    strictCors,
    devCors,
    apiCors,
    webhookCors,
    createDomainCors,
    dynamicCors,
    uploadCors
  }
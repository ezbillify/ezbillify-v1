// middleware/rateLimit.js

// In-memory store for rate limiting (use Redis in production)
class MemoryStore {
    constructor() {
      this.hits = new Map()
      this.resetTime = new Map()
    }
  
    // Get current hit count for a key
    async get(key) {
      return this.hits.get(key) || 0
    }
  
    // Increment hit count for a key
    async increment(key, windowMs) {
      const now = Date.now()
      const resetTime = this.resetTime.get(key) || now
  
      // Reset if window has expired
      if (now >= resetTime) {
        this.hits.set(key, 1)
        this.resetTime.set(key, now + windowMs)
        return 1
      }
  
      // Increment existing count
      const newCount = (this.hits.get(key) || 0) + 1
      this.hits.set(key, newCount)
      return newCount
    }
  
    // Get time until reset
    async getResetTime(key) {
      return this.resetTime.get(key) || Date.now()
    }
  
    // Clear all data for a key
    async reset(key) {
      this.hits.delete(key)
      this.resetTime.delete(key)
    }
  
    // Clean up expired entries
    cleanup() {
      const now = Date.now()
      for (const [key, resetTime] of this.resetTime.entries()) {
        if (now >= resetTime) {
          this.hits.delete(key)
          this.resetTime.delete(key)
        }
      }
    }
  }
  
  // Default store instance
  const defaultStore = new MemoryStore()
  
  // Cleanup expired entries every 5 minutes
  setInterval(() => {
    defaultStore.cleanup()
  }, 5 * 60 * 1000)
  
  // Rate limiting configuration presets
  export const rateLimitPresets = {
    // General API limits
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests, please try again later.'
    },
  
    // Strict limits for authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts, please try again later.'
    },
  
    // File upload limits
    upload: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 uploads per minute
      message: 'Upload rate limit exceeded, please wait before uploading again.'
    },
  
    // API integration limits
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
      message: 'API rate limit exceeded.'
    },
  
    // Webhook limits
    webhook: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 webhooks per minute
      message: 'Webhook rate limit exceeded.'
    },
  
    // Password reset limits
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset attempts per hour
      message: 'Too many password reset attempts, please try again later.'
    },
  
    // Email sending limits
    email: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 emails per hour
      message: 'Email sending rate limit exceeded.'
    },
  
    // Report generation limits
    reports: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 reports per minute
      message: 'Report generation rate limit exceeded.'
    }
  }
  
  // Main rate limiting middleware
  export const rateLimit = (options = {}) => {
    const config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      max: 100, // 100 requests default
      message: 'Too many requests, please try again later.',
      headers: true, // Include rate limit headers in response
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => req.ip || req.connection.remoteAddress,
      store: defaultStore,
      onLimitReached: null,
      ...options
    }
  
    return async (req, res, next) => {
      try {
        // Generate unique key for this client
        const key = `ratelimit:${config.keyGenerator(req)}`
        
        // Get current hit count
        const hits = await config.store.increment(key, config.windowMs)
        const resetTime = await config.store.getResetTime(key)
        
        // Add rate limit headers
        if (config.headers) {
          res.setHeader('X-Rate-Limit-Limit', config.max)
          res.setHeader('X-Rate-Limit-Remaining', Math.max(0, config.max - hits))
          res.setHeader('X-Rate-Limit-Reset', new Date(resetTime).toISOString())
          res.setHeader('X-Rate-Limit-Window', config.windowMs)
        }
  
        // Check if limit exceeded
        if (hits > config.max) {
          if (config.onLimitReached) {
            config.onLimitReached(req, res)
          }
  
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
          res.setHeader('Retry-After', retryAfter)
  
          return res.status(429).json({
            error: 'Too Many Requests',
            message: config.message,
            retryAfter: retryAfter
          })
        }
  
        next()
      } catch (error) {
        console.error('Rate limit middleware error:', error)
        // Continue on error to avoid blocking requests
        next()
      }
    }
  }
  
  // User-specific rate limiting
  export const userRateLimit = (options = {}) => {
    return rateLimit({
      ...options,
      keyGenerator: (req) => {
        // Use user ID if authenticated, fallback to IP
        return req.user?.id || req.ip || req.connection.remoteAddress
      }
    })
  }
  
  // Company-specific rate limiting
  export const companyRateLimit = (options = {}) => {
    return rateLimit({
      ...options,
      keyGenerator: (req) => {
        // Use company ID if available, fallback to user ID or IP
        return req.company?.id || req.user?.id || req.ip || req.connection.remoteAddress
      }
    })
  }
  
  // API key-specific rate limiting
  export const apiKeyRateLimit = (options = {}) => {
    return rateLimit({
      ...options,
      keyGenerator: (req) => {
        const apiKey = req.headers['x-api-key'] || req.query.api_key
        return apiKey || req.ip || req.connection.remoteAddress
      }
    })
  }
  
  // Sliding window rate limiter
  export const slidingWindowRateLimit = (options = {}) => {
    const config = {
      windowMs: 60 * 1000, // 1 minute
      max: 60,
      ...options
    }
  
    const requests = new Map()
  
    return async (req, res, next) => {
      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : req.ip
        const now = Date.now()
        const windowStart = now - config.windowMs
  
        // Get existing requests for this key
        const userRequests = requests.get(key) || []
        
        // Filter out requests outside the window
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart)
        
        // Check if limit exceeded
        if (validRequests.length >= config.max) {
          const oldestRequest = validRequests[0]
          const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000)
          
          res.setHeader('Retry-After', retryAfter)
          return res.status(429).json({
            error: 'Too Many Requests',
            message: options.message || 'Rate limit exceeded',
            retryAfter: retryAfter
          })
        }
  
        // Add current request timestamp
        validRequests.push(now)
        requests.set(key, validRequests)
  
        // Add headers
        res.setHeader('X-Rate-Limit-Limit', config.max)
        res.setHeader('X-Rate-Limit-Remaining', config.max - validRequests.length)
  
        next()
      } catch (error) {
        console.error('Sliding window rate limit error:', error)
        next()
      }
    }
  }
  
  // Progressive rate limiting (increases delay with each violation)
  export const progressiveRateLimit = (options = {}) => {
    const config = {
      windowMs: 15 * 60 * 1000,
      max: 100,
      multiplier: 2,
      maxDelay: 60000, // 1 minute max delay
      ...options
    }
  
    const violations = new Map()
    const delays = new Map()
  
    return async (req, res, next) => {
      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : req.ip
        const now = Date.now()
  
        // Check current violations
        const userViolations = violations.get(key) || []
        const recentViolations = userViolations.filter(v => v > now - config.windowMs)
  
        // Check if currently delayed
        const currentDelay = delays.get(key) || 0
        if (currentDelay > now) {
          const retryAfter = Math.ceil((currentDelay - now) / 1000)
          res.setHeader('Retry-After', retryAfter)
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Progressive rate limit in effect',
            retryAfter: retryAfter
          })
        }
  
        // Apply basic rate limit
        const basicLimit = rateLimit(config)
        
        // Wrap next to catch rate limit violations
        const originalNext = next
        let rateLimitViolation = false
  
        const wrappedNext = () => {
          if (!rateLimitViolation) {
            originalNext()
          }
        }
  
        // Override res.status to detect 429 responses
        const originalStatus = res.status
        res.status = function(code) {
          if (code === 429) {
            rateLimitViolation = true
            
            // Add violation
            recentViolations.push(now)
            violations.set(key, recentViolations)
            
            // Calculate progressive delay
            const violationCount = recentViolations.length
            const delay = Math.min(
              config.multiplier ** violationCount * 1000,
              config.maxDelay
            )
            
            delays.set(key, now + delay)
          }
          return originalStatus.call(this, code)
        }
  
        basicLimit(req, res, wrappedNext)
      } catch (error) {
        console.error('Progressive rate limit error:', error)
        next()
      }
    }
  }
  
  // Create preset rate limiters
  export const createAuthRateLimit = () => rateLimit(rateLimitPresets.auth)
  export const createUploadRateLimit = () => rateLimit(rateLimitPresets.upload)
  export const createApiRateLimit = () => rateLimit(rateLimitPresets.api)
  export const createWebhookRateLimit = () => rateLimit(rateLimitPresets.webhook)
  export const createPasswordResetRateLimit = () => rateLimit(rateLimitPresets.passwordReset)
  export const createEmailRateLimit = () => rateLimit(rateLimitPresets.email)
  export const createReportsRateLimit = () => rateLimit(rateLimitPresets.reports)
  
  export default {
    rateLimit,
    userRateLimit,
    companyRateLimit,
    apiKeyRateLimit,
    slidingWindowRateLimit,
    progressiveRateLimit,
    rateLimitPresets,
    createAuthRateLimit,
    createUploadRateLimit,
    createApiRateLimit,
    createWebhookRateLimit,
    createPasswordResetRateLimit,
    createEmailRateLimit,
    createReportsRateLimit
  }
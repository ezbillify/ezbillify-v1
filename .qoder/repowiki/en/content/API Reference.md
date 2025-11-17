# API Reference

<cite>
**Referenced Files in This Document**   
- [auth.js](file://src/pages/api/auth/send-otp.js)
- [auth.js](file://src/pages/api/auth/verify-otp.js)
- [invoices.js](file://src/pages/api/sales/invoices/index.js)
- [customers.js](file://src/pages/api/customers/index.js)
- [items.js](file://src/pages/api/items/index.js)
- [auth.js](file://src/middleware/auth.js)
- [rateLimit.js](file://src/middleware/rateLimit.js)
- [cors.js](file://src/middleware/cors.js)
- [constants.js](file://src/lib/constants.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Sales API](#sales-api)
4. [Customers API](#customers-api)
5. [Items API](#items-api)
6. [Rate Limiting](#rate-limiting)
7. [Security Considerations](#security-considerations)
8. [Error Handling](#error-handling)
9. [Client Implementation Guidelines](#client-implementation-guidelines)
10. [Performance Optimization](#performance-optimization)

## Introduction

The ezbillify-v1 API provides comprehensive functionality for managing billing, accounting, sales, purchase, inventory, and master data operations. The API follows RESTful principles and is organized into logical groups based on functionality. All API endpoints are accessible under the `/api` path and require authentication via Bearer tokens.

The API supports JSON request and response formats and includes comprehensive error handling, rate limiting, and CORS protection. The system is designed to handle both B2B and B2C scenarios with support for GST compliance, including CGST, SGST, and IGST calculations based on the location of the company and customer.

**Section sources**
- [README.md](file://README.md#L21-L23)

## Authentication

The authentication system uses Supabase Auth with OTP-based login flow. Users authenticate by sending an OTP to their email and then verifying it.

### Send OTP
- **HTTP Method**: POST
- **URL**: `/api/auth/send-otp`
- **Authentication**: Not required
- **Request Body**:
```json
{
  "email": "user@example.com"
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "OTP sent successfully to your email"
}
```
- **Response (Error)**:
```json
{
  "message": "Email not found. Please create an account first."
}
```

### Verify OTP
- **HTTP Method**: POST
- **URL**: `/api/auth/verify-otp`
- **Authentication**: Not required
- **Request Body**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "Login successful",
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600,
    "user": {
      "id": "string",
      "email": "string"
    }
  }
}
```

All subsequent API requests require the Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

**Section sources**
- [send-otp.js](file://src/pages/api/auth/send-otp.js#L6-L76)
- [verify-otp.js](file://src/pages/api/auth/verify-otp.js#L4-L68)
- [auth.js](file://src/middleware/auth.js#L5-L252)

## Sales API

The Sales API provides functionality for creating and managing invoices, quotations, sales orders, and related documents.

### Create Invoice
- **HTTP Method**: POST
- **URL**: `/api/sales/invoices`
- **Authentication**: Required
- **Request Body**:
```json
{
  "company_id": "string",
  "branch_id": "string",
  "customer_id": "string",
  "document_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "items": [
    {
      "item_id": "string",
      "item_name": "string",
      "quantity": 1,
      "rate": 100,
      "tax_rate": 18,
      "taxable_amount": 100,
      "cgst_rate": 9,
      "cgst_amount": 9,
      "sgst_rate": 9,
      "sgst_amount": 9,
      "total_amount": 118
    }
  ],
  "discount_percentage": 0,
  "discount_amount": 0,
  "notes": "string",
  "terms_conditions": "string"
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": "string",
    "document_number": "string",
    "document_date": "YYYY-MM-DD",
    "customer_name": "string",
    "subtotal": 100,
    "tax_amount": 18,
    "total_amount": 118,
    "balance_amount": 118,
    "payment_status": "unpaid",
    "status": "draft"
  }
}
```

### Get Invoices
- **HTTP Method**: GET
- **URL**: `/api/sales/invoices?company_id=COMPANY_ID`
- **Authentication**: Required
- **Query Parameters**:
  - `company_id` (required): Company ID
  - `branch_id`: Branch ID
  - `customer_id`: Customer ID
  - `status`: Document status (draft, sent, paid, etc.)
  - `payment_status`: Payment status (unpaid, partially_paid, paid)
  - `from_date`: Start date (YYYY-MM-DD)
  - `to_date`: End date (YYYY-MM-DD)
  - `search`: Search term
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50, max: 100)
  - `sort_by`: Field to sort by (default: document_date)
  - `sort_order`: Sort order (asc or desc, default: desc)

- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "document_number": "string",
      "document_date": "YYYY-MM-DD",
      "customer_name": "string",
      "total_amount": 118,
      "payment_status": "unpaid",
      "status": "draft"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 1,
    "per_page": 50,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

**Section sources**
- [index.js](file://src/pages/api/sales/invoices/index.js#L6-L625)

## Customers API

The Customers API allows for managing customer information, including B2B and B2C customers with different fields and requirements.

### Create Customer
- **HTTP Method**: POST
- **URL**: `/api/customers`
- **Authentication**: Required
- **Request Body**:
```json
{
  "company_id": "string",
  "customer_type": "b2b",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "company_name": "ABC Corp",
  "gstin": "27AABCCDDEEFFG",
  "billing_address": {
    "address_line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "credit_limit": 10000,
  "discount_percentage": 5,
  "opening_balance": 0,
  "opening_balance_type": "debit"
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "string",
    "customer_code": "B2B-0001",
    "name": "John Doe",
    "email": "john@example.com",
    "gstin": "27AABCCDDEEFFG",
    "credit_limit": 10000,
    "discount_percentage": 5,
    "current_balance": 0
  }
}
```

### Get Customers
- **HTTP Method**: GET
- **URL**: `/api/customers?company_id=COMPANY_ID`
- **Authentication**: Required
- **Query Parameters**:
  - `company_id` (required): Company ID
  - `customer_type`: Customer type (b2b, b2c)
  - `status`: Customer status (active, inactive)
  - `search`: Search term
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `sort_by`: Field to sort by (default: created_at)
  - `sort_order`: Sort order (asc or desc, default: desc)

- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "customer_code": "B2B-0001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "gstin": "27AABCCDDEEFFG",
      "credit_limit": 10000,
      "discount_percentage": 5,
      "current_balance": 0,
      "status": "active"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 1,
    "per_page": 20,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

**Section sources**
- [index.js](file://src/pages/api/customers/index.js#L5-L434)

## Items API

The Items API manages products and services in the system, including inventory tracking and pricing.

### Create Item
- **HTTP Method**: POST
- **URL**: `/api/items`
- **Authentication**: Required
- **Request Body**:
```json
{
  "company_id": "string",
  "item_name": "Product Name",
  "item_code": "PROD-001",
  "description": "Product description",
  "item_type": "product",
  "category": "Electronics",
  "selling_price": 100,
  "selling_price_with_tax": 118,
  "purchase_price": 80,
  "mrp": 120,
  "primary_unit_id": "string",
  "hsn_sac_code": "8517",
  "tax_rate_id": "string",
  "track_inventory": true,
  "current_stock": 50,
  "reorder_level": 10,
  "barcodes": ["1234567890123"],
  "images": ["https://example.com/image.jpg"],
  "is_active": true,
  "is_for_sale": true
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "Item created successfully",
  "data": {
    "id": "string",
    "item_code": "PROD-001",
    "item_name": "Product Name",
    "selling_price": 100,
    "selling_price_with_tax": 118,
    "tax_rate": 18,
    "current_stock": 50,
    "reorder_level": 10,
    "is_active": true
  }
}
```

### Get Items
- **HTTP Method**: GET
- **URL**: `/api/items?company_id=COMPANY_ID`
- **Authentication**: Required
- **Query Parameters**:
  - `company_id` (required): Company ID
  - `item_type`: Item type (product, service)
  - `category`: Category name
  - `is_active`: Filter by active status (true, false)
  - `track_inventory`: Filter by inventory tracking (true, false)
  - `low_stock`: Filter by low stock items (true, false)
  - `search`: Search term
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50, max: 100)
  - `sort_by`: Field to sort by (default: created_at)
  - `sort_order`: Sort order (asc or desc, default: desc)
  - `is_for_sale`: Filter by sale availability (true, false, default: true)

- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "item_code": "PROD-001",
      "item_name": "Product Name",
      "selling_price": 100,
      "selling_price_with_tax": 118,
      "tax_rate": 18,
      "current_stock": 50,
      "reorder_level": 10,
      "is_active": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 1,
    "per_page": 50,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

**Section sources**
- [index.js](file://src/pages/api/items/index.js#L7-L400)

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure system stability. Different endpoints have different rate limits based on their sensitivity and resource requirements.

### Rate Limit Presets

| Endpoint Type | Window | Max Requests | Message |
|---------------|--------|--------------|---------|
| General API | 15 minutes | 100 | "Too many requests, please try again later." |
| Authentication | 15 minutes | 5 | "Too many authentication attempts, please try again later." |
| File Upload | 1 minute | 10 | "Upload rate limit exceeded, please wait before uploading again." |
| API Integration | 1 minute | 60 | "API rate limit exceeded." |
| Webhook | 1 minute | 100 | "Webhook rate limit exceeded." |
| Password Reset | 1 hour | 3 | "Too many password reset attempts, please try again later." |
| Email Sending | 1 hour | 20 | "Email sending rate limit exceeded." |
| Reports | 1 minute | 5 | "Report generation rate limit exceeded." |

### Rate Limit Headers

All API responses include rate limiting headers:

- `X-Rate-Limit-Limit`: Maximum number of requests in the window
- `X-Rate-Limit-Remaining`: Number of requests remaining in the window
- `X-Rate-Limit-Reset`: ISO timestamp when the rate limit resets
- `X-Rate-Limit-Window`: Window duration in milliseconds

When a rate limit is exceeded, the API returns a 429 status code with the following response:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

The `retryAfter` field indicates the number of seconds to wait before making another request.

**Section sources**
- [rateLimit.js](file://src/middleware/rateLimit.js#L65-L121)

## Security Considerations

The API implements multiple security measures to protect data and prevent unauthorized access.

### Authentication and Authorization

- All API endpoints require authentication via Bearer tokens
- Token verification is performed using Supabase Auth
- User roles (admin, workforce) determine access to resources
- Resource ownership is enforced (users can only access their company's data)
- Admin users have access to all resources within their company

### CORS Protection

The API implements CORS protection with different configurations for different environments:

- **Development**: Allows requests from localhost with credentials
- **Production**: Restricts requests to configured domains with credentials
- **API Endpoints**: Allows requests from any origin without credentials
- **Webhooks**: Allows POST requests from any origin without credentials

### Input Validation

All API endpoints perform comprehensive input validation:

- Required fields are validated
- Email, GSTIN, PAN, and phone numbers are validated against patterns
- Numeric values are validated for appropriate ranges
- Duplicate entries are prevented (email, GSTIN, customer code, item code)
- Business logic validation (credit limit, stock levels, document numbering)

### Error Handling

Error messages are designed to be informative without revealing sensitive information:

- Generic error messages in production
- Detailed error messages in development
- Appropriate HTTP status codes for different error types
- Structured error responses with consistent format

**Section sources**
- [auth.js](file://src/middleware/auth.js#L5-L252)
- [cors.js](file://src/middleware/cors.js#L4-L163)
- [constants.js](file://src/lib/constants.js#L368-L375)

## Error Handling

The API uses a consistent error response format across all endpoints.

### Error Response Format

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional details (development only)"
}
```

### Common Error Codes

| HTTP Status | Error Type | Message | Cause |
|-----------|------------|---------|-------|
| 400 | Bad Request | "Company ID is required" | Missing required parameter |
| 401 | Unauthorized | "No valid authorization token provided" | Missing or invalid authentication token |
| 403 | Forbidden | "Insufficient permissions for this action" | User lacks required permissions |
| 404 | Not Found | "Resource not found" | Requested resource does not exist |
| 405 | Method Not Allowed | "Method not allowed" | HTTP method not supported for endpoint |
| 429 | Too Many Requests | "Rate limit exceeded" | Rate limit has been exceeded |
| 500 | Internal Server Error | "Internal server error" | Unexpected server error |

### Common API Issues

#### Authentication Failures
- **Cause**: Invalid or expired token
- **Solution**: Re-authenticate and obtain a new token
- **Prevention**: Implement token refresh mechanism

#### Validation Errors
- **Cause**: Invalid or missing required fields
- **Solution**: Check request payload against API documentation
- **Prevention**: Implement client-side validation

#### Rate Limit Exceeded
- **Cause**: Too many requests in the time window
- **Solution**: Wait for the specified retry period
- **Prevention**: Implement exponential backoff and caching

#### Credit Limit Exceeded
- **Cause**: Invoice amount exceeds customer's credit limit
- **Solution**: Reduce invoice amount or increase customer's credit limit
- **Prevention**: Check customer's available credit before creating invoice

**Section sources**
- [auth.js](file://src/pages/api/auth/send-otp.js#L8-L9)
- [auth.js](file://src/pages/api/auth/verify-otp.js#L6-L7)
- [invoices.js](file://src/pages/api/sales/invoices/index.js#L22-L23)
- [customers.js](file://src/pages/api/customers/index.js#L15-L18)
- [items.js](file://src/pages/api/items/index.js#L17-L20)

## Client Implementation Guidelines

### Internal Components

Internal components should follow these guidelines for API consumption:

1. **Authentication**: Store the access token securely and include it in all requests
2. **Error Handling**: Implement retry logic for transient errors
3. **Caching**: Cache frequently accessed data to reduce API calls
4. **Pagination**: Use pagination for large datasets to improve performance
5. **Validation**: Validate inputs before making API calls to avoid validation errors

### External Integrations

External integrations should follow these additional guidelines:

1. **Rate Limiting**: Respect rate limits and implement exponential backoff
2. **Security**: Use HTTPS for all API calls
3. **Error Monitoring**: Log and monitor API errors for troubleshooting
4. **Versioning**: Pin to a specific API version to avoid breaking changes
5. **Webhooks**: Implement secure webhook endpoints with signature verification

### Example: Creating an Invoice

```javascript
// 1. Authenticate
const authResponse = await fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// 2. Verify OTP
const verifyResponse = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', otp: '123456' })
});

const { session } = await verifyResponse.json();

// 3. Create invoice
const invoiceResponse = await fetch('/api/sales/invoices', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    company_id: 'company-123',
    branch_id: 'branch-456',
    customer_id: 'customer-789',
    document_date: '2024-01-01',
    items: [{
      item_id: 'item-001',
      quantity: 1,
      rate: 100,
      tax_rate: 18,
      taxable_amount: 100,
      cgst_rate: 9,
      cgst_amount: 9,
      sgst_rate: 9,
      sgst_amount: 9,
      total_amount: 118
    }]
  })
});
```

**Section sources**
- [auth.js](file://src/pages/api/auth/send-otp.js#L6-L76)
- [auth.js](file://src/pages/api/auth/verify-otp.js#L4-L68)
- [invoices.js](file://src/pages/api/sales/invoices/index.js#L19-L21)

## Performance Optimization

### Caching Strategies

Implement caching to reduce API calls and improve performance:

1. **Client-Side Caching**: Cache responses for frequently accessed data
2. **Server-Side Caching**: Implement Redis or similar for shared caching
3. **ETag Caching**: Use ETag headers for conditional requests
4. **Cache Invalidation**: Implement proper cache invalidation on data changes

### Pagination

Use pagination for large datasets:

- Set appropriate page sizes (10-100 items per page)
- Use cursor-based pagination for large datasets
- Implement infinite scrolling in UI components
- Cache paginated results when appropriate

### Batch Operations

Use batch operations when possible:

- Create multiple items in a single request
- Update multiple customers at once
- Generate reports for multiple periods
- Process multiple invoices simultaneously

### Connection Management

Optimize connection usage:

- Reuse HTTP connections with keep-alive
- Implement connection pooling
- Use HTTP/2 for multiple concurrent requests
- Compress request and response bodies

### Monitoring and Optimization

Monitor API performance and optimize as needed:

- Track response times for all endpoints
- Monitor rate limit usage
- Analyze slow queries and optimize database indexes
- Implement logging for performance bottlenecks
- Use APM tools for comprehensive monitoring

**Section sources**
- [invoices.js](file://src/pages/api/sales/invoices/index.js#L100-L104)
- [customers.js](file://src/pages/api/customers/index.js#L82-L86)
- [items.js](file://src/pages/api/items/index.js#L112-L116)
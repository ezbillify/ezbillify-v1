# Deployment

<cite>
**Referenced Files in This Document**   
- [vercel.json](file://vercel.json)
- [scripts/run-migration.sh](file://scripts/run-migration.sh)
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js)
- [src/lib/db.js](file://src/lib/db.js)
- [src/middleware/cors.js](file://src/middleware/cors.js)
- [src/middleware/rateLimit.js](file://src/middleware/rateLimit.js)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql)
- [migrations/add_barcodes_array_fixed.sql](file://migrations/add_barcodes_array_fixed.sql)
- [migrations/create_gst_credentials_table.sql](file://migrations/create_gst_credentials_table.sql)
- [migrations/update_gst_credentials_table.sql](file://migrations/update_gst_credentials_table.sql)
</cite>

## Table of Contents
1. [Vercel Deployment](#vercel-deployment)
2. [Database Migration Process](#database-migration-process)
3. [Production Environment Configuration](#production-environment-configuration)
4. [Common Deployment Issues](#common-deployment-issues)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Rollback and Disaster Recovery](#rollback-and-disaster-recovery)

## Vercel Deployment

The ezbillify-v1 application is configured for deployment on Vercel, as indicated by the `vercel.json` configuration file. The deployment process leverages Vercel's Next.js integration for seamless deployment of the application.

### Step-by-Step Vercel Deployment

1. **Prerequisites**
   - Create a Vercel account at [vercel.com](https://vercel.com)
   - Install the Vercel CLI: `npm install -g vercel`
   - Ensure your project is connected to a Git repository (GitHub, GitLab, or Bitbucket)

2. **Connect Project to Vercel**
   ```bash
   # Navigate to your project directory
   cd ezbillify-v1
   
   # Initialize Vercel project
   vercel
   ```
   Follow the prompts to log in, select your project, and configure the deployment settings.

3. **Configure Environment Variables**
   In the Vercel dashboard, navigate to your project settings and add the following environment variables:
   
   **Required Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)
   - `DATABASE_URL`: PostgreSQL database connection string
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., "https://yourdomain.com,https://yourdomain.vercel.app")

4. **Deployment Configuration**
   The `vercel.json` file specifies the deployment configuration:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/next"
       }
     ]
   }
   ```
   This configuration tells Vercel to use the Next.js builder for deployment.

5. **Deploy to Production**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Alternatively, deploy from the Vercel dashboard by connecting your Git repository
   # and configuring automatic deployments on push to main branch
   ```

6. **Verify Deployment**
   After deployment, Vercel will provide a deployment URL. Verify that the application is running correctly by accessing the URL and checking for proper functionality.

**Section sources**
- [vercel.json](file://vercel.json#L1-L9)
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js#L4-L6)

## Database Migration Process

The ezbillify-v1 application includes a comprehensive database migration system to ensure schema changes are applied consistently across environments. The migration process uses PostgreSQL SQL scripts and a custom migration runner.

### Migration Scripts

The application contains several migration scripts that modify the database schema:

1. **Add UPI Fields to Bank Accounts**
   - File: `database/migrations/20241105_add_upi_fields_to_bank_accounts.sql`
   - Purpose: Adds UPI ID and UPI QR code fields to support UPI payments
   - Changes:
     - Adds `upi_id` VARCHAR(255) column to `bank_accounts` table
     - Adds `upi_qr_code` TEXT column to `bank_accounts` table
     - Creates index on `upi_id` for faster lookups
     - Updates existing records to ensure consistency

2. **Add Barcodes Array Column**
   - File: `migrations/add_barcodes_array_fixed.sql`
   - Purpose: Migrates from single barcode to multiple barcodes per item
   - Changes:
     - Adds `barcodes` text[] array column to `items` table
     - Migrates data from old `barcode` column to new `barcodes` array
     - Renames old `barcode` column to `barcode_old` as backup
     - Creates GIN index for fast array searches
     - Implements trigger for barcode uniqueness validation

3. **Create GST Credentials Table**
   - File: `migrations/create_gst_credentials_table.sql`
   - Purpose: Creates table for storing GST credentials for Whitebooks GSP integration
   - Changes:
     - Creates `gst_credentials` table with fields for GSTIN, credentials, and provider information
     - Adds foreign key constraint to `companies` table
     - Creates index for faster lookups
     - Adds descriptive comments for documentation

4. **Update GST Credentials Table**
   - File: `migrations/update_gst_credentials_table.sql`
   - Purpose: Adds missing columns to the GST credentials table
   - Changes:
     - Adds `client_id` and `client_secret` columns
     - Adds `provider` column with default value 'whitebooks'
     - Adds descriptive comments for new columns

### Running Migrations

The application provides a script to run migrations: `scripts/run-migration.sh`

```bash
#!/bin/bash

# Script to run the UPI fields migration
# Usage: ./scripts/run-migration.sh

echo "Running UPI fields migration for bank_accounts table..."

# Check if psql is installed
if ! command -v psql &> /dev/null
then
    echo "psql could not be found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if database connection details are set
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL environment variable is not set."
    echo "Please set it with your database connection string."
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/database_name'"
    exit 1
fi

# Run the migration
psql $DATABASE_URL -f database/migrations/20241105_add_upi_fields_to_bank_accounts.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed!"
    exit 1
fi
```

### Migration Execution Process

1. **Prerequisites**
   - Ensure PostgreSQL client tools are installed on the system
   - Set the `DATABASE_URL` environment variable with your database connection string
   - Verify database connectivity

2. **Run the Migration Script**
   ```bash
   # Make the script executable
   chmod +x scripts/run-migration.sh
   
   # Set the database URL
   export DATABASE_URL='postgresql://username:password@hostname:port/database_name'
   
   # Run the migration
   ./scripts/run-migration.sh
   ```

3. **Verify Migration Success**
   - Check the console output for "Migration completed successfully!" message
   - Verify the database schema changes using a database client
   - Test application functionality that depends on the migrated schema

4. **Automated Migration in Production**
   For production deployments, consider integrating the migration process into your CI/CD pipeline:
   ```bash
   # Example: Run migrations as part of deployment
   #!/bin/bash
   npm run build
   ./scripts/run-migration.sh
   vercel --prod
   ```

**Section sources**
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L1-L31)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql#L1-L28)
- [migrations/add_barcodes_array_fixed.sql](file://migrations/add_barcodes_array_fixed.sql#L1-L111)
- [migrations/create_gst_credentials_table.sql](file://migrations/create_gst_credentials_table.sql#L1-L26)
- [migrations/update_gst_credentials_table.sql](file://migrations/update_gst_credentials_table.sql#L1-L10)

## Production Environment Configuration

Proper configuration of the production environment is critical for the security, performance, and reliability of the ezbillify-v1 application.

### Environment Variables

The following environment variables must be configured for production:

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (private, for admin operations)
- `DATABASE_URL`: PostgreSQL database connection string (private)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

**Example .env.production file:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://username:password@hostname:port/database_name
ALLOWED_ORIGINS=https://yourdomain.com,https://yourdomain.vercel.app
```

### Database Connection Pooling

The application uses Supabase as the database backend, which handles connection pooling automatically. However, consider the following best practices:

1. **Connection Limits**
   - Monitor your database connection usage
   - Configure appropriate connection limits based on your plan
   - Implement connection timeouts to prevent resource exhaustion

2. **Query Optimization**
   - Use the database query helpers in `src/lib/db.js` for consistent query patterns
   - Implement proper indexing on frequently queried columns
   - Use batch operations for bulk data operations

3. **Error Handling**
   - Implement retry logic for transient database errors
   - Monitor database performance and optimize slow queries
   - Set up alerts for database connection issues

### Authentication Settings

The application uses Supabase for authentication with the following configuration:

1. **Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`: Required for client-side authentication
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Required for client-side authentication
   - `SUPABASE_SERVICE_ROLE_KEY`: Required for server-side admin operations

2. **Authentication Flow**
   - Client-side: Uses Supabase auth with RLS (Row Level Security)
   - Server-side: Uses service role key for admin operations that bypass RLS
   - Implements role-based access control with ADMIN and WORKFORCE roles

3. **Security Considerations**
   - Never expose the `SUPABASE_SERVICE_ROLE_KEY` on the client side
   - Implement proper session management
   - Use secure HTTP-only cookies for session storage
   - Implement rate limiting for authentication endpoints

### Security Headers

The application implements comprehensive security headers through middleware configuration:

1. **CORS Configuration**
   - Configured in `src/middleware/cors.js`
   - Production: Strict origin policy with specific allowed domains
   - Development: Permissive policy for local development
   - Includes proper headers for credentials, methods, and headers

2. **Rate Limiting**
   - Configured in `src/middleware/rateLimit.js`
   - Implements different rate limits for various endpoints:
     - General API: 100 requests per 15 minutes
     - Authentication: 5 attempts per 15 minutes
     - File uploads: 10 uploads per minute
     - Password reset: 3 attempts per hour
   - Includes rate limit headers in responses

3. **Additional Security Headers**
   - Content Security Policy (CSP)
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security (HSTS)

**Section sources**
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js#L4-L6)
- [src/lib/db.js](file://src/lib/db.js#L1-L307)
- [src/middleware/cors.js](file://src/middleware/cors.js#L1-L163)
- [src/middleware/rateLimit.js](file://src/middleware/rateLimit.js#L1-L365)

## Common Deployment Issues

This section addresses common issues encountered during deployment and provides troubleshooting guidance.

### Migration Failures

**Symptoms:**
- Migration script fails to execute
- Database schema changes not applied
- Application errors related to missing columns or tables

**Causes and Solutions:**

1. **Missing PostgreSQL Client Tools**
   - **Cause**: The `psql` command is not available in the environment
   - **Solution**: Install PostgreSQL client tools
     ```bash
     # Ubuntu/Debian
     sudo apt-get install postgresql-client
     
     # macOS with Homebrew
     brew install postgresql
     
     # Windows: Install PostgreSQL or use psql from WSL
     ```

2. **Database URL Not Set**
   - **Cause**: The `DATABASE_URL` environment variable is not configured
   - **Solution**: Set the database URL
     ```bash
     export DATABASE_URL='postgresql://username:password@hostname:port/database_name'
     ```

3. **Permission Issues**
   - **Cause**: The database user lacks sufficient privileges
   - **Solution**: Ensure the database user has ALTER TABLE and CREATE INDEX privileges
     ```sql
     GRANT ALL PRIVILEGES ON TABLE bank_accounts TO username;
     GRANT CREATE ON DATABASE database_name TO username;
     ```

4. **Schema Conflicts**
   - **Cause**: Migration script tries to add columns that already exist
   - **Solution**: The migration scripts use `IF NOT EXISTS` clauses to handle this gracefully
     ```sql
     ALTER TABLE public.bank_accounts 
     ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255) NULL;
     ```

### Environment Variable Misconfiguration

**Symptoms:**
- Application fails to start
- Authentication errors
- Database connection failures
- CORS errors

**Causes and Solutions:**

1. **Missing Required Variables**
   - **Cause**: Required environment variables are not set
   - **Solution**: Verify all required variables are configured
     ```bash
     # Check if variables are set
     echo $NEXT_PUBLIC_SUPABASE_URL
     echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
     echo $DATABASE_URL
     ```

2. **Incorrect Variable Names**
   - **Cause**: Environment variable names don't match expected values
   - **Solution**: Ensure variable names match exactly (case-sensitive)
     - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)

3. **Incorrect Database URL Format**
   - **Cause**: Database URL is malformed
   - **Solution**: Use the correct format
     ```bash
     # Correct format
     export DATABASE_URL='postgresql://username:password@hostname:port/database_name'
     
     # Example
     export DATABASE_URL='postgresql://admin:secret@localhost:5432/ezbillify'
     ```

4. **CORS Configuration Issues**
   - **Cause**: Allowed origins don't include the deployment domain
   - **Solution**: Update ALLOWED_ORIGINS to include your domain
     ```bash
     export ALLOWED_ORIGINS='https://yourdomain.com,https://yourdomain.vercel.app'
     ```

### Scaling Considerations

**Challenges and Solutions:**

1. **Database Connection Limits**
   - **Challenge**: High traffic can exhaust database connections
   - **Solutions**:
     - Implement connection pooling
     - Optimize queries to reduce connection time
     - Use read replicas for read-heavy operations
     - Implement caching for frequently accessed data

2. **API Rate Limiting**
   - **Challenge**: Uncontrolled API usage can impact performance
   - **Solutions**:
     - Implement rate limiting as configured in `src/middleware/rateLimit.js`
     - Monitor API usage patterns
     - Implement caching for expensive operations
     - Use CDN for static assets

3. **File Storage and Bandwidth**
   - **Challenge**: Large file uploads and downloads can consume bandwidth
   - **Solutions**:
     - Use Supabase Storage for file storage
     - Implement file size limits (configured in `src/lib/constants.js`)
     - Use CDN to serve static files
     - Implement lazy loading for large files

4. **Memory Usage**
   - **Challenge**: High memory usage can impact application performance
   - **Solutions**:
     - Monitor memory usage
     - Optimize data structures
     - Implement pagination for large datasets
     - Use streaming for large file operations

**Section sources**
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L8-L21)
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js#L4-L6)
- [src/middleware/cors.js](file://src/middleware/cors.js#L6-L8)
- [src/lib/constants.js](file://src/lib/constants.js#L378-L385)

## Monitoring and Logging

Effective monitoring and logging are essential for maintaining the health and performance of the production system.

### Application Monitoring

1. **Performance Monitoring**
   - Implement client-side performance monitoring using Vercel Analytics
   - Monitor API response times and error rates
   - Track database query performance
   - Monitor memory and CPU usage

2. **Error Tracking**
   - Implement comprehensive error handling throughout the application
   - Use centralized error logging service (e.g., Sentry, LogRocket)
   - Set up alerts for critical errors
   - Monitor error rates and trends

3. **Availability Monitoring**
   - Implement uptime monitoring with external services
   - Set up health check endpoints
   - Monitor deployment success rates
   - Track user session success rates

### Logging Strategy

1. **Client-Side Logging**
   - Implement structured logging in the application
   - Use appropriate log levels (debug, info, warning, error)
   - Include context in log messages (user ID, company ID, request ID)
   - Avoid logging sensitive information

2. **Server-Side Logging**
   - The middleware components include comprehensive logging:
     - Authentication middleware logs authentication attempts
     - Rate limiting middleware logs rate limit violations
     - CORS middleware logs origin validation
   - Implement structured JSON logging for easier parsing
   - Use correlation IDs to trace requests across components

3. **Log Management**
   - Centralize logs using a log management service
   - Implement log rotation to prevent disk space issues
   - Set up log retention policies
   - Implement log filtering and search capabilities

### Key Metrics to Monitor

1. **Application Performance**
   - API response times (p95, p99)
   - Page load times
   - Database query performance
   - Memory usage

2. **User Experience**
   - Error rates (4xx, 5xx responses)
   - Authentication success/failure rates
   - User session duration
   - Feature usage patterns

3. **System Health**
   - Server CPU and memory usage
   - Database connection pool usage
   - Disk space utilization
   - Network latency

4. **Business Metrics**
   - User signups and activations
   - Document creation rates
   - Payment processing success rates
   - GST filing success rates

**Section sources**
- [src/middleware/auth.js](file://src/middleware/auth.js#L1-L252)
- [src/middleware/rateLimit.js](file://src/middleware/rateLimit.js#L1-L365)
- [src/middleware/cors.js](file://src/middleware/cors.js#L1-L163)

## Rollback and Disaster Recovery

A robust rollback and disaster recovery strategy is essential for maintaining business continuity.

### Rollback Procedures

1. **Code Rollback**
   - **Vercel Rollback**: Use Vercel's deployment history to rollback to a previous version
     ```bash
     # List deployments
     vercel ls
     
     # Rollback to a specific deployment
     vercel alias set <deployment-id> production
     ```
   - **Git Rollback**: Revert to a previous commit and redeploy
     ```bash
     # Revert to previous commit
     git revert <commit-hash>
     
     # Deploy the reverted code
     vercel --prod
     ```

2. **Database Rollback**
   - **Migration Rollback**: Create rollback scripts for each migration
     ```sql
     -- Example rollback script for UPI fields migration
     ALTER TABLE public.bank_accounts 
     DROP COLUMN IF EXISTS upi_id;
     
     ALTER TABLE public.bank_accounts 
     DROP COLUMN IF EXISTS upi_qr_code;
     
     DROP INDEX IF EXISTS idx_bank_accounts_upi_id;
     ```
   - **Database Backup**: Restore from a recent backup
     ```bash
     # Restore database from backup
     pg_restore -U username -h hostname -d database_name backup.dump
     ```

3. **Configuration Rollback**
   - Maintain version-controlled configuration files
   - Use environment-specific configuration
   - Implement configuration validation before deployment

### Disaster Recovery Planning

1. **Backup Strategy**
   - **Database Backups**: Implement regular automated backups
     - Daily full backups
     - Hourly incremental backups
     - Off-site backup storage
   - **Configuration Backups**: Version control all configuration files
   - **Key Material Backups**: Securely store encryption keys and service account credentials

2. **Recovery Point Objective (RPO)**
   - Target: ≤ 1 hour data loss
   - Achieved through frequent incremental backups
   - Regular backup verification

3. **Recovery Time Objective (RTO)**
   - Target: ≤ 4 hours for full recovery
   - Achieved through documented recovery procedures
   - Regular disaster recovery testing

4. **Disaster Scenarios and Response**
   - **Database Failure**: Restore from backup and replay transaction logs
   - **Data Center Outage**: Failover to secondary region
   - **Security Breach**: Isolate affected systems, rotate credentials, restore from clean backup
   - **Deployment Failure**: Rollback to previous stable version

5. **Regular Testing**
   - Conduct quarterly disaster recovery drills
   - Test backup restoration procedures
   - Validate recovery time and data integrity
   - Update documentation based on test results

**Section sources**
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L1-L31)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql#L1-L28)
- [migrations/add_barcodes_array_fixed.sql](file://migrations/add_barcodes_array_fixed.sql#L1-L111)
- [migrations/create_gst_credentials_table.sql](file://migrations/create_gst_credentials_table.sql#L1-L26)
- [migrations/update_gst_credentials_table.sql](file://migrations/update_gst_credentials_table.sql#L1-L10)
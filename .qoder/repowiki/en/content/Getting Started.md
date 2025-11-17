# Getting Started

<cite>
**Referenced Files in This Document**   
- [README.md](file://README.md)
- [package.json](file://package.json)
- [scripts/run-migration.sh](file://scripts/run-migration.sh)
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js)
- [src/lib/db.js](file://src/lib/db.js)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql)
- [migrations/create_gst_credentials_table.sql](file://migrations/create_gst_credentials_table.sql)
- [migrations/update_gst_credentials_table.sql](file://migrations/update_gst_credentials_table.sql)
- [migrations/add_barcodes_array_fixed.sql](file://migrations/add_barcodes_array_fixed.sql)
- [tailwind.config.js](file://tailwind.config.js)
- [jsconfig.json](file://jsconfig.json)
</cite>

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Cloning the Repository](#cloning-the-repository)
3. [Installing Dependencies](#installing-dependencies)
4. [Configuring Environment Variables](#configuring-environment-variables)
5. [Database Setup and Migrations](#database-setup-and-migrations)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [API Route Testing](#api-route-testing)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Verification Steps](#verification-steps)

## Prerequisites

Before setting up the ezbillify-v1 development environment, ensure you have the following prerequisites installed on your system:

- **Node.js** (version 18 or higher)
- **npm** (version 9 or higher) or **yarn** (version 1.22 or higher)
- **PostgreSQL** (for database operations)
- **psql** (PostgreSQL command-line client)
- **Git** (for version control)

The application is built on Next.js and uses Supabase for authentication and database operations. Ensure your system meets these requirements before proceeding.

**Section sources**
- [package.json](file://package.json#L30)
- [README.md](file://README.md#L1)

## Cloning the Repository

To clone the ezbillify-v1 repository, follow these steps:

1. Open your terminal or command prompt
2. Navigate to your desired workspace directory
3. Execute the following command:

```bash
git clone https://github.com/your-organization/ezbillify-v1.git
cd ezbillify-v1
```

This will create a local copy of the repository with the complete project structure including source files, configuration files, and migration scripts.

**Section sources**
- [README.md](file://README.md#L3)

## Installing Dependencies

After cloning the repository, install the required dependencies using your preferred package manager:

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

The project dependencies include:
- Next.js framework
- React and React DOM
- Supabase for authentication and database operations
- Tailwind CSS for styling
- Various utility libraries for PDF generation, CSV parsing, and barcode handling

The installation process will also set up the development environment with ESLint for code linting and formatting.

**Section sources**
- [package.json](file://package.json#L12-L35)

## Configuring Environment Variables

The ezbillify-v1 application requires several environment variables to be configured for proper operation. Create a `.env.local` file in the project root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ezbillify_db

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Important Notes:**
- The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for client-side operations
- The `SUPABASE_SERVICE_ROLE_KEY` is required for server-side operations that bypass Row Level Security (RLS)
- Replace the placeholder values with your actual Supabase project credentials
- The `DATABASE_URL` is used for direct database operations and migrations

**Section sources**
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js#L4-L6)
- [middleware/cors.js](file://src/middleware/cors.js#L4-L10)

## Database Setup and Migrations

The ezbillify-v1 application uses PostgreSQL as its database backend with Supabase for enhanced features. Follow these steps to set up the database:

### Database Initialization

1. Ensure PostgreSQL is running on your system
2. Create a new database for the application:
   ```bash
   createdb ezbillify_db
   ```

### Running Migrations

The application includes several migration files to set up the database schema:

- `database/migrations/20241105_add_upi_fields_to_bank_accounts.sql` - Adds UPI payment support
- `migrations/create_gst_credentials_table.sql` - Creates GST credentials table
- `migrations/update_gst_credentials_table.sql` - Updates GST credentials table structure
- `migrations/add_barcodes_array_fixed.sql` - Adds barcode support to items

To run the migrations, use the provided script:

```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL='postgresql://user:password@localhost:5432/ezbillify_db'

# Run the UPI fields migration
./scripts/run-migration.sh
```

Alternatively, you can run migrations directly using psql:

```bash
psql $DATABASE_URL -f database/migrations/20241105_add_upi_fields_to_bank_accounts.sql
psql $DATABASE_URL -f migrations/create_gst_credentials_table.sql
psql $DATABASE_URL -f migrations/update_gst_credentials_table.sql
psql $DATABASE_URL -f migrations/add_barcodes_array_fixed.sql
```

The migration script includes error handling and validation to ensure database integrity.

```mermaid
flowchart TD
Start([Start Migration]) --> CheckPsql["Check if psql is installed"]
CheckPsql --> |Not Found| Error1["Error: Install PostgreSQL client tools"]
CheckPsql --> |Found| CheckEnv["Check DATABASE_URL environment variable"]
CheckEnv --> |Not Set| Error2["Error: Set DATABASE_URL with connection string"]
CheckEnv --> |Set| RunMigration["Run SQL migration file"]
RunMigration --> CheckResult["Check migration result"]
CheckResult --> |Success| Success["Migration completed successfully!"]
CheckResult --> |Failure| Failure["Migration failed!"]
Success --> End([End])
Failure --> End
```

**Diagram sources**
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L1-L31)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql#L1-L28)

**Section sources**
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L1-L31)
- [database/migrations/20241105_add_upi_fields_to_bank_accounts.sql](file://database/migrations/20241105_add_upi_fields_to_bank_accounts.sql#L1-L28)
- [migrations/create_gst_credentials_table.sql](file://migrations/create_gst_credentials_table.sql)
- [migrations/update_gst_credentials_table.sql](file://migrations/update_gst_credentials_table.sql)
- [migrations/add_barcodes_array_fixed.sql](file://migrations/add_barcodes_array_fixed.sql)

## Running the Application

Once the dependencies are installed and the environment is configured, you can start the development server:

```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using pnpm
pnpm dev
```

The application will start on `http://localhost:3000`. The development server includes hot reloading, which means that any changes you make to the code will automatically refresh the browser.

**Platform-Specific Considerations:**

**macOS and Linux:**
- Ensure you have the necessary permissions to run shell scripts
- The `run-migration.sh` script is executable by default
- Use standard Unix commands for environment variable management

**Windows:**
- Use Git Bash or WSL (Windows Subsystem for Linux) for better compatibility
- If using Command Prompt, replace the export command with:
  ```cmd
  set DATABASE_URL=postgresql://user:password@localhost:5432/ezbillify_db
  ```
- For PowerShell:
  ```powershell
  $env:DATABASE_URL = "postgresql://user:password@localhost:5432/ezbillify_db"
  ```

**Section sources**
- [README.md](file://README.md#L5-L15)
- [package.json](file://package.json#L7)

## Development Workflow

The ezbillify-v1 development environment supports several features to enhance productivity:

### Hot Reloading

The Next.js development server provides hot reloading for both UI components and API routes. When you modify any file in the `src` directory:

- React components will update without a full page refresh
- API routes in `pages/api` will reload automatically
- CSS changes through Tailwind will apply instantly

### Code Structure and Imports

The project uses module path aliases configured in `jsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

This allows for cleaner imports:
```javascript
import { supabase } from '@/services/utils/supabase'
import db from '@/lib/db'
```

### Styling with Tailwind CSS

The application uses Tailwind CSS for styling, configured in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Section sources**
- [jsconfig.json](file://jsconfig.json#L1-L8)
- [tailwind.config.js](file://tailwind.config.js#L1-L9)
- [README.md](file://README.md#L19)

## API Route Testing

The application provides several API routes for testing and development purposes. You can test these routes using various methods:

### Built-in API Routes

The following API routes are available for testing:

- `http://localhost:3000/api/debug/user-info` - Debug user information
- `http://localhost:3000/api/debug/database-check` - Database connection test
- `http://localhost:3000/api/test-auth` - Authentication test
- `http://localhost:3000/api/test-customer-fetch` - Customer data retrieval test

### Testing with cURL

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/test-auth \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Test database connection
curl http://localhost:3000/api/debug/database-check
```

### Testing with Postman or API Clients

Import the API collection and use the following endpoints:
- Base URL: `http://localhost:3000/api`
- Authentication endpoints in `pages/api/auth/`
- Data operations in `pages/api/[module]/`

**Section sources**
- [README.md](file://README.md#L21-L23)
- [src/pages/api/debug/user-info.js](file://src/pages/api/debug/user-info.js)
- [src/pages/api/test-auth.js](file://src/pages/api/test-auth.js)

## Troubleshooting Common Issues

This section addresses common setup issues and their solutions.

### Dependency Conflicts

**Issue:** npm/yarn installation fails due to dependency conflicts

**Solution:**
1. Clear the package manager cache:
   ```bash
   # npm
   npm cache clean --force
   
   # yarn
   yarn cache clean
   ```
2. Remove node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Environment Variable Misconfiguration

**Issue:** Application fails to start with Supabase configuration errors

**Symptoms:**
- "Missing Supabase environment variables!" in console
- Authentication failures
- Database connection errors

**Solution:**
1. Verify `.env.local` file exists in the project root
2. Check that all required variables are present:
   ```env
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   DATABASE_URL
   ```
3. Restart the development server after making changes

### Database Connection Problems

**Issue:** Migration script fails with connection errors

**Common Causes:**
- PostgreSQL service not running
- Incorrect DATABASE_URL format
- Missing psql client

**Solutions:**
1. Start PostgreSQL service:
   ```bash
   # macOS with Homebrew
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo service postgresql start
   ```
2. Verify psql installation:
   ```bash
   psql --version
   ```
3. Test database connection:
   ```bash
   psql postgresql://user:password@localhost:5432/ezbillify_db -c "SELECT 1"
   ```

### Supabase Integration Issues

**Issue:** Supabase client initialization fails

**Diagnosis:**
Check the Supabase configuration in `src/services/utils/supabase.js`:
- Ensure URL and keys are correct
- Verify network connectivity to Supabase
- Check browser console for CORS errors

**Fallback:**
The application includes a mock client for development when environment variables are missing, allowing you to continue development without a live Supabase connection.

**Section sources**
- [src/services/utils/supabase.js](file://src/services/utils/supabase.js#L14-L80)
- [scripts/run-migration.sh](file://scripts/run-migration.sh#L9-L13)
- [src/lib/db.js](file://src/lib/db.js#L2)

## Verification Steps

After completing the setup, verify the installation with the following steps:

### 1. Application Startup Verification

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser
3. Confirm the application loads without errors
4. Check the terminal for successful startup messages

### 2. API Endpoint Verification

Test the API endpoints using curl or a browser:

```bash
# Test the hello API route
curl http://localhost:3000/api/hello

# Expected response:
# {"message":"Hello World"}
```

### 3. Database Connection Test

Access the database test endpoint:
- Navigate to `http://localhost:3000/api/debug/database-check`
- Or use curl:
  ```bash
  curl http://localhost:3000/api/debug/database-check
  ```

### 4. UI Interaction Test

1. Navigate through the application UI
2. Test form submissions in development mode
3. Verify that hot reloading works by making a small change to `pages/index.js`
4. Confirm that the page updates automatically

### 5. Migration Verification

Verify that the database migrations were applied successfully:

```bash
# Connect to your database
psql $DATABASE_URL

# Check if the upi_id column exists in bank_accounts table
\d bank_accounts

# Look for upi_id and upi_qr_code columns in the output
```

Successful verification of these steps confirms a complete and working development environment for ezbillify-v1.

**Section sources**
- [README.md](file://README.md#L17-L18)
- [src/pages/api/debug/database-check.js](file://src/pages/api/debug/database-check.js)
- [pages/index.js](file://src/pages/index.js)
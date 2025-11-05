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
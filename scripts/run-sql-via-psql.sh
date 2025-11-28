#!/bin/bash

# ============================================================================
# Run SQL Scripts via psql (if database connection available)
# ============================================================================
# This script requires DATABASE_URL environment variable
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
# ============================================================================

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo ""
  echo "To use this script, set DATABASE_URL:"
  echo "  export DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'"
  echo ""
  echo "You can find the connection string in Supabase Dashboard:"
  echo "  Settings → Database → Connection string → Direct connection"
  echo ""
  echo "Alternatively, run SQL files directly in Supabase SQL Editor:"
  echo "  https://app.supabase.com/project/alqpwhrsxmetwbtxuihv → SQL Editor"
  exit 1
fi

echo "============================================================================"
echo "RUNNING DATABASE VERIFICATION SCRIPTS"
echo "============================================================================"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Please install PostgreSQL client tools."
  echo ""
  echo "On macOS: brew install postgresql"
  echo "On Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Running audit-database.sql..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/audit-database.sql" || echo "⚠️  Error running audit-database.sql"

echo ""
echo "Running verify-rls-policies.sql..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/verify-rls-policies.sql" || echo "⚠️  Error running verify-rls-policies.sql"

echo ""
echo "Running verify-cron-jobs.sql..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/verify-cron-jobs.sql" || echo "⚠️  Error running verify-cron-jobs.sql"

echo ""
echo "============================================================================"
echo "VERIFICATION COMPLETE"
echo "============================================================================"


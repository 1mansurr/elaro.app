#!/bin/bash

# Schema Validation Script
# Validates that schema.sql matches migration expectations
# Specifically checks that CASCADE deletes are removed from migration-specified foreign keys

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_FILE="$PROJECT_ROOT/supabase/schema.sql"

echo "🔍 Validating schema.sql foreign key constraints..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if schema.sql exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ ERROR: schema.sql not found at $SCHEMA_FILE${NC}"
    exit 1
fi

echo "✅ Schema file found: $SCHEMA_FILE"
echo ""

# Foreign keys that should NOT have CASCADE (per migration 20251022000011)
FKS_WITHOUT_CASCADE=(
    "assignments_course_id_fkey"
    "assignments_user_id_fkey"
    "lectures_course_id_fkey"
    "lectures_user_id_fkey"
    "study_sessions_user_id_fkey"
    "reminders_assignment_id_fkey"
    "reminders_lecture_id_fkey"
    "reminders_session_id_fkey"
    "reminders_user_id_fkey"
)

# Check each FK that should not have CASCADE
echo "Checking foreign keys that should NOT have CASCADE..."
for FK in "${FKS_WITHOUT_CASCADE[@]}"; do
    if grep -q "$FK.*ON DELETE CASCADE" "$SCHEMA_FILE"; then
        echo -e "${RED}❌ ERROR: $FK still has ON DELETE CASCADE (should be removed)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ $FK - CASCADE correctly removed${NC}"
    fi
done

echo ""

# Count total CASCADE constraints
TOTAL_CASCADE=$(grep -c "ON DELETE CASCADE" "$SCHEMA_FILE" || echo "0")

# Expected CASCADE constraints (not in migration scope)
EXPECTED_CASCADE=(
    "courses_user_id_fkey"
    "notification_preferences_user_id_fkey"
    "profiles_id_fkey"
    "streaks_user_id_fkey"
    "study_sessions_course_id_fkey"
    "tasks_events_user_id_fkey"
    "user_devices_user_id_fkey"
)

EXPECTED_COUNT=${#EXPECTED_CASCADE[@]}

if [ "$TOTAL_CASCADE" -eq "$EXPECTED_COUNT" ]; then
    echo -e "${GREEN}✅ Total CASCADE count matches expected ($TOTAL_CASCADE)${NC}"
elif [ "$TOTAL_CASCADE" -lt "$EXPECTED_COUNT" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Found $TOTAL_CASCADE CASCADE constraints, expected $EXPECTED_COUNT${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}❌ ERROR: Found $TOTAL_CASCADE CASCADE constraints, expected $EXPECTED_COUNT${NC}"
    echo "   This may indicate migration-specified FKs still have CASCADE"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Expected CASCADE constraints (intentional):"
for FK in "${EXPECTED_CASCADE[@]}"; do
    if grep -q "$FK.*ON DELETE CASCADE" "$SCHEMA_FILE"; then
        echo -e "${GREEN}✅ $FK - CASCADE present (as expected)${NC}"
    else
        echo -e "${YELLOW}⚠️  $FK - CASCADE missing (may need investigation)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Schema validation PASSED${NC}"
    echo "   All foreign key constraints match migration expectations"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Schema validation PASSED with warnings${NC}"
    echo "   Errors: $ERRORS, Warnings: $WARNINGS"
    exit 0
else
    echo -e "${RED}❌ Schema validation FAILED${NC}"
    echo "   Errors: $ERRORS, Warnings: $WARNINGS"
    exit 1
fi


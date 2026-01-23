#!/bin/bash

# Test Script: TypeScript Fixes Verification
# This script verifies that all TypeScript fixes have been applied correctly

set -e

echo "🔍 Testing TypeScript Fixes..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Deno is available
echo "1️⃣ Checking Deno availability..."
if command -v deno &> /dev/null; then
    echo -e "${GREEN}✅ Deno is installed${NC}"
    deno --version
else
    echo -e "${YELLOW}⚠️  Deno is not installed. Skipping Deno-specific checks.${NC}"
    echo "   Install Deno: curl -fsSL https://deno.land/install.sh | sh"
fi

echo ""

# Test 2: Check critical files for TypeScript errors using grep
echo "2️⃣ Verifying @ts-expect-error directives in critical files..."
CRITICAL_FILES=(
    "supabase/functions/tasks/index.ts"
    "supabase/functions/send-welcome-email/index.ts"
    "supabase/functions/send-daily-summary-notifications/index.ts"
    "supabase/functions/send-alert-email/index.ts"
    "supabase/functions/schedule-reminders/index.ts"
)

ALL_GOOD=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if file has Deno URL imports
        if grep -q "from 'https://" "$file"; then
            # Check if @ts-expect-error is present before imports
            if grep -q "@ts-expect-error.*Deno URL" "$file"; then
                echo -e "${GREEN}✅ $file has @ts-expect-error directives${NC}"
            else
                echo -e "${RED}❌ $file missing @ts-expect-error directives${NC}"
                ALL_GOOD=false
            fi
        else
            echo -e "${GREEN}✅ $file (no Deno URL imports)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $file not found${NC}"
    fi
done

echo ""

# Test 3: Check for Deno.env.get() calls with directives
echo "3️⃣ Checking Deno.env.get() calls have directives..."
ENV_FILES=$(grep -r "Deno\.env\.get" supabase/functions --include="*.ts" -l | head -10)
ENV_ISSUES=0

for file in $ENV_FILES; do
    # Check if file has @ts-expect-error before Deno.env.get
    if grep -q "Deno\.env\.get" "$file" && ! grep -B1 "Deno\.env\.get" "$file" | grep -q "@ts-expect-error"; then
        echo -e "${YELLOW}⚠️  $file may need @ts-expect-error for Deno.env.get${NC}"
        ENV_ISSUES=$((ENV_ISSUES + 1))
    fi
done

if [ $ENV_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All Deno.env.get() calls appear to have directives${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ENV_ISSUES files that may need directives${NC}"
fi

echo ""

# Test 4: Check for untyped req parameters
echo "4️⃣ Checking for untyped req parameters..."
UNTYPED_REQ=$(grep -r "serve(async req =>\|serve(req =>" supabase/functions --include="*.ts" | grep -v "req: Request" | head -5)

if [ -z "$UNTYPED_REQ" ]; then
    echo -e "${GREEN}✅ All serve() functions have typed req parameters${NC}"
else
    echo -e "${RED}❌ Found untyped req parameters:${NC}"
    echo "$UNTYPED_REQ"
    ALL_GOOD=false
fi

echo ""

# Test 5: Check for database query type issues
echo "5️⃣ Checking for database query type guards..."
# Check courses/index.ts for userProfile type guard
if grep -q "userProfileTyped.*subscription_tier" supabase/functions/courses/index.ts; then
    echo -e "${GREEN}✅ courses/index.ts has proper type guards${NC}"
else
    echo -e "${YELLOW}⚠️  courses/index.ts may need type guards${NC}"
fi

# Check schedule-reminders/index.ts for type guards
if grep -q "userProfileTyped.*subscription_tier\|schedule.*intervals" supabase/functions/schedule-reminders/index.ts; then
    echo -e "${GREEN}✅ schedule-reminders/index.ts has proper type guards${NC}"
else
    echo -e "${YELLOW}⚠️  schedule-reminders/index.ts may need type guards${NC}"
fi

echo ""

# Test 6: Count files with @ts-expect-error directives
echo "6️⃣ Statistics..."
TOTAL_FUNCTIONS=$(find supabase/functions -name "index.ts" -type f | wc -l | tr -d ' ')
FILES_WITH_DIRECTIVES=$(grep -r "@ts-expect-error.*Deno URL" supabase/functions --include="*.ts" -l | wc -l | tr -d ' ')
FILES_WITH_ENV_DIRECTIVES=$(grep -r "@ts-expect-error.*Deno.env" supabase/functions --include="*.ts" -l | wc -l | tr -d ' ')

echo "   Total function files: $TOTAL_FUNCTIONS"
echo "   Files with import directives: $FILES_WITH_DIRECTIVES"
echo "   Files with env directives: $FILES_WITH_ENV_DIRECTIVES"

echo ""

# Test 7: Check for unused @ts-expect-error (basic check)
echo "7️⃣ Checking for potentially unused @ts-expect-error directives..."
# This is a basic check - VS Code will show unused directives
UNUSED_COUNT=$(grep -r "@ts-expect-error" supabase/functions --include="*.ts" | wc -l | tr -d ' ')
echo "   Total @ts-expect-error directives: $UNUSED_COUNT"
echo "   (VS Code will show unused directives in Problems panel)"

echo ""

# Final summary
if [ "$ALL_GOOD" = true ] && [ $ENV_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All basic checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open VS Code and check Problems panel for any TypeScript errors"
    echo "  2. Run: deno check supabase/functions/**/*.ts (if Deno is installed)"
    echo "  3. Test functions locally with Supabase CLI"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some issues found. Please review above.${NC}"
    exit 1
fi

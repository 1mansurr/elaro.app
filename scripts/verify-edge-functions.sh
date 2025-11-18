#!/bin/bash

# Edge Functions Verification Script
# Verifies that all local Edge Functions are deployed to Supabase

set -e

echo "🔍 Verifying Edge Functions deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "   npm install -g supabase"
    exit 1
fi

# Get local functions (exclude _shared directory)
LOCAL_FUNCTIONS=$(find supabase/functions -name "index.ts" -not -path "*/_shared/*" | \
    sed 's|supabase/functions/||; s|/index.ts||' | \
    sort)

if [ -z "$LOCAL_FUNCTIONS" ]; then
    echo -e "${RED}❌ No local Edge Functions found${NC}"
    exit 1
fi

echo "📋 Local Edge Functions:"
echo "$LOCAL_FUNCTIONS" | nl
echo ""

# Get deployed functions
echo "🚀 Fetching deployed functions..."
DEPLOYED_FUNCTIONS=$(supabase functions list 2>/dev/null | \
    grep -v "Name" | \
    awk '{print $1}' | \
    sort || echo "")

if [ -z "$DEPLOYED_FUNCTIONS" ]; then
    echo -e "${YELLOW}⚠️  Could not fetch deployed functions.${NC}"
    echo "   Make sure you're logged in: supabase login"
    echo "   And linked to your project: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "📝 Local functions that need deployment:"
    echo "$LOCAL_FUNCTIONS" | nl
    exit 1
fi

echo "📋 Deployed Edge Functions:"
echo "$DEPLOYED_FUNCTIONS" | nl
echo ""

# Check for missing deployments
MISSING=()
while IFS= read -r func; do
    if [ -n "$func" ]; then
        if ! echo "$DEPLOYED_FUNCTIONS" | grep -q "^$func$"; then
            MISSING+=("$func")
        fi
    fi
done <<< "$LOCAL_FUNCTIONS"

# Check for extra deployments (not in local)
EXTRA=()
while IFS= read -r func; do
    if [ -n "$func" ]; then
        if ! echo "$LOCAL_FUNCTIONS" | grep -q "^$func$"; then
            EXTRA+=("$func")
        fi
    fi
done <<< "$DEPLOYED_FUNCTIONS"

# Report results
if [ ${#MISSING[@]} -eq 0 ] && [ ${#EXTRA[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All Edge Functions are deployed and in sync!${NC}"
    exit 0
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing deployments (${#MISSING[@]} functions):${NC}"
    for func in "${MISSING[@]}"; do
        echo "   - $func"
    done
    echo ""
    echo "To deploy missing functions, run:"
    for func in "${MISSING[@]}"; do
        echo "   supabase functions deploy $func"
    done
    echo ""
fi

if [ ${#EXTRA[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Extra deployments found (${#EXTRA[@]} functions not in local):${NC}"
    for func in "${EXTRA[@]}"; do
        echo "   - $func"
    done
    echo ""
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    exit 1
fi

exit 0


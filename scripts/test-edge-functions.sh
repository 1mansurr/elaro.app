#!/bin/bash

# Edge Functions Health Check Script
# Tests critical Edge Functions to ensure they're working correctly

set -e

echo "🧪 Testing Edge Functions..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase URL and key from environment or .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"
ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Missing Supabase configuration${NC}"
    echo "   Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||; s|\.supabase\.co||')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Invalid Supabase URL${NC}"
    exit 1
fi

FUNCTIONS_BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"

# Critical functions to test
CRITICAL_FUNCTIONS=(
    "health-check"
)

# Functions that require authentication (will test with anon key)
AUTH_FUNCTIONS=(
    "api-v2"
)

# Test a function
test_function() {
    local func_name=$1
    local requires_auth=${2:-false}
    local url="${FUNCTIONS_BASE_URL}/${func_name}"
    
    echo -n "Testing $func_name... "
    
    if [ "$requires_auth" = true ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Authorization: Bearer $ANON_KEY" \
            -H "Content-Type: application/json" || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Content-Type: application/json" || echo -e "\n000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "401" ] && [ "$requires_auth" = false ]; then
        # 401 is expected for auth-required endpoints without auth
        echo -e "${YELLOW}⚠️  Requires authentication${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}❌ Failed${NC} (HTTP $http_code)"
        if [ -n "$body" ]; then
            echo "   Response: $body" | head -c 100
        fi
        return 1
    fi
}

# Test critical functions
echo "📋 Testing critical functions..."
echo ""

failed_count=0
total_count=0

for func in "${CRITICAL_FUNCTIONS[@]}"; do
    total_count=$((total_count + 1))
    if ! test_function "$func" false; then
        failed_count=$((failed_count + 1))
    fi
done

# Test auth-required functions
echo ""
echo "📋 Testing authenticated functions..."
echo ""

for func in "${AUTH_FUNCTIONS[@]}"; do
    total_count=$((total_count + 1))
    if ! test_function "$func" true; then
        failed_count=$((failed_count + 1))
    fi
done

# Summary
echo ""
echo "=" | head -c 50
echo ""
echo "📊 Summary:"
echo "   Total tested: $total_count"
echo "   Passed: $((total_count - failed_count))"
echo "   Failed: $failed_count"
echo ""

if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}✅ All Edge Functions are working!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some Edge Functions failed health checks${NC}"
    exit 1
fi


#!/bin/bash

# ============================================================================
# EDGE FUNCTIONS AUDIT SCRIPT
# Post-Migration Verification
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables (using safer method)
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

# Supabase project configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-alqpwhrsxmetwbtxuihv}"
SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"
ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY}"

echo "============================================================================"
echo "EDGE FUNCTIONS AUDIT"
echo "============================================================================"
echo "Project Reference: ${PROJECT_REF}"
echo "Supabase URL: ${SUPABASE_URL}"
echo "============================================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
  echo "Install: npm install -g supabase"
  exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not logged in to Supabase. Attempting login...${NC}"
  supabase login
fi

# ============================================================================
# PHASE 1: LIST DEPLOYED FUNCTIONS
# ============================================================================

echo "=== PHASE 1: LISTING DEPLOYED FUNCTIONS ==="
echo ""

# List all functions
echo "Fetching deployed functions..."
FUNCTIONS=$(supabase functions list --project-ref "${PROJECT_REF}" 2>/dev/null || echo "")

if [ -z "$FUNCTIONS" ]; then
  echo -e "${YELLOW}⚠️  Could not fetch functions list. Checking local functions...${NC}"
  
  # List local functions from supabase/functions directory
  echo ""
  echo "Local functions found:"
  ls -d supabase/functions/*/ 2>/dev/null | sed 's|supabase/functions/||' | sed 's|/||' | grep -v '^_' | sort
else
  echo "$FUNCTIONS"
fi

echo ""

# ============================================================================
# PHASE 2: CRITICAL FUNCTIONS CHECK
# ============================================================================

echo "=== PHASE 2: CRITICAL FUNCTIONS VERIFICATION ==="
echo ""

CRITICAL_FUNCTIONS=(
  "health-check"
  "check-username-availability"
  "get-home-screen-data"
  "create-course"
  "create-assignment"
  "admin-system"
  "revenuecat-webhook"
  "send-welcome-email"
)

LOCAL_FUNCTIONS_DIR="supabase/functions"
MISSING_FUNCTIONS=()

for func in "${CRITICAL_FUNCTIONS[@]}"; do
  if [ -d "${LOCAL_FUNCTIONS_DIR}/${func}" ]; then
    echo -e "${GREEN}✅${NC} ${func} (local)"
  else
    echo -e "${RED}❌${NC} ${func} (missing)"
    MISSING_FUNCTIONS+=("$func")
  fi
done

echo ""

if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Missing ${#MISSING_FUNCTIONS[@]} critical functions${NC}"
else
  echo -e "${GREEN}✅ All critical functions found locally${NC}"
fi

echo ""

# ============================================================================
# PHASE 3: HEALTH CHECK TEST
# ============================================================================

echo "=== PHASE 3: HEALTH CHECK TEST ==="
echo ""

if [ -z "$ANON_KEY" ]; then
  echo -e "${YELLOW}⚠️  ANON_KEY not set. Skipping health check test.${NC}"
else
  HEALTH_CHECK_URL="${SUPABASE_URL}/functions/v1/health-check"
  
  echo "Testing health-check endpoint..."
  echo "URL: ${HEALTH_CHECK_URL}"
  echo ""
  
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    "${HEALTH_CHECK_URL}" 2>&1 || echo "HTTP_STATUS:000")
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP ${HTTP_STATUS})${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  elif [ "$HTTP_STATUS" = "000" ]; then
    echo -e "${RED}❌ Connection failed - Function may not be deployed${NC}"
  else
    echo -e "${YELLOW}⚠️  Health check returned HTTP ${HTTP_STATUS}${NC}"
    echo "Response:"
    echo "$BODY"
  fi
fi

echo ""

# ============================================================================
# PHASE 4: FUNCTION DEPLOYMENT STATUS
# ============================================================================

echo "=== PHASE 4: FUNCTION DEPLOYMENT STATUS ==="
echo ""

# Count local functions
LOCAL_COUNT=$(find "${LOCAL_FUNCTIONS_DIR}" -mindepth 1 -maxdepth 1 -type d ! -name '_*' | wc -l | tr -d ' ')
echo "Local functions: ${LOCAL_COUNT}"

# Try to get deployed count
if command -v supabase &> /dev/null; then
  echo ""
  echo "Checking deployment status..."
  echo "Run 'supabase functions list --project-ref ${PROJECT_REF}' to see deployed functions"
fi

echo ""

# ============================================================================
# PHASE 5: FUNCTION CONFIGURATION CHECK
# ============================================================================

echo "=== PHASE 5: FUNCTION CONFIGURATION CHECK ==="
echo ""

# Check for deno.json files
echo "Checking function configurations..."
MISSING_CONFIG=0

for func_dir in "${LOCAL_FUNCTIONS_DIR}"/*/; do
  func_name=$(basename "$func_dir")
  if [[ "$func_name" != _* ]]; then
    if [ ! -f "${func_dir}deno.json" ]; then
      echo -e "${YELLOW}⚠️  ${func_name}: Missing deno.json${NC}"
      MISSING_CONFIG=$((MISSING_CONFIG + 1))
    fi
    if [ ! -f "${func_dir}index.ts" ]; then
      echo -e "${RED}❌ ${func_name}: Missing index.ts${NC}"
      MISSING_CONFIG=$((MISSING_CONFIG + 1))
    fi
  fi
done

if [ $MISSING_CONFIG -eq 0 ]; then
  echo -e "${GREEN}✅ All functions have required configuration files${NC}"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "============================================================================"
echo "AUDIT SUMMARY"
echo "============================================================================"
echo "Local Functions: ${LOCAL_COUNT}"
echo "Critical Functions Found: $((${#CRITICAL_FUNCTIONS[@]} - ${#MISSING_FUNCTIONS[@]}))/${#CRITICAL_FUNCTIONS[@]}"
echo ""

if [ ${#MISSING_FUNCTIONS[@]} -eq 0 ] && [ $MISSING_CONFIG -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some issues found. Review above.${NC}"
  exit 1
fi


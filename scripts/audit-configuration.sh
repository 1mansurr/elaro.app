#!/bin/bash

# ============================================================================
# CONFIGURATION AUDIT SCRIPT
# Post-Migration Verification
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "CONFIGURATION AUDIT"
echo "============================================================================"
echo ""

# ============================================================================
# PHASE 1: ENVIRONMENT VARIABLES CHECK
# ============================================================================

echo "=== PHASE 1: ENVIRONMENT VARIABLES ==="
echo ""

# Load .env if it exists (using safer method)
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
  echo -e "${GREEN}✅ .env file found${NC}"
else
  echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

echo ""

# Required variables
REQUIRED_VARS=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
)

# Recommended variables
RECOMMENDED_VARS=(
  "EXPO_PUBLIC_REVENUECAT_APPLE_KEY"
  "EXPO_PUBLIC_SENTRY_DSN"
  "EXPO_PUBLIC_MIXPANEL_TOKEN"
)

MISSING_REQUIRED=()
MISSING_RECOMMENDED=()

# Check required variables
echo "Required Variables:"
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "  ${RED}❌${NC} ${var} (missing)"
    MISSING_REQUIRED+=("$var")
  else
    # Mask sensitive values
    if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]]; then
      VALUE_MASKED=$(echo "${!var}" | sed 's/\(.\{8\}\).*/\1.../')
      echo -e "  ${GREEN}✅${NC} ${var}=${VALUE_MASKED}"
    else
      echo -e "  ${GREEN}✅${NC} ${var}=${!var}"
    fi
  fi
done

echo ""

# Check recommended variables
echo "Recommended Variables:"
for var in "${RECOMMENDED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "  ${YELLOW}⚠️${NC}  ${var} (missing - optional)"
    MISSING_RECOMMENDED+=("$var")
  else
    VALUE_MASKED=$(echo "${!var}" | sed 's/\(.\{8\}\).*/\1.../')
    echo -e "  ${GREEN}✅${NC} ${var}=${VALUE_MASKED}"
  fi
done

echo ""

# ============================================================================
# PHASE 2: SUPABASE CONFIGURATION CHECK
# ============================================================================

echo "=== PHASE 2: SUPABASE CONFIGURATION ==="
echo ""

# Check config.toml
if [ -f "supabase/config.toml" ]; then
  echo -e "${GREEN}✅ supabase/config.toml found${NC}"
  
  PROJECT_REF=$(grep "^project_id" supabase/config.toml | cut -d'"' -f2 || echo "")
  if [ -n "$PROJECT_REF" ]; then
    echo "  Project Reference: ${PROJECT_REF}"
  fi
else
  echo -e "${RED}❌ supabase/config.toml not found${NC}"
fi

echo ""

# Verify Supabase URL matches project reference
if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ] && [ -n "$PROJECT_REF" ]; then
  if [[ "$EXPO_PUBLIC_SUPABASE_URL" == *"$PROJECT_REF"* ]]; then
    echo -e "${GREEN}✅ Supabase URL matches project reference${NC}"
  else
    echo -e "${RED}❌ Supabase URL does not match project reference${NC}"
    echo "  URL: ${EXPO_PUBLIC_SUPABASE_URL}"
    echo "  Expected: https://${PROJECT_REF}.supabase.co"
  fi
fi

echo ""

# ============================================================================
# PHASE 3: APP CONFIGURATION CHECK
# ============================================================================

echo "=== PHASE 3: APP CONFIGURATION ==="
echo ""

# Check app.config.js
if [ -f "app.config.js" ]; then
  echo -e "${GREEN}✅ app.config.js found${NC}"
  
  # Validate config
  if npm run validate-env &> /dev/null; then
    echo -e "${GREEN}✅ Configuration validation passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Configuration validation failed (run 'npm run validate-env' for details)${NC}"
  fi
else
  echo -e "${RED}❌ app.config.js not found${NC}"
fi

echo ""

# ============================================================================
# PHASE 4: SUPABASE CLI CHECK
# ============================================================================

echo "=== PHASE 4: SUPABASE CLI STATUS ==="
echo ""

if command -v supabase &> /dev/null; then
  SUPABASE_VERSION=$(supabase --version 2>/dev/null || echo "unknown")
  echo -e "${GREEN}✅ Supabase CLI installed${NC}"
  echo "  Version: ${SUPABASE_VERSION}"
  
  # Check if logged in
  if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✅ Logged in to Supabase${NC}"
    
    # Try to get linked project
    if [ -f "supabase/config.toml" ] && [ -n "$PROJECT_REF" ]; then
      echo "  Linked Project: ${PROJECT_REF}"
    fi
  else
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "  Run: supabase login"
  fi
else
  echo -e "${RED}❌ Supabase CLI not installed${NC}"
  echo "  Install: npm install -g supabase"
fi

echo ""

# ============================================================================
# PHASE 5: DATABASE CONNECTION TEST
# ============================================================================

echo "=== PHASE 5: DATABASE CONNECTION TEST ==="
echo ""

if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${YELLOW}⚠️  Missing Supabase credentials. Skipping connection test.${NC}"
else
  echo "Testing database connection..."
  
  # Simple connection test using curl
  TEST_URL="${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/"
  
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    -H "apikey: ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    "${TEST_URL}" 2>&1 || echo "HTTP_STATUS:000")
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ]; then
    echo -e "${GREEN}✅ Database connection successful (HTTP ${HTTP_STATUS})${NC}"
  elif [ "$HTTP_STATUS" = "000" ]; then
    echo -e "${RED}❌ Connection failed${NC}"
  else
    echo -e "${YELLOW}⚠️  Unexpected response (HTTP ${HTTP_STATUS})${NC}"
  fi
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "============================================================================"
echo "AUDIT SUMMARY"
echo "============================================================================"

if [ ${#MISSING_REQUIRED[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All required variables configured${NC}"
else
  echo -e "${RED}❌ Missing ${#MISSING_REQUIRED[@]} required variables${NC}"
fi

if [ ${#MISSING_RECOMMENDED[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All recommended variables configured${NC}"
else
  echo -e "${YELLOW}⚠️  Missing ${#MISSING_RECOMMENDED[@]} recommended variables${NC}"
fi

echo ""

if [ ${#MISSING_REQUIRED[@]} -eq 0 ]; then
  exit 0
else
  exit 1
fi


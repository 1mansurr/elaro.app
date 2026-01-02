#!/bin/bash

# Security Check Script
# Prevents security regressions in CI/CD pipeline
# Exit code 1 = security issue found (blocks deployment)

set -e

ERRORS=0
WARNINGS=0

echo "🔒 Running security checks..."

# Check 1: No wildcard CORS
echo "✓ Checking for wildcard CORS..."
# Pattern: Match Access-Control-Allow-Origin with wildcard '*' in quotes
# Exclude:
#   - Lines starting with // (single-line comments)
#   - Lines containing /* or */ (multi-line comments)
#   - getCorsHeaders function definition (legitimate usage)
#   - allowedOrigins array (configuration, not actual header)
#   - SECURITY: comments (documentation)
WILDCARD_CORS=$(grep -rE "Access-Control-Allow-Origin.*['\"\`]\*['\"\`]" supabase/functions/ --include="*.ts" 2>/dev/null | \
  grep -vE "^\s*//|/\*|\*/|getCorsHeaders|allowedOrigins|SECURITY:" || true)

if [ -n "$WILDCARD_CORS" ]; then
  echo "❌ ERROR: Wildcard CORS found. Use getCorsHeaders() instead."
  echo "$WILDCARD_CORS"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ No wildcard CORS found"
fi

# Check 1.5: Verify functions use getCorsHeaders instead of corsHeaders
echo "✓ Checking for deprecated corsHeaders usage..."
DEPRECATED_CORS=$(grep -r "import.*corsHeaders.*from" supabase/functions/ --include="*.ts" 2>/dev/null | grep -v "_shared/response.ts" | grep -v "_shared/function-handler.ts" | grep -v "getCorsHeaders" || true)
if [ -n "$DEPRECATED_CORS" ]; then
  echo "⚠️  WARNING: Functions still using deprecated corsHeaders:"
  echo "$DEPRECATED_CORS"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ All functions use getCorsHeaders(origin)"
fi

# Check 2: verify_jwt = false endpoints have alternative auth
echo "✓ Checking verify_jwt = false endpoints..."
UNAUTH_ENDPOINTS=$(grep -A 1 "verify_jwt = false" supabase/config.toml 2>/dev/null | grep -E "\[functions\." | sed 's/\[functions\.\(.*\)\]/\1/' || true)

for endpoint in $UNAUTH_ENDPOINTS; do
  ENDPOINT_FILE="supabase/functions/${endpoint}/index.ts"
  if [ -f "$ENDPOINT_FILE" ]; then
    # Check for service role key validation
    if ! grep -q "SUPABASE_SERVICE_ROLE_KEY" "$ENDPOINT_FILE" && \
       ! grep -q "createWebhookHandler" "$ENDPOINT_FILE" && \
       ! grep -q "createScheduledHandler" "$ENDPOINT_FILE" && \
       ! grep -q "constantTimeCompare" "$ENDPOINT_FILE"; then
      echo "❌ ERROR: Endpoint '$endpoint' has verify_jwt = false but no alternative authentication"
      ERRORS=$((ERRORS + 1))
    else
      echo "  ✓ Endpoint '$endpoint' has alternative authentication"
    fi
  fi
done

# Check 3: No secret files in git
echo "✓ Checking for secret files in git..."
if git ls-files | grep -E "\.(p8|key|secret|pem)$" | grep -v ".gitignore"; then
  echo "❌ ERROR: Secret files tracked in git"
  git ls-files | grep -E "\.(p8|key|secret|pem)$"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ No secret files in git"
fi

# Check 4: No server secrets in EXPO_PUBLIC_*
echo "✓ Checking for server secrets in client bundle..."
AUDIT_OUTPUT=$(node scripts/audit-secrets.js 2>&1)
AUDIT_EXIT=$?
if [ $AUDIT_EXIT -ne 0 ] || echo "$AUDIT_OUTPUT" | grep -qi "CRITICAL ISSUES FOUND"; then
  echo "❌ ERROR: Server secrets found in client bundle"
  echo "$AUDIT_OUTPUT" | grep -i "CRITICAL\|error\|exposed"
  ERRORS=$((ERRORS + 1))
elif echo "$AUDIT_OUTPUT" | grep -qi "No security issues found"; then
  echo "  ✓ No server secrets in client bundle"
else
  echo "  ⚠️  WARNING: Audit script output unclear (manual review recommended)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Apple private keys not in filesystem
echo "✓ Checking for Apple private keys in filesystem..."
if ls AuthKey_*.p8 2>/dev/null; then
  echo "❌ ERROR: Apple private keys found in filesystem"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ No Apple private keys in filesystem"
fi

# Check 6: All authenticated endpoints verify ownership
echo "✓ Checking authorization patterns..."
# This is a pattern check - look for update/delete without ownership verification
# Note: This is a heuristic and may have false positives
if grep -r "\.update\|\.delete" supabase/functions/ --include="*.ts" | \
   grep -v "\.eq('user_id'" | \
   grep -v "\.eq(\"user_id\"" | \
   grep -v "user\.id" | \
   grep -v "//.*ownership" | \
   grep -v "SECURITY:" | \
   grep -v "Verify ownership"; then
  echo "⚠️  WARNING: Potential missing ownership checks (manual review required)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ Ownership verification patterns found"
fi

# Check 7: HMAC secret validation (if INTERNAL_HMAC_SECRET is referenced)
echo "✓ Checking HMAC secret configuration..."
if grep -r "INTERNAL_HMAC_SECRET" supabase/functions/ --include="*.ts" >/dev/null 2>&1; then
  # Check if secret validation exists in code
  if grep -r "validateHmacSecret\|MIN_SECRET_LENGTH.*32" supabase/functions/ --include="*.ts" >/dev/null 2>&1; then
    echo "  ✓ HMAC secret validation found in code"
  else
    echo "⚠️  WARNING: INTERNAL_HMAC_SECRET used but validation not found"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check if secret is in client bundle (should fail)
  if grep -r "EXPO_PUBLIC.*INTERNAL_HMAC_SECRET\|INTERNAL_HMAC_SECRET" src/ app.json app.config.js 2>/dev/null | grep -v "node_modules"; then
    echo "❌ ERROR: INTERNAL_HMAC_SECRET found in client code"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✓ INTERNAL_HMAC_SECRET not exposed to client"
  fi
else
  echo "  ✓ No HMAC secret usage found (skipping check)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All security checks passed"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Security checks passed with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Security checks failed: $ERRORS error(s), $WARNINGS warning(s)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Deployment blocked. Fix errors before proceeding."
  exit 1
fi


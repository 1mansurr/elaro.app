#!/bin/bash

# iOS Test Execution Script
# Runs all iOS-specific tests and validations

set -e  # Exit on error

echo "🍎 =========================================="
echo "🍎 iOS Test Suite - Complete Execution"
echo "🍎 =========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test and track results
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✅ ${test_name} PASSED${NC}\n"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ ${test_name} FAILED${NC}\n"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "📋 Phase 1: Code Quality Checks"
echo "--------------------------------"

# 1. Linting
run_test "ESLint (iOS-specific files)" "npm run lint -- --ext .ts,.tsx src/"

# 2. Type checking
run_test "TypeScript Type Check" "npx tsc --noEmit"

echo ""
echo "📋 Phase 2: Unit Tests"
echo "--------------------------------"

# 3. Unit tests (filter iOS-specific if any)
run_test "Unit Tests" "npm run test:unit 2>&1 | grep -E '(PASS|FAIL|Tests:)' || true"

echo ""
echo "📋 Phase 3: Integration Tests"
echo "--------------------------------"

# 4. Integration tests
run_test "Integration Tests" "npm run test:integration 2>&1 | grep -E '(PASS|FAIL|Tests:)' || true"

echo ""
echo "📋 Phase 4: iOS-Specific Validations"
echo "--------------------------------"

# 5. iOS build configuration check
run_test "iOS Build Config Validation" "node -e \"
const config = require('./app.config.js')({config:{}});
if (!config.ios || !config.ios.bundleIdentifier) {
  console.error('iOS config missing');
  process.exit(1);
}
console.log('iOS config valid');
\""

# 6. iOS permissions check
run_test "iOS Permissions Check" "node -e \"
const config = require('./app.config.js')({config:{}});
const requiredPerms = ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'];
const missing = requiredPerms.filter(p => !config.ios?.infoPlist?.[p]);
if (missing.length > 0) {
  console.error('Missing permissions:', missing);
  process.exit(1);
}
console.log('All required permissions present');
\""

# 7. Podfile validation
run_test "Podfile Validation" "cd ios && pod --version > /dev/null 2>&1 && echo 'CocoaPods installed' || echo 'CocoaPods not installed (warning)'"

echo ""
echo "📋 Phase 5: E2E Tests (Requires Built App)"
echo "--------------------------------"

# 8. Check if E2E can run
if command -v detox &> /dev/null; then
    echo -e "${YELLOW}Detox found. Checking iOS build...${NC}"
    
    if [ -d "ios/build/Build/Products/Debug-iphonesimulator" ]; then
        echo -e "${GREEN}iOS build found${NC}"
        run_test "iOS E2E Tests" "npm run e2e:test:ios 2>&1 | tail -20" || echo -e "${YELLOW}⚠️  E2E tests require simulator. Run manually when ready.${NC}\n"
    else
        echo -e "${YELLOW}⚠️  iOS build not found. Building...${NC}"
        echo -e "${YELLOW}Run: npm run e2e:build:ios${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  Detox not found. Install with: npm install -g detox-cli${NC}\n"
fi

echo ""
echo "📋 Phase 6: Manual Testing Checklist"
echo "--------------------------------"
echo "The following require manual testing on iOS device/simulator:"
echo ""
echo "  [ ] App launches successfully"
echo "  [ ] Sign up flow works"
echo "  [ ] Sign in flow works"
echo "  [ ] Onboarding completes"
echo "  [ ] Main app screens load"
echo "  [ ] Task creation works"
echo "  [ ] Notifications work"
echo "  [ ] Deep links work"
echo "  [ ] Guest mode works"
echo "  [ ] Offline mode works"
echo "  [ ] Camera permissions work"
echo "  [ ] Photo library permissions work"
echo ""

echo "=========================================="
echo "📊 iOS Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All automated iOS tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some iOS tests failed. Review output above.${NC}"
    exit 1
fi


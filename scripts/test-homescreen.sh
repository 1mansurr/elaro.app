#!/bin/bash

# HomeScreen Component Testing Script
# This script runs comprehensive tests for the refactored HomeScreen components

echo "🧪 HomeScreen Component Testing Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="src/features/dashboard/components/HomeScreen/__tests__"
JEST_CONFIG="jest.config.ultimate.js"

echo -e "${BLUE}📁 Test Directory: ${TEST_DIR}${NC}"
echo -e "${BLUE}⚙️  Jest Config: ${JEST_CONFIG}${NC}"
echo ""

# Function to run tests and capture results
run_test() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"
    
    echo -e "${YELLOW}🔍 Running ${test_name}...${NC}"
    echo -e "${BLUE}   ${description}${NC}"
    
    if npx jest --config ${JEST_CONFIG} ${test_file} --verbose --passWithNoTests; then
        echo -e "${GREEN}✅ ${test_name} PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} FAILED${NC}"
        return 1
    fi
}

# Function to run all tests in a directory
run_directory_tests() {
    local dir_name="$1"
    local description="$2"
    
    echo -e "${YELLOW}🔍 Running ${dir_name} tests...${NC}"
    echo -e "${BLUE}   ${description}${NC}"
    
    if npx jest --config ${JEST_CONFIG} ${TEST_DIR}/${dir_name} --verbose --passWithNoTests; then
        echo -e "${GREEN}✅ ${dir_name} tests PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${dir_name} tests FAILED${NC}"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

echo -e "${BLUE}🚀 Starting HomeScreen Component Tests${NC}"
echo ""

# 1. Component Structure Tests
echo -e "${YELLOW}📋 Phase 1: Component Structure Tests${NC}"
echo "----------------------------------------"

run_test "Component Structure" "${TEST_DIR}/component-structure.simple.test.js" "Validating component file structure and exports"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# 2. Individual Component Tests
echo -e "${YELLOW}🧩 Phase 2: Individual Component Tests${NC}"
echo "--------------------------------------------"

# HomeScreenHeader tests
run_test "HomeScreenHeader Structure" "${TEST_DIR}/HomeScreenHeader.structure.test.js" "Testing HomeScreenHeader component structure"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# HomeScreenContent tests
run_test "HomeScreenContent Structure" "${TEST_DIR}/HomeScreenContent.simple.test.tsx" "Testing HomeScreenContent component structure"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# 3. Integration Tests
echo -e "${YELLOW}🔗 Phase 3: Integration Tests${NC}"
echo "--------------------------------"

run_test "HomeScreen Integration" "${TEST_DIR}/HomeScreen.integration.test.tsx" "Testing component interactions and data flow"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# 4. Performance Tests
echo -e "${YELLOW}⚡ Phase 4: Performance Tests${NC}"
echo "--------------------------------"

run_test "HomeScreen Performance" "${TEST_DIR}/HomeScreen.performance.test.tsx" "Testing performance optimizations and monitoring"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# 5. Complete Integration Tests
echo -e "${YELLOW}🎯 Phase 5: Complete Integration Tests${NC}"
echo "----------------------------------------"

run_test "HomeScreen Complete" "${TEST_DIR}/HomeScreen.complete.test.tsx" "Testing complete HomeScreen integration"
if [ $? -eq 0 ]; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# 6. Run all tests together
echo -e "${YELLOW}🏁 Phase 6: Complete Test Suite${NC}"
echo "--------------------------------"

echo -e "${BLUE}🔍 Running all HomeScreen tests together...${NC}"
if npx jest --config ${JEST_CONFIG} ${TEST_DIR} --verbose --passWithNoTests; then
    echo -e "${GREEN}✅ All HomeScreen tests PASSED${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ Some HomeScreen tests FAILED${NC}"
    ((failed_tests++))
fi
((total_tests++))

echo ""

# Test Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "================"
echo -e "Total Tests: ${total_tests}"
echo -e "${GREEN}Passed: ${passed_tests}${NC}"
echo -e "${RED}Failed: ${failed_tests}${NC}"

if [ ${failed_tests} -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! HomeScreen refactoring is successful.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi

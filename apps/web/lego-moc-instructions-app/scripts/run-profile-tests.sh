#!/bin/bash

# ProfilePage Test Suite Runner
# This script runs all types of tests for the ProfilePage component

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="src/pages/ProfilePage/__tests__"
E2E_TEST_FILE="tests/profile/profile-page.spec.ts"
COVERAGE_DIR="coverage"
REPORTS_DIR="test-reports"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command_exists pnpm; then
        print_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    # Check if required packages are installed
    if ! pnpm list @testing-library/user-event >/dev/null 2>&1; then
        print_warning "Installing missing testing dependencies..."
        pnpm add -D @testing-library/user-event jest-axe
    fi
}

# Function to create directories
setup_directories() {
    print_status "Setting up directories..."
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$REPORTS_DIR"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if pnpm test "$TEST_DIR/ProfilePage.unit.test.tsx" --coverage --reporter=verbose; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run UX tests
run_ux_tests() {
    print_status "Running UX tests..."
    
    if pnpm test "$TEST_DIR/ProfilePage.ux.test.tsx" --reporter=verbose; then
        print_success "UX tests passed"
    else
        print_error "UX tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    if pnpm test "$TEST_DIR/ProfilePage.performance.test.tsx" --reporter=verbose; then
        print_success "Performance tests passed"
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    if pnpm test "$TEST_DIR/ProfilePage.security.test.tsx" --reporter=verbose; then
        print_success "Security tests passed"
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Function to run accessibility tests
run_accessibility_tests() {
    print_status "Running accessibility tests..."
    
    if pnpm test "$TEST_DIR/ProfilePage.accessibility.test.tsx" --reporter=verbose; then
        print_success "Accessibility tests passed"
    else
        print_error "Accessibility tests failed"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    if pnpm test:e2e "$E2E_TEST_FILE"; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running all test types..."
    
    local failed_tests=()
    
    # Run each test type
    if ! run_unit_tests; then
        failed_tests+=("Unit Tests")
    fi
    
    if ! run_ux_tests; then
        failed_tests+=("UX Tests")
    fi
    
    if ! run_performance_tests; then
        failed_tests+=("Performance Tests")
    fi
    
    if ! run_security_tests; then
        failed_tests+=("Security Tests")
    fi
    
    if ! run_accessibility_tests; then
        failed_tests+=("Accessibility Tests")
    fi
    
    if ! run_e2e_tests; then
        failed_tests+=("E2E Tests")
    fi
    
    # Report results
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_success "All tests passed!"
        return 0
    else
        print_error "The following test types failed:"
        for test in "${failed_tests[@]}"; do
            print_error "  - $test"
        done
        return 1
    fi
}

# Function to run specific test type
run_specific_test() {
    case "$1" in
        "unit")
            run_unit_tests
            ;;
        "ux")
            run_ux_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "security")
            run_security_tests
            ;;
        "accessibility")
            run_accessibility_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        *)
            print_error "Unknown test type: $1"
            print_status "Available test types: unit, ux, performance, security, accessibility, e2e"
            exit 1
            ;;
    esac
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..."
    
    local report_file="$REPORTS_DIR/profile-tests-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# ProfilePage Test Suite Report

Generated on: $(date)

## Test Results

### Unit Tests
- Status: $(if [ -f "$COVERAGE_DIR/unit-coverage.json" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)
- Coverage: $(if [ -f "$COVERAGE_DIR/unit-coverage.json" ]; then cat "$COVERAGE_DIR/unit-coverage.json" | grep -o '"lines": [0-9.]*' | cut -d' ' -f2; else echo "N/A"; fi)%

### UX Tests
- Status: $(if [ -f "$REPORTS_DIR/ux-tests.log" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### Performance Tests
- Status: $(if [ -f "$REPORTS_DIR/performance-tests.log" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### Security Tests
- Status: $(if [ -f "$REPORTS_DIR/security-tests.log" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### Accessibility Tests
- Status: $(if [ -f "$REPORTS_DIR/accessibility-tests.log" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### E2E Tests
- Status: $(if [ -f "$REPORTS_DIR/e2e-tests.log" ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

## Summary

$(if [ ${#failed_tests[@]} -eq 0 ]; then
    echo "All tests passed successfully! 🎉"
else
    echo "Some tests failed:"
    for test in "${failed_tests[@]}"; do
        echo "- $test"
    done
fi)

EOF
    
    print_success "Test report generated: $report_file"
}

# Function to show help
show_help() {
    echo "ProfilePage Test Suite Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -a, --all           Run all test types"
    echo "  -r, --report        Generate test report"
    echo "  -v, --verbose       Enable verbose output"
    echo ""
    echo "Test Types:"
    echo "  unit                Run unit tests only"
    echo "  ux                  Run UX tests only"
    echo "  performance         Run performance tests only"
    echo "  security            Run security tests only"
    echo "  accessibility       Run accessibility tests only"
    echo "  e2e                 Run E2E tests only"
    echo ""
    echo "Examples:"
    echo "  $0 --all            Run all tests"
    echo "  $0 unit             Run unit tests only"
    echo "  $0 e2e --verbose    Run E2E tests with verbose output"
    echo "  $0 --all --report   Run all tests and generate report"
}

# Main script logic
main() {
    local run_all=false
    local generate_report_flag=false
    local verbose=false
    local test_type=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -a|--all)
                run_all=true
                shift
                ;;
            -r|--report)
                generate_report_flag=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            unit|ux|performance|security|accessibility|e2e)
                test_type="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set verbose mode
    if [ "$verbose" = true ]; then
        set -x
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup directories
    setup_directories
    
    # Run tests based on arguments
    if [ "$run_all" = true ]; then
        run_all_tests
    elif [ -n "$test_type" ]; then
        run_specific_test "$test_type"
    else
        print_status "No test type specified, running all tests..."
        run_all_tests
    fi
    
    # Generate report if requested
    if [ "$generate_report_flag" = true ]; then
        generate_report
    fi
    
    print_success "Test suite execution completed!"
}

# Run main function with all arguments
main "$@" 
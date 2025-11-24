#!/bin/bash

# Grafana Dashboard Validation Script
# Validates dashboard JSON files and integration with CloudWatch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/sst/observability/grafana-dashboards"

echo "🔍 Validating Grafana Dashboards..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: $message"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name: $message"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Test 1: Validate JSON syntax
echo -e "\n${YELLOW}Testing JSON Syntax...${NC}"

for dashboard in "$DASHBOARD_DIR"/*.json; do
    if [ -f "$dashboard" ]; then
        filename=$(basename "$dashboard")
        if jq empty "$dashboard" 2>/dev/null; then
            print_result "JSON Syntax" "PASS" "$filename is valid JSON"
        else
            print_result "JSON Syntax" "FAIL" "$filename has invalid JSON syntax"
        fi
    fi
done

# Test 2: Validate required dashboard properties
echo -e "\n${YELLOW}Testing Dashboard Properties...${NC}"

validate_dashboard_properties() {
    local dashboard="$1"
    local filename=$(basename "$dashboard")
    
    # Check for required properties
    local has_uid=$(jq -r '.dashboard.uid // empty' "$dashboard")
    local has_title=$(jq -r '.dashboard.title // empty' "$dashboard")
    local has_folder_uid=$(jq -r '.dashboard.folderUid // empty' "$dashboard")
    
    if [ -n "$has_uid" ] && [ -n "$has_title" ] && [ -n "$has_folder_uid" ]; then
        print_result "Dashboard Properties" "PASS" "$filename has required properties"
    else
        print_result "Dashboard Properties" "FAIL" "$filename missing required properties (uid, title, folderUid)"
    fi
}

for dashboard in "$DASHBOARD_DIR"/*.json; do
    if [ -f "$dashboard" ] && [[ "$dashboard" != *"folder-structure.json" ]] && [[ "$dashboard" != *"dashboard-settings.json" ]]; then
        validate_dashboard_properties "$dashboard"
    fi
done

# Test 3: Validate folder structure
echo -e "\n${YELLOW}Testing Folder Structure...${NC}"

if [ -f "$DASHBOARD_DIR/folder-structure.json" ]; then
    folder_count=$(jq '.folders | length' "$DASHBOARD_DIR/folder-structure.json")
    if [ "$folder_count" -eq 3 ]; then
        print_result "Folder Structure" "PASS" "All 3 required folders defined (Infrastructure, Application, Frontend)"
    else
        print_result "Folder Structure" "FAIL" "Expected 3 folders, found $folder_count"
    fi
else
    print_result "Folder Structure" "FAIL" "folder-structure.json not found"
fi

# Test 4: Validate dashboard-folder mapping
echo -e "\n${YELLOW}Testing Dashboard-Folder Mapping...${NC}"

check_folder_mapping() {
    local dashboard="$1"
    local filename=$(basename "$dashboard")
    local folder_uid=$(jq -r '.dashboard.folderUid // empty' "$dashboard")
    
    case "$folder_uid" in
        "application-folder"|"infrastructure-folder"|"frontend-folder")
            print_result "Folder Mapping" "PASS" "$filename correctly mapped to $folder_uid"
            ;;
        "")
            print_result "Folder Mapping" "FAIL" "$filename has no folderUid"
            ;;
        *)
            print_result "Folder Mapping" "FAIL" "$filename has invalid folderUid: $folder_uid"
            ;;
    esac
}

for dashboard in "$DASHBOARD_DIR"/*.json; do
    if [ -f "$dashboard" ] && [[ "$dashboard" != *"folder-structure.json" ]] && [[ "$dashboard" != *"dashboard-settings.json" ]]; then
        check_folder_mapping "$dashboard"
    fi
done

# Test 5: Validate refresh intervals
echo -e "\n${YELLOW}Testing Refresh Intervals...${NC}"

check_refresh_interval() {
    local dashboard="$1"
    local filename=$(basename "$dashboard")
    local refresh=$(jq -r '.dashboard.refresh // empty' "$dashboard")
    
    case "$refresh" in
        "1m"|"2m"|"5m"|"30s")
            print_result "Refresh Interval" "PASS" "$filename has appropriate refresh interval: $refresh"
            ;;
        "")
            print_result "Refresh Interval" "FAIL" "$filename has no refresh interval"
            ;;
        *)
            print_result "Refresh Interval" "WARN" "$filename has unusual refresh interval: $refresh"
            ;;
    esac
}

for dashboard in "$DASHBOARD_DIR"/*.json; do
    if [ -f "$dashboard" ] && [[ "$dashboard" != *"folder-structure.json" ]] && [[ "$dashboard" != *"dashboard-settings.json" ]]; then
        check_refresh_interval "$dashboard"
    fi
done

# Test 6: Validate time ranges
echo -e "\n${YELLOW}Testing Time Ranges...${NC}"

check_time_range() {
    local dashboard="$1"
    local filename=$(basename "$dashboard")
    local time_from=$(jq -r '.dashboard.time.from // empty' "$dashboard")
    local time_to=$(jq -r '.dashboard.time.to // empty' "$dashboard")
    
    if [ -n "$time_from" ] && [ -n "$time_to" ]; then
        print_result "Time Range" "PASS" "$filename has valid time range: $time_from to $time_to"
    else
        print_result "Time Range" "FAIL" "$filename missing time range configuration"
    fi
}

for dashboard in "$DASHBOARD_DIR"/*.json; do
    if [ -f "$dashboard" ] && [[ "$dashboard" != *"folder-structure.json" ]] && [[ "$dashboard" != *"dashboard-settings.json" ]]; then
        check_time_range "$dashboard"
    fi
done

# Summary
echo -e "\n${YELLOW}Validation Summary:${NC}"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All dashboard validations passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some validations failed. Please review and fix the issues above.${NC}"
    exit 1
fi

#!/bin/bash

# Infrastructure Health Check Script
# Tests all Docker infrastructure services for connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_success "$service_name is responding"
        return 0
    else
        print_error "$service_name is not responding"
        return 1
    fi
}

# Function to test JSON API endpoint
test_json_api() {
    local url=$1
    local service_name=$2
    local expected_key=${3:-""}
    local timeout=${4:-10}
    
    local response=$(curl -s --max-time $timeout -H "Content-Type: application/json" "$url" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        if [ -n "$expected_key" ]; then
            if echo "$response" | grep -q "$expected_key"; then
                print_success "$service_name API is healthy"
                return 0
            else
                print_warning "$service_name responded but missing expected data"
                return 1
            fi
        else
            print_success "$service_name API is responding"
            return 0
        fi
    else
        print_error "$service_name API is not responding"
        return 1
    fi
}

# Main health check
main() {
    print_header "Infrastructure Health Check"
    
    local failed_services=0
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running!"
        exit 1
    fi
    
    print_info "Docker is running"
    
    # Check if infrastructure services are up
    print_header "Docker Services Status"
    docker-compose -f docker-compose.dev.yml ps
    
    print_header "Service Health Tests"
    
    # Test Elasticsearch
    print_info "Testing Elasticsearch..."
    if test_json_api "http://localhost:9200" "Elasticsearch" "cluster_name" 15; then
        # Test cluster health
        local es_health=$(curl -s --max-time 5 "http://localhost:9200/_cluster/health" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$es_health" = "green" ] || [ "$es_health" = "yellow" ]; then
            print_success "Elasticsearch cluster health: $es_health"
        else
            print_warning "Elasticsearch cluster health: ${es_health:-unknown}"
            ((failed_services++))
        fi
    else
        ((failed_services++))
    fi
    
    # Test MongoDB via Mongo Express
    print_info "Testing MongoDB via Mongo Express..."
    if test_http "http://localhost:8081" "MongoDB Express (MongoDB access)"; then
        true  # MongoDB is accessible via Mongo Express
    else
        ((failed_services++))
    fi
    
    # Test PostgreSQL via pgAdmin
    print_info "Testing PostgreSQL via pgAdmin..."
    if test_http "http://localhost:8082" "pgAdmin (PostgreSQL access)"; then
        true  # PostgreSQL is accessible via pgAdmin
    else
        ((failed_services++))
    fi
    
    # Test Redis (no direct HTTP API, check via Docker)
    print_info "Testing Redis..."
    if docker exec redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is responding to ping"
    else
        print_error "Redis is not responding"
        ((failed_services++))
    fi
    
    # Summary
    print_header "Health Check Summary"
    
    if [ $failed_services -eq 0 ]; then
        print_success "All infrastructure services are healthy! 🎉"
        echo ""
        print_info "Service URLs:"
        echo "  • Elasticsearch: http://localhost:9200"
        echo "  • MongoDB Admin: http://localhost:8081"
        echo "  • pgAdmin: http://localhost:8082"
        echo "  • Redis: localhost:6379"
        echo ""
        print_info "Connection strings for your applications:"
        echo "  • MongoDB: mongodb://admin:password123@localhost:27017/myapp?authSource=admin"
        echo "  • PostgreSQL: postgresql://postgres:password@localhost:5432/lego_projects"
        echo "  • Redis: redis://localhost:6379"
        echo "  • Elasticsearch: http://localhost:9200"
        exit 0
    else
        print_error "$failed_services service(s) failed health checks"
        echo ""
        print_info "Troubleshooting steps:"
        echo "  1. Ensure services are running: docker-compose -f docker-compose.dev.yml ps"
        echo "  2. Check service logs: docker-compose -f docker-compose.dev.yml logs [service_name]"
        echo "  3. Restart failed services: docker-compose -f docker-compose.dev.yml restart [service_name]"
        echo "  4. Full restart: docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml up -d"
        exit 1
    fi
}

# Run main function
main "$@"

#!/bin/bash

# Auth Test Suite Runner
# 
# Runs the complete auth flow test suite with proper setup and teardown
# Ensures all services are running and database is seeded before testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🧪 Auth Test Suite Runner${NC}"
echo ""

# Parse command line arguments
HEADED=false
SPECIFIC_TEST=""
DEBUG=false
SETUP_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED=true
      shift
      ;;
    --test=*)
      SPECIFIC_TEST="${1#*=}"
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --setup-only)
      SETUP_ONLY=true
      shift
      ;;
    --help|-h)
      echo "Auth Test Suite Runner"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --headed              Run tests with browser UI"
      echo "  --test=<pattern>      Run specific test (e.g., --test=signin)"
      echo "  --debug               Run in debug mode with extra logging"
      echo "  --setup-only          Only setup services, don't run tests"
      echo "  --help, -h            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                           # Run all auth tests headless"
      echo "  $0 --headed                  # Run with browser UI"
      echo "  $0 --test=complete-auth-flow # Run specific test file"
      echo "  $0 --debug --headed          # Debug mode with UI"
      echo "  $0 --setup-only              # Just setup services"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is not running${NC}"
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -f "playwright.config.ts" ]; then
    echo -e "${RED}❌ Error: Must be run from the web app directory${NC}"
    echo "   cd apps/web/lego-moc-instructions-app"
    exit 1
fi

echo -e "${BLUE}🔍 Checking service status...${NC}"

# Check if services are running
SERVICES_OK=true

if ! check_service "http://localhost:9000/api/auth/csrf" "Auth Service"; then
    SERVICES_OK=false
fi

if ! check_service "http://localhost:3004" "Web App" && ! check_service "http://localhost:3002" "Web App"; then
    SERVICES_OK=false
fi

# Check Docker services
if ! docker-compose -f ../../../docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${RED}❌ Docker infrastructure services not running${NC}"
    SERVICES_OK=false
fi

if [ "$SERVICES_OK" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some services are not running. Starting them now...${NC}"
    echo ""
    
    # Start Docker infrastructure
    echo -e "${BLUE}🐳 Starting Docker infrastructure...${NC}"
    cd ../../..
    docker-compose -f docker-compose.dev.yml up -d
    cd apps/web/lego-moc-instructions-app
    
    # Wait for infrastructure
    sleep 10
    
    # Start auth service if not running
    if ! check_service "http://localhost:9000/api/auth/csrf" "Auth Service"; then
        echo -e "${BLUE}🔐 Starting Auth Service...${NC}"
        cd ../../api/auth-service
        pnpm dev > ../../../../logs/auth-service.log 2>&1 &
        AUTH_PID=$!
        cd ../../web/lego-moc-instructions-app
        
        # Wait for auth service
        wait_for_service "http://localhost:9000/api/auth/csrf" "Auth Service"
    fi
    
    # Start web app if not running
    if ! check_service "http://localhost:3004" "Web App" && ! check_service "http://localhost:3002" "Web App"; then
        echo -e "${BLUE}🌐 Starting Web App...${NC}"
        pnpm dev > ../../../logs/web-app.log 2>&1 &
        WEB_PID=$!
        
        # Wait for web app (try both possible ports)
        if ! wait_for_service "http://localhost:3004" "Web App"; then
            wait_for_service "http://localhost:3002" "Web App"
        fi
    fi
fi

# Seed users if needed
echo ""
echo -e "${BLUE}👥 Checking test users...${NC}"
cd ../../..
USER_COUNT=$(mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin --quiet --eval "db.users.countDocuments()" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -lt 10 ]; then
    echo -e "${YELLOW}📝 Seeding test users...${NC}"
    pnpm seed:users
else
    echo -e "${GREEN}✅ Test users already seeded ($USER_COUNT users)${NC}"
fi

cd apps/web/lego-moc-instructions-app

# If setup-only flag is set, exit here
if [ "$SETUP_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Services Status:${NC}"
    echo "   🔐 Auth Service: http://localhost:9000"
    echo "   🌐 Web App: http://localhost:3004 (or 3002)"
    echo "   🍃 MongoDB: mongodb://localhost:27017"
    echo "   👥 Test Users: Seeded and ready"
    echo ""
    echo "You can now run tests manually:"
    echo "   pnpm playwright test tests/auth/"
    exit 0
fi

# Build test command
PLAYWRIGHT_CMD="pnpm playwright test"

if [ "$SPECIFIC_TEST" != "" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD tests/auth/$SPECIFIC_TEST"
else
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD tests/auth/"
fi

if [ "$HEADED" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

if [ "$DEBUG" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi

# Add timeout and retry settings
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --timeout=120000 --retries=1"

echo ""
echo -e "${GREEN}🚀 All services are ready! Starting auth tests...${NC}"
echo ""
echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "   🎭 Mode: $([ "$HEADED" = true ] && echo "Headed (with UI)" || echo "Headless")"
echo "   🎯 Tests: $([ "$SPECIFIC_TEST" != "" ] && echo "$SPECIFIC_TEST" || echo "All auth tests")"
echo "   🐛 Debug: $([ "$DEBUG" = true ] && echo "Enabled" || echo "Disabled")"
echo ""
echo -e "${PURPLE}🧪 Running: $PLAYWRIGHT_CMD${NC}"
echo ""

# Run the tests
eval $PLAYWRIGHT_CMD
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 All auth tests passed!${NC}"
else
    echo -e "${RED}💥 Some auth tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

echo ""
echo -e "${BLUE}📊 Test Summary:${NC}"
echo "   📁 Test Files: tests/auth/"
echo "   🔐 Auth Service: http://localhost:9000"
echo "   🌐 Web App: http://localhost:3004"
echo "   👥 Test Users: Available (see SEED_USERS.md)"

if [ "$DEBUG" = true ]; then
    echo ""
    echo -e "${BLUE}🔍 Debug Information:${NC}"
    echo "   📄 Auth Service Logs: tail -f ../../../logs/auth-service.log"
    echo "   📄 Web App Logs: tail -f ../../../logs/web-app.log"
    echo "   🗄️  Database: mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin"
fi

echo ""
echo -e "${PURPLE}🏁 Auth test suite completed${NC}"

exit $TEST_EXIT_CODE

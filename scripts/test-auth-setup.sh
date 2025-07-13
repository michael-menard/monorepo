#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Auth Development Setup${NC}"

# Test 1: Check if scripts exist
echo -e "${BLUE}1. Checking script files...${NC}"
if [ -f "scripts/start-auth-dev.sh" ]; then
    echo -e "${GREEN}✅ start-auth-dev.sh exists${NC}"
else
    echo -e "${RED}❌ start-auth-dev.sh missing${NC}"
    exit 1
fi

if [ -f "scripts/stop-auth-dev.sh" ]; then
    echo -e "${GREEN}✅ stop-auth-dev.sh exists${NC}"
else
    echo -e "${RED}❌ stop-auth-dev.sh missing${NC}"
    exit 1
fi

# Test 2: Check if scripts are executable
echo -e "${BLUE}2. Checking script permissions...${NC}"
if [ -x "scripts/start-auth-dev.sh" ]; then
    echo -e "${GREEN}✅ start-auth-dev.sh is executable${NC}"
else
    echo -e "${RED}❌ start-auth-dev.sh is not executable${NC}"
    exit 1
fi

if [ -x "scripts/stop-auth-dev.sh" ]; then
    echo -e "${GREEN}✅ stop-auth-dev.sh is executable${NC}"
else
    echo -e "${RED}❌ stop-auth-dev.sh is not executable${NC}"
    exit 1
fi

# Test 3: Check if package.json scripts exist
echo -e "${BLUE}3. Checking package.json scripts...${NC}"
if grep -q "auth:start" package.json; then
    echo -e "${GREEN}✅ auth:start script exists${NC}"
else
    echo -e "${RED}❌ auth:start script missing${NC}"
    exit 1
fi

if grep -q "auth:stop-all" package.json; then
    echo -e "${GREEN}✅ auth:stop-all script exists${NC}"
else
    echo -e "${RED}❌ auth:stop-all script missing${NC}"
    exit 1
fi

# Test 4: Check if docker-compose.yml exists
echo -e "${BLUE}4. Checking docker-compose.yml...${NC}"
if [ -f "apps/api/auth-service/docker-compose.yml" ]; then
    echo -e "${GREEN}✅ docker-compose.yml exists${NC}"
else
    echo -e "${RED}❌ docker-compose.yml missing${NC}"
    exit 1
fi

# Test 5: Check if concurrently is installed
echo -e "${BLUE}5. Checking dependencies...${NC}"
if grep -q "concurrently" package.json; then
    echo -e "${GREEN}✅ concurrently dependency exists${NC}"
else
    echo -e "${RED}❌ concurrently dependency missing${NC}"
    exit 1
fi

# Test 6: Check if auth service package.json exists
echo -e "${BLUE}6. Checking auth service...${NC}"
if [ -f "apps/api/auth-service/package.json" ]; then
    echo -e "${GREEN}✅ auth service package.json exists${NC}"
else
    echo -e "${RED}❌ auth service package.json missing${NC}"
    exit 1
fi

# Test 7: Check if auth UI package.json exists
echo -e "${BLUE}7. Checking auth UI...${NC}"
if [ -f "apps/web/auth-ui-example/package.json" ]; then
    echo -e "${GREEN}✅ auth UI package.json exists${NC}"
else
    echo -e "${RED}❌ auth UI package.json missing${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All tests passed! Auth development setup is ready.${NC}"
echo -e "${BLUE}📋 To start the environment: pnpm auth:start${NC}"
echo -e "${BLUE}📋 To stop the environment: pnpm auth:stop-all${NC}"
echo -e "${YELLOW}💡 Make sure Docker is running before starting the environment${NC}" 
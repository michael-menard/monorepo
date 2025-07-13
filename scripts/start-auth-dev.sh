#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Auth Development Environment${NC}"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Check Docker
echo -e "${BLUE}🔍 Checking Docker...${NC}"
check_docker
echo -e "${GREEN}✅ Docker is running${NC}"

# Check ports
echo -e "${BLUE}🔍 Checking ports...${NC}"
check_port 27017 || echo -e "${YELLOW}⚠️  MongoDB port 27017 is in use${NC}"
check_port 8081 || echo -e "${YELLOW}⚠️  Mongo Express port 8081 is in use${NC}"
check_port 5000 || echo -e "${YELLOW}⚠️  Backend port 5000 is in use${NC}"
check_port 5173 || echo -e "${YELLOW}⚠️  Frontend port 5173 is in use${NC}"

# Start database
echo -e "${BLUE}🗄️  Starting MongoDB...${NC}"
cd apps/api/auth-service
if docker-compose up -d mongodb mongo-express; then
    echo -e "${GREEN}✅ MongoDB and Mongo Express started${NC}"
    echo -e "${BLUE}📊 Mongo Express available at: http://localhost:8081${NC}"
else
    echo -e "${RED}❌ Failed to start MongoDB${NC}"
    exit 1
fi

# Wait for MongoDB to be ready
echo -e "${BLUE}⏳ Waiting for MongoDB to be ready...${NC}"
sleep 5

# Start backend
echo -e "${BLUE}🔧 Starting Auth Backend...${NC}"
cd ../../..
if pnpm auth:backend &; then
    echo -e "${GREEN}✅ Backend started${NC}"
    echo -e "${BLUE}🔗 Backend available at: http://localhost:5000${NC}"
else
    echo -e "${RED}❌ Failed to start backend${NC}"
    exit 1
fi

# Wait a moment for backend to initialize
sleep 3

# Start frontend
echo -e "${BLUE}🎨 Starting Auth UI...${NC}"
if pnpm auth:ui &; then
    echo -e "${GREEN}✅ Frontend started${NC}"
    echo -e "${BLUE}🌐 Frontend available at: http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Failed to start frontend${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Auth development environment is ready!${NC}"
echo -e "${BLUE}📋 Services:${NC}"
echo -e "  • MongoDB: http://localhost:27017"
echo -e "  • Mongo Express: http://localhost:8081"
echo -e "  • Backend API: http://localhost:5000"
echo -e "  • Frontend UI: http://localhost:5173"
echo -e ""
echo -e "${YELLOW}💡 To stop all services, run: pnpm auth:stop${NC}"
echo -e "${YELLOW}💡 To view logs, run: pnpm auth:db:logs${NC}"

# Wait for user to stop
echo -e "${BLUE}⏳ Press Ctrl+C to stop all services...${NC}"
wait 
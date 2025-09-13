#!/bin/bash

# Start Full Development Environment
# This script starts all services needed for development:
# - Docker infrastructure services (MongoDB, PostgreSQL, Redis, Elasticsearch)
# - Auth API service
# - LEGO Projects API service  
# - LEGO MOC Instructions web app

set -e  # Exit on any error

echo "🚀 Starting Full Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all development servers...${NC}"
    
    # Kill background processes
    if [ ! -z "$AUTH_PID" ]; then
        kill $AUTH_PID 2>/dev/null || true
    fi
    if [ ! -z "$LEGO_API_PID" ]; then
        kill $LEGO_API_PID 2>/dev/null || true
    fi
    if [ ! -z "$WEB_APP_PID" ]; then
        kill $WEB_APP_PID 2>/dev/null || true
    fi
    
    # Stop Docker services
    echo -e "${BLUE}🐳 Stopping Docker infrastructure services...${NC}"
    docker-compose -f docker-compose.dev.yml down
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Step 1: Start Docker infrastructure services
echo -e "${BLUE}🐳 Starting Docker infrastructure services...${NC}"
echo "   - MongoDB (port 27017)"
echo "   - PostgreSQL (port 5432)" 
echo "   - Redis (port 6379)"
echo "   - Elasticsearch (port 9200)"
echo "   - Mongo Express (port 8081)"
echo "   - pgAdmin (port 8082)"
echo ""

docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for infrastructure services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"
docker-compose -f docker-compose.dev.yml ps

echo ""

# Step 2: Start Auth API service
echo -e "${GREEN}🔐 Starting Auth API service (port 9000)...${NC}"
cd apps/api/auth-service
pnpm dev > ../../../logs/auth-service.log 2>&1 &
AUTH_PID=$!
cd ../../..

# Wait for auth service to start
sleep 5

# Test auth service
if curl -s http://localhost:9000/api/auth/csrf > /dev/null; then
    echo -e "${GREEN}✅ Auth service is running on http://localhost:9000${NC}"
else
    echo -e "${YELLOW}⚠️  Auth service may still be starting...${NC}"
fi

echo ""

# Step 3: Start LEGO Projects API service
echo -e "${BLUE}🧱 Starting LEGO Projects API service (port 5000)...${NC}"
cd apps/api/lego-projects-api
pnpm dev > ../../../logs/lego-projects-api.log 2>&1 &
LEGO_API_PID=$!
cd ../../..

# Wait for LEGO API to start
sleep 5

echo ""

# Step 4: Start Web Application
echo -e "${YELLOW}🌐 Starting LEGO MOC Instructions web app...${NC}"
cd apps/web/lego-moc-instructions-app
pnpm dev &
WEB_APP_PID=$!
cd ../../..

# Wait for web app to start
sleep 8

echo ""
echo -e "${GREEN}🎉 Full Development Environment Started!${NC}"
echo ""
echo -e "${BLUE}📋 Service URLs:${NC}"
echo "   🌐 Web App:              http://localhost:3002 (or check terminal output)"
echo "   🔐 Auth API:             http://localhost:9000/api"
echo "   🧱 LEGO Projects API:    http://localhost:5000/api (if running)"
echo ""
echo -e "${BLUE}📊 Infrastructure Services:${NC}"
echo "   🍃 MongoDB:              mongodb://localhost:27017"
echo "   🐘 PostgreSQL:           postgresql://localhost:5432"
echo "   🔴 Redis:                redis://localhost:6379"
echo "   🔍 Elasticsearch:        http://localhost:9200"
echo "   🌿 Mongo Express:        http://localhost:8081"
echo "   🐘 pgAdmin:              http://localhost:8082"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo "   📄 Auth Service:         tail -f logs/auth-service.log"
echo "   📄 LEGO Projects API:    tail -f logs/lego-projects-api.log"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   • Run tests: pnpm test:e2e:auth"
echo "   • Check service status: docker-compose -f docker-compose.dev.yml ps"
echo "   • View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo -e "${RED}Press Ctrl+C to stop all services${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait for background processes and show their status
while true; do
    sleep 30
    
    # Check if processes are still running
    if ! kill -0 $AUTH_PID 2>/dev/null; then
        echo -e "${RED}❌ Auth service stopped unexpectedly${NC}"
        echo "Check logs: cat logs/auth-service.log"
    fi
    
    if ! kill -0 $WEB_APP_PID 2>/dev/null; then
        echo -e "${RED}❌ Web app stopped unexpectedly${NC}"
    fi
    
    # Optional: Check if LEGO API is running (it might fail due to missing dependencies)
    if [ ! -z "$LEGO_API_PID" ] && ! kill -0 $LEGO_API_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  LEGO Projects API stopped (this is expected if dependencies are missing)${NC}"
        LEGO_API_PID=""  # Don't check again
    fi
done

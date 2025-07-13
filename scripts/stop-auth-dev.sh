#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Auth Development Environment${NC}"

# Stop database
echo -e "${BLUE}🗄️  Stopping MongoDB...${NC}"
cd apps/api/auth-service
if docker-compose down; then
    echo -e "${GREEN}✅ MongoDB stopped${NC}"
else
    echo -e "${RED}❌ Failed to stop MongoDB${NC}"
fi

# Kill processes on ports
echo -e "${BLUE}🔧 Stopping backend and frontend...${NC}"
cd ../../..

# Kill processes on specific ports
for port in 5000 5173; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${BLUE}🔄 Killing process on port $port...${NC}"
        lsof -ti:$port | xargs kill -9
        echo -e "${GREEN}✅ Process on port $port stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  No process running on port $port${NC}"
    fi
done

echo -e "${GREEN}🎉 All auth development services stopped${NC}" 
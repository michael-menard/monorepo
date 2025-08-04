#!/bin/bash

echo "🚀 Starting Development Environment"
echo "=================================="

# Start infrastructure services
echo "📦 Starting database services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Infrastructure services are running!"
echo ""
echo "🌐 Access Points:"
echo "   • MongoDB: localhost:27017"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • Elasticsearch: http://localhost:9200"
echo "   • Mongo Express: http://localhost:8081"
echo "   • pgAdmin: http://localhost:8082"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start the frontend: cd apps/web/lego-moc-instructions-app && pnpm dev"
echo "   2. Start the auth service: cd apps/api/auth-service && pnpm dev"
echo "   3. Start the lego API: cd apps/api/lego-projects-api && pnpm dev"
echo ""
echo "💡 Or run all apps at once: pnpm dev"
echo ""
echo "🛑 To stop services: docker-compose -f docker-compose.dev.yml down" 
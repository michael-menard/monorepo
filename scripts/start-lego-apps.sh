#!/bin/bash

# Start LEGO MOC Apps Development Environment
# This script starts both the main app and documentation site

echo "🚀 Starting LEGO MOC Apps Development Environment..."

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Stopping development servers..."
    kill $MAIN_APP_PID $DOCS_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the main LEGO MOC app
echo "📱 Starting main LEGO MOC app on http://localhost:3000..."
cd apps/web/lego-moc-instructions-app
pnpm dev &
MAIN_APP_PID=$!

# Wait a moment for the main app to start
sleep 3

# Start the documentation site
echo "📚 Starting documentation site on http://localhost:3001..."
cd ../lego-moc-docs
pnpm start &
DOCS_PID=$!

echo "✅ Development environment started!"
echo ""
echo "🌐 Main App: http://localhost:3000"
echo "📖 Documentation: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait 
#!/bin/bash
echo "🌱 Starting Greenfield Development Workflow"
echo ""
echo "Recommended sequence:"
echo "1. Terminal 1 (Orchestrator): *workflow-start greenfield-fullstack"
echo "2. Terminal 2 (Planning): Follow orchestrator guidance"
echo "3. Terminal 3 (Stories): Create stories when planning complete"
echo "4. Terminal 4 (Dev): Implement stories"
echo "5. Terminal 5 (QA): Review and quality gates"
echo ""
echo "Press Enter to open orchestrator terminal..."
read
./scripts/terminal-orchestrator.sh

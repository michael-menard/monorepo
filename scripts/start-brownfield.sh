#!/bin/bash
echo "🏗️ Starting Brownfield Enhancement Workflow"
echo ""
echo "Recommended sequence:"
echo "1. Terminal 1 (Orchestrator): *workflow-start brownfield-fullstack"
echo "2. Terminal 2 (Planning): Analyze existing system"
echo "3. Terminal 3 (Stories): Create enhancement stories"
echo "4. Terminal 4 (Dev): Implement changes"
echo "5. Terminal 5 (QA): Integration testing and review"
echo ""
echo "Press Enter to open orchestrator terminal..."
read
./scripts/terminal-orchestrator.sh

#!/usr/bin/env bash

# Script: Run Vitest on affected packages
# Description: Uses Turbo's built-in change detection to run tests only on affected packages
# Usage: ./scripts/run-affected-tests.sh

set -e

echo "🧪 Running tests on affected packages..."

# Get staged files to show what's being tested
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "ℹ️  No staged files found. Skipping tests."
    exit 0
fi

echo "📁 Staged files:"
echo "$STAGED_FILES" | sed 's/^/   - /'
echo ""

# Use Turbo's built-in change detection to run tests on affected packages
# This compares against HEAD (the last commit) to find packages affected by staged changes
echo "🚀 Running Turbo test on packages affected by staged changes..."

# Use Turbo to run tests on affected packages
# The --filter="[HEAD]" syntax tells Turbo to run tests only on packages with direct changes since HEAD
if ! pnpm turbo test --filter="[HEAD]"; then
    echo ""
    echo "❌ Tests failed on affected packages!"
    echo ""
    echo "💡 To fix:"
    echo "   1. Review the test failures above"
    echo "   2. Fix the failing tests"
    echo "   3. Stage your fixes: git add ."
    echo "   4. Try committing again"
    echo ""
    echo "🔧 To run tests manually:"
    echo "   pnpm turbo test --filter=\"[HEAD]\""
    echo ""
    exit 1
fi

echo ""
echo "✅ All tests passed on affected packages!"

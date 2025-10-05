#!/usr/bin/env bash

# Script: Run Vitest on affected packages
# Description: Uses Turbo to run tests only on packages affected by staged changes
# Usage: ./scripts/run-affected-tests.sh

set -e

echo "🧪 Running tests on affected packages..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "ℹ️  No staged files found. Skipping tests."
    exit 0
fi

echo "📁 Staged files:"
echo "$STAGED_FILES" | sed 's/^/   - /'
echo ""

# Check if any staged files are in packages that have tests
HAS_TEST_FILES=false

# Check for test files or source files in packages with tests
for file in $STAGED_FILES; do
    # Check if file is in a package directory
    if [[ "$file" =~ ^(packages|apps)/ ]]; then
        # Extract package path
        PACKAGE_DIR=$(echo "$file" | cut -d'/' -f1-3)
        
        # Check if package has test configuration
        if [ -f "$PACKAGE_DIR/vitest.config.ts" ] || [ -f "$PACKAGE_DIR/jest.config.js" ] || [ -f "$PACKAGE_DIR/package.json" ]; then
            # Check if package.json has test script
            if grep -q '"test"' "$PACKAGE_DIR/package.json" 2>/dev/null; then
                HAS_TEST_FILES=true
                echo "📦 Found testable package: $PACKAGE_DIR"
            fi
        fi
    fi
done

if [ "$HAS_TEST_FILES" = false ]; then
    echo "ℹ️  No testable packages affected by staged changes. Skipping tests."
    exit 0
fi

echo ""
echo "🚀 Running Turbo test on affected packages..."

# Use Turbo to run tests on affected packages
# The --filter flag with [HEAD^1] will run tests on packages affected since the last commit
if ! pnpm turbo test --filter="...[HEAD^1]" --no-cache; then
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
    echo "   pnpm turbo test --filter=\"...[HEAD^1]\""
    echo ""
    exit 1
fi

echo ""
echo "✅ All tests passed on affected packages!"

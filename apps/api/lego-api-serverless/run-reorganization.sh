#!/bin/bash

# Master script to execute all reorganization steps
# Base directory: /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless

set -e  # Exit on error

BASE_DIR="/Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless"
cd "$BASE_DIR"

echo "========================================="
echo "Directory Reorganization Master Script"
echo "========================================="
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "WARNING: You have uncommitted changes in your git repository."
    echo "It's recommended to commit or stash your changes before proceeding."
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

echo "Step 1/3: Running directory reorganization..."
echo "---------------------------------------------"
if [ -f "./reorganize-structure.sh" ]; then
    chmod +x ./reorganize-structure.sh
    ./reorganize-structure.sh
    echo "✓ Directory reorganization complete"
else
    echo "✗ reorganize-structure.sh not found!"
    exit 1
fi

echo ""
echo "Step 2/3: Updating import paths..."
echo "-----------------------------------"
if [ -f "./update-imports.py" ]; then
    chmod +x ./update-imports.py
    python3 ./update-imports.py
    echo "✓ Import paths updated"
elif [ -f "./update-import-paths.sh" ]; then
    echo "Python script not found, using bash fallback..."
    chmod +x ./update-import-paths.sh
    ./update-import-paths.sh
    echo "✓ Import paths updated (bash)"
else
    echo "✗ No import update script found!"
    exit 1
fi

echo ""
echo "Step 3/3: Verifying changes..."
echo "-------------------------------"

# Check for any remaining old import paths
echo "Checking for remaining old import paths..."
REMAINING_OLD_IMPORTS=$(grep -r "@/lib/" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l || echo "0")

if [ "$REMAINING_OLD_IMPORTS" -gt 0 ]; then
    echo "⚠ Warning: Found $REMAINING_OLD_IMPORTS file(s) with old @/lib/ imports"
    echo "Run: grep -r \"@/lib/\" --include=\"*.ts\" --exclude-dir=node_modules ."
else
    echo "✓ No old @/lib/ imports found"
fi

# Check TypeScript compilation
echo ""
echo "Checking TypeScript compilation..."
if command -v pnpm &> /dev/null; then
    if pnpm check-types; then
        echo "✓ TypeScript compilation successful"
    else
        echo "✗ TypeScript compilation failed"
        echo "Please review the errors above"
    fi
else
    echo "⚠ pnpm not found, skipping TypeScript check"
fi

echo ""
echo "========================================="
echo "Reorganization Complete!"
echo "========================================="
echo ""
echo "Summary of changes:"
echo "  • Created functions/ and core/ directories"
echo "  • Moved Lambda handlers to functions/"
echo "  • Moved shared code to core/"
echo "  • Updated tsconfig.json"
echo "  • Updated drizzle.config.ts"
echo "  • Updated sst.config.ts"
echo "  • Updated all import paths"
echo ""
echo "Next steps:"
echo "  1. Review git status: git status"
echo "  2. Run tests: pnpm test"
echo "  3. Build project: pnpm build"
echo "  4. Commit changes: git add . && git commit -m \"Reorganize directory structure\""
echo ""

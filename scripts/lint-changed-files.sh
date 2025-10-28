#!/bin/bash

# Script to lint only changed files
# Usage: ./scripts/lint-changed-files.sh [base-commit]

set -e

# Ensure we're using bash (not sh)
if [ -z "$BASH_VERSION" ]; then
    echo "This script requires bash. Please run with: bash $0"
    exit 1
fi

# Default to comparing with HEAD~1 if no base commit provided
BASE_COMMIT=${1:-HEAD~1}

echo "🔍 Finding changed TypeScript/JavaScript files since $BASE_COMMIT..."

# Get list of changed files
CHANGED_FILES=$(git diff --name-only $BASE_COMMIT HEAD | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -z "$CHANGED_FILES" ]; then
    echo "✅ No TypeScript/JavaScript files changed since $BASE_COMMIT"
    exit 0
fi

echo "📁 Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'
echo ""

# Separate files by package for targeted linting
LEGO_APP_FILES=""
UI_FILES=""
AUTH_FILES=""
OTHER_FILES=""

while IFS= read -r file; do
    if [[ $file == apps/web/lego-moc-instructions-app/* ]]; then
        LEGO_APP_FILES="$LEGO_APP_FILES $file"
    elif [[ $file == packages/core/ui/* ]]; then
        UI_FILES="$UI_FILES $file"
    elif [[ $file == packages/core/auth/* ]]; then
        AUTH_FILES="$AUTH_FILES $file"
    else
        OTHER_FILES="$OTHER_FILES $file"
    fi
done <<< "$CHANGED_FILES"

# Lint LEGO app files
if [ -n "$LEGO_APP_FILES" ]; then
    echo "🔍 Linting LEGO app files..."
    echo "  Files:$LEGO_APP_FILES"
    cd apps/web/lego-moc-instructions-app
    # Convert to relative paths
    relative_files=$(echo $LEGO_APP_FILES | sed 's|apps/web/lego-moc-instructions-app/||g')
    if npx eslint $relative_files --fix; then
        echo "  ✅ LEGO app linting passed"
    else
        echo "  ❌ LEGO app linting failed"
        exit 1
    fi
    cd - > /dev/null
    echo ""
fi

# Lint UI package files
if [ -n "$UI_FILES" ]; then
    echo "🔍 Linting UI package files..."
    echo "  Files:$UI_FILES"
    cd packages/core/ui
    relative_files=$(echo $UI_FILES | sed 's|packages/core/ui/||g')
    if npx eslint $relative_files --fix --max-warnings 0; then
        echo "  ✅ UI package linting passed"
    else
        echo "  ❌ UI package linting failed"
        exit 1
    fi
    cd - > /dev/null
    echo ""
fi

# Lint Auth package files
if [ -n "$AUTH_FILES" ]; then
    echo "🔍 Linting Auth package files..."
    echo "  Files:$AUTH_FILES"
    cd packages/core/auth
    relative_files=$(echo $AUTH_FILES | sed 's|packages/core/auth/||g')
    if npx eslint $relative_files --fix --max-warnings 0; then
        echo "  ✅ Auth package linting passed"
    else
        echo "  ❌ Auth package linting failed"
        exit 1
    fi
    cd - > /dev/null
    echo ""
fi

# Lint other files
if [ -n "$OTHER_FILES" ]; then
    echo "🔍 Linting other files..."
    echo "  Files:$OTHER_FILES"
    if npx eslint $OTHER_FILES --fix; then
        echo "  ✅ Other files linting passed"
    else
        echo "  ❌ Other files linting failed"
        exit 1
    fi
    echo ""
fi

echo "✅ All changed files passed linting!"

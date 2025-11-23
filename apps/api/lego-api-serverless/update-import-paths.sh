#!/bin/bash

# Script to update import paths after directory reorganization
# Base directory: /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless

set -e  # Exit on error

BASE_DIR="/Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless"
cd "$BASE_DIR"

echo "=== Updating import paths throughout codebase ==="

# Find all TypeScript files (excluding node_modules, dist, .sst)
find . -type f -name "*.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/.sst/*" \
  -not -path "*/.build/*" | while read -r file; do

  echo "Processing: $file"

  # Create a backup
  cp "$file" "$file.bak"

  # Update import paths using sed
  # @/lib/db/ → @/db/
  sed -i '' "s|from '@/lib/db/|from '@/db/|g" "$file"
  sed -i '' "s|import '@/lib/db/|import '@/db/|g" "$file"

  # @/lib/services/ → @/services/
  sed -i '' "s|from '@/lib/services/|from '@/services/|g" "$file"
  sed -i '' "s|import '@/lib/services/|import '@/services/|g" "$file"

  # @/lib/cache/ → @/clients/cache/
  sed -i '' "s|from '@/lib/cache/|from '@/clients/cache/|g" "$file"
  sed -i '' "s|import '@/lib/cache/|import '@/clients/cache/|g" "$file"

  # @/lib/search/ → @/clients/search/
  sed -i '' "s|from '@/lib/search/|from '@/clients/search/|g" "$file"
  sed -i '' "s|import '@/lib/search/|import '@/clients/search/|g" "$file"

  # @/lib/storage/ → @/clients/storage/
  sed -i '' "s|from '@/lib/storage/|from '@/clients/storage/|g" "$file"
  sed -i '' "s|import '@/lib/storage/|import '@/clients/storage/|g" "$file"

  # @/lib/validation/ → @/validation/
  sed -i '' "s|from '@/lib/validation/|from '@/validation/|g" "$file"
  sed -i '' "s|import '@/lib/validation/|import '@/validation/|g" "$file"

  # @/lib/utils/ → @/utils/
  sed -i '' "s|from '@/lib/utils/|from '@/utils/|g" "$file"
  sed -i '' "s|import '@/lib/utils/|import '@/utils/|g" "$file"

  # Fix relative imports in health/index.ts (if it still uses ../lib/)
  sed -i '' "s|from '../lib/utils/|from '@/utils/|g" "$file"
  sed -i '' "s|import '../lib/utils/|import '@/utils/|g" "$file"

  # Remove backup if file was changed
  if cmp -s "$file" "$file.bak"; then
    rm "$file.bak"
  else
    echo "  Updated: $file"
    rm "$file.bak"
  fi
done

echo "=== Import path updates complete! ==="

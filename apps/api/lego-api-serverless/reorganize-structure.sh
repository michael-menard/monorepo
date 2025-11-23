#!/bin/bash

# Script to reorganize lego-api-serverless directory structure
# Base directory: /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless

set -e  # Exit on error

BASE_DIR="/Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless"
cd "$BASE_DIR"

echo "=== Step 1: Creating new directory structure ==="
mkdir -p functions
mkdir -p core/db
mkdir -p core/services
mkdir -p core/clients/cache
mkdir -p core/clients/search
mkdir -p core/clients/storage
mkdir -p core/validation
mkdir -p core/utils
mkdir -p core/types

echo "=== Step 2: Moving Lambda handler directories to functions/ ==="
# Use git mv to preserve history
git mv gallery functions/gallery
git mv wishlist functions/wishlist
git mv mocInstructions functions/moc-instructions
git mv moc-parts-lists functions/moc-parts-lists
git mv health functions/health

echo "=== Step 3: Moving src/db/ to core/db/ ==="
git mv src/db/* core/db/

echo "=== Step 4: Moving src/lib/ contents to core/ subdirectories ==="
# Move services
git mv src/lib/services/* core/services/

# Move cache
git mv src/lib/cache/* core/clients/cache/

# Move search
git mv src/lib/search/* core/clients/search/

# Move storage
git mv src/lib/storage/* core/clients/storage/

# Move validation
git mv src/lib/validation/* core/validation/

# Move utils
git mv src/lib/utils/* core/utils/

echo "=== Step 5: Moving src/types/ to core/types/ ==="
git mv src/types/* core/types/

echo "=== Step 6: Moving src/__tests__/ to root __tests__/ ==="
git mv src/__tests__ __tests__

echo "=== Step 7: Removing migrated and empty directories ==="
# Remove empty src/lib subdirectories
rmdir src/lib/services || true
rmdir src/lib/cache || true
rmdir src/lib/search || true
rmdir src/lib/storage || true
rmdir src/lib/validation || true
rmdir src/lib/utils || true
rmdir src/lib/db || true
rmdir src/types || true

# Remove migrated packages (already in monorepo packages)
rm -rf src/lib/errors
rm -rf src/lib/responses
rm -rf src/lib/cognito
rm -rf src/lib/middleware

# Remove migrated individual files (already in monorepo packages)
rm -f core/services/image-processing.ts
rm -f core/utils/multipart-parser.ts
rm -f core/utils/cloudwatch-metrics.ts

# Remove empty src/lib and src directories
rmdir src/lib || true
rmdir src || true

echo "=== Directory reorganization complete! ==="
echo ""
echo "Next steps:"
echo "1. Update tsconfig.json paths"
echo "2. Update import paths throughout the codebase"
echo "3. Update drizzle.config.ts"
echo "4. Run tests to verify everything works"

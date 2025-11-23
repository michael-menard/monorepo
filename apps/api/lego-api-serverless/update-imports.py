#!/usr/bin/env python3
"""
Script to update import paths after directory reorganization.
Handles both single-line and multi-line imports.
"""

import os
import re
from pathlib import Path

# Base directory
BASE_DIR = Path("/Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless")

# Import path mappings (order matters - more specific first)
IMPORT_MAPPINGS = [
    (r"from '@/lib/db/", r"from '@/db/"),
    (r"import '@/lib/db/", r"import '@/db/"),
    (r"from '@/lib/services/", r"from '@/services/"),
    (r"import '@/lib/services/", r"import '@/services/"),
    (r"from '@/lib/cache/", r"from '@/clients/cache/"),
    (r"import '@/lib/cache/", r"import '@/clients/cache/"),
    (r"from '@/lib/search/", r"from '@/clients/search/"),
    (r"import '@/lib/search/", r"import '@/clients/search/"),
    (r"from '@/lib/storage/", r"from '@/clients/storage/"),
    (r"import '@/lib/storage/", r"import '@/clients/storage/"),
    (r"from '@/lib/validation/", r"from '@/validation/"),
    (r"import '@/lib/validation/", r"import '@/validation/"),
    (r"from '@/lib/utils/", r"from '@/utils/"),
    (r"import '@/lib/utils/", r"import '@/utils/"),
    # Fix relative imports (e.g., in health/index.ts)
    (r"from '../lib/utils/", r"from '@/utils/"),
    (r"import '../lib/utils/", r"import '@/utils/"),
    (r"from '../lib/db/", r"from '@/db/"),
    (r"import '../lib/db/", r"import '@/db/"),
    (r"from '../lib/cache/", r"from '@/clients/cache/"),
    (r"import '../lib/cache/", r"import '@/clients/cache/"),
    (r"from '../lib/search/", r"from '@/clients/search/"),
    (r"import '../lib/search/", r"import '@/clients/search/"),
    (r"from '../lib/storage/", r"from '@/clients/storage/"),
    (r"import '../lib/storage/", r"import '@/clients/storage/"),
]

def find_typescript_files(base_dir):
    """Find all TypeScript files, excluding node_modules, dist, etc."""
    exclude_dirs = {'node_modules', 'dist', '.sst', '.build', '.git'}

    for root, dirs, files in os.walk(base_dir):
        # Remove excluded directories from search
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if file.endswith('.ts'):
                yield Path(root) / file

def update_imports_in_file(file_path):
    """Update import paths in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply all import mappings
        for old_pattern, new_pattern in IMPORT_MAPPINGS:
            content = content.replace(old_pattern, new_pattern)

        # If content changed, write it back
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated: {file_path.relative_to(BASE_DIR)}")
            return True

        return False

    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

def main():
    print("=== Updating import paths throughout codebase ===\n")

    files_updated = 0
    files_processed = 0

    for file_path in find_typescript_files(BASE_DIR):
        files_processed += 1
        if update_imports_in_file(file_path):
            files_updated += 1

    print(f"\n=== Import path updates complete! ===")
    print(f"Files processed: {files_processed}")
    print(f"Files updated: {files_updated}")

if __name__ == "__main__":
    main()

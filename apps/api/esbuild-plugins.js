/**
 * esbuild plugins for Serverless Framework
 * Handles TypeScript path alias resolution (@/core/*, @/endpoints/*, etc.)
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve a path, trying common TypeScript extensions and directory index files
 */
function resolveWithExtensions(basePath) {
  // Check if it's a directory first (to find index.ts)
  try {
    const stats = statSync(basePath);
    if (stats.isDirectory()) {
      // Look for index files in the directory
      const indexExtensions = ['index.ts', 'index.tsx', 'index.js'];
      for (const indexFile of indexExtensions) {
        const indexPath = resolve(basePath, indexFile);
        if (existsSync(indexPath)) {
          return indexPath;
        }
      }
    }
  } catch {
    // Not a directory or doesn't exist, continue with extension resolution
  }

  // If path already has an extension that exists, use it
  if (existsSync(basePath)) {
    return basePath;
  }

  // Try common extensions
  const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js'];
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Return original path if nothing found (will error, but at least we tried)
  return basePath;
}

// Path alias plugin for resolving @/ imports
const pathAliasPlugin = {
  name: 'path-alias',
  setup(build) {
    // Map @/core/* to ./core/*
    build.onResolve({ filter: /^@\/core\// }, (args) => {
      const relativePath = args.path.replace('@/core/', '');
      const basePath = resolve(__dirname, 'core', relativePath);
      return {
        path: resolveWithExtensions(basePath),
      };
    });

    // Map @/endpoints/* to ./endpoints/*
    build.onResolve({ filter: /^@\/endpoints\// }, (args) => {
      const relativePath = args.path.replace('@/endpoints/', '');
      const basePath = resolve(__dirname, 'endpoints', relativePath);
      return {
        path: resolveWithExtensions(basePath),
      };
    });

    // Map @/infrastructure/* to ./infrastructure/*
    build.onResolve({ filter: /^@\/infrastructure\// }, (args) => {
      const relativePath = args.path.replace('@/infrastructure/', '');
      const basePath = resolve(__dirname, 'infrastructure', relativePath);
      return {
        path: resolveWithExtensions(basePath),
      };
    });
  },
};

export default [pathAliasPlugin];

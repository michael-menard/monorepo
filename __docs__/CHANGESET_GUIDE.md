# Changeset Guide

This monorepo uses [Changesets](https://github.com/changesets/changesets) for semantic versioning and release management of packages.

## Overview

Changesets allows us to:
- Track changes to packages in a monorepo
- Automatically generate changelogs
- Publish packages to npm with proper versioning
- Create release pull requests

## Setup

The changeset configuration is located in `.changeset/config.json`:

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["apps/**/*"]
}
```

## Available Scripts

- `pnpm changeset` - Create a new changeset
- `pnpm version` - Update package versions based on changesets
- `pnpm release` - Build and publish packages

## Workflow

### 1. Making Changes

When you make changes to packages, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
- Select which packages have changed
- Choose the type of change (major, minor, patch)
- Write a description of the changes

### 2. Versioning

After creating changesets, update package versions:

```bash
pnpm version
```

This will:
- Update package.json versions
- Generate changelog entries
- Remove the changeset files

### 3. Publishing

To publish packages to npm:

```bash
pnpm release
```

This will:
- Build all packages
- Publish to npm registry
- Create git tags

## Automated Releases

The GitHub Actions workflow (`.github/workflows/release.yml`) automatically:
- Creates release pull requests when changesets are added
- Publishes packages when changesets are merged to main
- Updates changelogs and versions

## Package Configuration

All packages in the `packages/` directory are configured for publishing:
- Removed `"private": true` from package.json files
- Set proper version numbers (starting from 0.0.0)
- Configured exports and entry points

## Ignored Packages

Apps in the `apps/` directory are ignored by changesets since they are not published packages.

## Best Practices

1. **Always create a changeset** when making changes to packages
2. **Use semantic versioning**:
   - `patch` for bug fixes
   - `minor` for new features (backward compatible)
   - `major` for breaking changes
3. **Write clear changelog entries** that describe what changed
4. **Test packages locally** before publishing
5. **Review release pull requests** before merging

## Troubleshooting

### Package not found in changeset selection
Make sure the package.json doesn't have `"private": true` and is in the packages directory.

### Version conflicts
Run `pnpm install` after versioning to update workspace dependencies.

### Publishing fails
Check that:
- NPM_TOKEN is set in GitHub secrets
- Package names are unique and available on npm
- All dependencies are properly declared 
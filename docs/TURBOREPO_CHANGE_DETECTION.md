# Turborepo Change Detection for Linting

This document explains how we use Turborepo's change detection to optimize linting, testing, and building in our monorepo.

## 🎯 **Why Change Detection?**

Instead of linting/testing the entire codebase every time, we only run checks on packages that have actually changed. This provides:

- ⚡ **Faster CI/CD** - Only check what's changed
- 🎯 **Focused feedback** - See only relevant errors
- 💰 **Reduced costs** - Less compute time in CI
- 🧑‍💻 **Better DX** - Faster local development

## 🔧 **How It Works**

Turborepo uses Git to detect which packages have changed files and only runs tasks on those packages (and their dependents).

### **Filter Patterns:**

```bash
# Changed since last commit
--filter="...[HEAD^1]"

# Changed since main branch  
--filter="...[origin/main]"

# Specific package only
--filter="@repo/ui"

# All packages (old way)
# No filter = everything
```

## 📋 **Updated Commands**

### **Main Commands (Now Use Change Detection by Default):**

```bash
# Lint only changed packages (new default)
pnpm lint

# Type check only changed packages (new default)  
pnpm check-types

# Test only changed packages (new default)
pnpm test
```

### **Full Codebase Commands (When Needed):**

```bash
# Lint entire codebase
pnpm lint:all

# Type check entire codebase
pnpm check-types:all

# Test entire codebase
pnpm test:all
```

### **Specific Change Detection Commands:**

```bash
# Changed since last commit
pnpm lint:changed

# Changed since main branch
pnpm lint:changed:main
```

## 🚀 **Workflows Updated**

### **1. Pre-commit Hook (.husky/pre-commit)**
- ✅ Lints changed packages: `pnpm turbo lint --filter="...[HEAD]"`
- ✅ Builds changed packages: `pnpm turbo build --filter="...[HEAD]"`
- ✅ Formats files: `lint-staged` (file-level)

### **2. Pre-push Hook (.husky/pre-push)**  
- ✅ Already optimized with change detection

### **3. GitHub Actions**

**CI Workflow (.github/workflows/ci.yml):**
- ✅ `pnpm turbo lint --filter="...[HEAD^1]"`
- ✅ `pnpm turbo check-types --filter="...[HEAD^1]"`
- ✅ `pnpm turbo test --filter="./packages/*...[HEAD^1]"`

**CodeRabbit Integration:**
- ✅ `pnpm turbo lint --filter="...[origin/main]"`
- ✅ `pnpm turbo check-types --filter="...[origin/main]"`

**App-specific Workflows:**
- ✅ Already use specific filters like `--filter="@repo/api-auth-service"`

### **4. lint-staged (.lintstagedrc.js)**
- ✅ Only runs Prettier (formatting) on individual files
- ✅ Linting handled by Turborepo in pre-commit hook

## 🎯 **Development Workflow**

### **Daily Development:**
```bash
# Work on your changes
git add .

# Pre-commit automatically runs:
# - Formats changed files (lint-staged)  
# - Lints changed packages (Turborepo)
# - Builds changed packages (Turborepo)
git commit -m "your changes"

# Pre-push runs full quality checks on changed packages
git push
```

### **Manual Quality Checks:**
```bash
# Quick check (changed packages only)
pnpm lint
pnpm check-types  
pnpm test

# Full check (entire codebase)
pnpm lint:all
pnpm check-types:all
pnpm test:all
```

### **CI/CD:**
- **Pull Requests**: Only checks packages changed vs `origin/main`
- **Main Branch**: Runs full checks for releases
- **App Deployments**: Only checks specific app packages

## 🔍 **Debugging**

### **See What Will Be Checked:**
```bash
# Dry run to see which packages would be linted
pnpm turbo lint --filter="...[HEAD^1]" --dry-run
```

### **Force Full Check:**
```bash
# When you need to check everything
pnpm lint:all
pnpm check-types:all
pnpm test:all
```

### **Check Specific Package:**
```bash
# Lint just one package
pnpm turbo lint --filter="@repo/ui"
```

## 📊 **Performance Impact**

**Before (Full Codebase):**
- 🐌 Lint: ~2-3 minutes
- 🐌 CI: ~5-8 minutes  
- 🐌 Pre-commit: ~30-60 seconds

**After (Change Detection):**
- ⚡ Lint: ~10-30 seconds
- ⚡ CI: ~1-3 minutes
- ⚡ Pre-commit: ~5-15 seconds

## 🎉 **Benefits**

1. **Faster Development** - Only see errors for code you're working on
2. **Faster CI** - PRs complete much quicker
3. **Better Focus** - No noise from unrelated packages
4. **Cost Savings** - Less compute time in CI/CD
5. **Scalability** - Performance stays good as monorepo grows

## 🔧 **Troubleshooting**

**If you need to lint everything:**
```bash
pnpm lint:all
```

**If change detection seems wrong:**
```bash
# Check what Turborepo thinks changed
pnpm turbo lint --filter="...[HEAD^1]" --dry-run
```

**If you want the old behavior:**
```bash
# Use the :all variants
pnpm lint:all
pnpm check-types:all  
pnpm test:all
```

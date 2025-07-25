# 📦 Dependency Management in Monorepo

This guide explains how to manage dependencies consistently across your monorepo.

## 🎯 Strategies for Consistent Dependencies

### **1. Root-Level Dependencies (Recommended)**

Dependencies added to the root `package.json` are available to all packages but **you still need to declare them in each package's `package.json`**.

```json
// Root package.json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "framer-motion": "^12.23.3"
  }
}
```

**✅ Pros:**
- Single source of truth for versions
- Easy to update all packages at once
- Prevents version conflicts

**❌ Cons:**
- You still need to declare dependencies in each package
- Can lead to bloat if not managed carefully

### **2. Shared Config Package**

Use `@repo/shared-config` to define standard dependencies:

```json
// packages/shared-config/react.json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

### **3. Sync Script**

Run the sync script to ensure all packages have consistent dependencies:

```bash
pnpm run sync-deps
```

This will:
- ✅ Update React to `^19.1.0` across all packages
- ✅ Update Tailwind dependencies
- ✅ Update common UI libraries
- ✅ Ensure TypeScript versions match

## 🚀 How to Use

### **For New Packages:**

1. **Copy the template:**
   ```bash
   cp -r packages/template packages/my-new-package
   ```

2. **Update the name in package.json:**
   ```json
   {
     "name": "@repo/my-new-package"
   }
   ```

3. **Install dependencies:**
   ```bash
   cd packages/my-new-package
   pnpm install
   ```

4. **Add your specific dependencies:**
   ```bash
   pnpm add my-specific-dependency
   ```

5. **Run tests to verify setup:**
   ```bash
   pnpm test
   pnpm check-types
   pnpm lint
   ```

### **For Existing Packages:**

1. **Sync dependencies:**
   ```bash
   pnpm run sync-deps
   ```

2. **Install updated dependencies:**
   ```bash
   pnpm install
   ```

3. **Verify everything works:**
   ```bash
   pnpm run build
   ```

## 📋 Standard Dependencies

### **Template Packages (Recommended Starting Points):**

#### **Frontend Template (`packages/template`):**
- ✅ **React 19** with TypeScript
- ✅ **Vitest** for fast testing
- ✅ **Redux Toolkit (RTK)** for state management
- ✅ **Testing Library** for component testing
- ✅ **Framer Motion** for animations
- ✅ **Shadcn/ui utilities**

#### **Backend Template (`packages/template-backend`):**
- ✅ **PostgreSQL** with Prisma ORM
- ✅ **GraphQL** schema for AppSync
- ✅ **TypeScript** with type safety
- ✅ **Vitest** for fast testing
- ✅ **Validation** (Zod)
- ✅ **Prisma Studio** for database GUI

### **React Apps/Packages:**
```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "framer-motion": "^12.23.3"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0"
  }
}
```

### **UI Components:**
```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "lucide-react": "^0.468.0"
  }
}
```

### **Backend Services:**
```json
{
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "graphql": "^16.8.1",
    "zod": "^4.0.5"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "prisma": "^5.22.0",
    "tsx": "^4.19.2"
  }
}
```

## 🔧 Best Practices

### **1. Always Declare Dependencies**
Even if a dependency is in the root, declare it in your package's `package.json`:

```json
// ✅ Good
{
  "dependencies": {
    "react": "^19.1.0",
    "my-specific-lib": "^1.0.0"
  }
}
```

### **2. Use Exact Versions for Critical Dependencies**
```json
{
  "dependencies": {
    "react": "19.1.0",  // Exact version
    "typescript": "5.8.3"  // Exact version
  }
}
```

### **3. Use Workspace References**
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*"
  }
}
```

### **4. Regular Sync**
Run the sync script monthly or when adding new common dependencies:

```bash
pnpm run sync-deps
pnpm install
pnpm run build
```

## 🚨 Common Issues

### **Issue: "Module not found"**
**Solution:** Add the dependency to your package's `package.json`

### **Issue: Version conflicts**
**Solution:** Run `pnpm run sync-deps` to standardize versions

### **Issue: TypeScript errors**
**Solution:** Ensure `@types/*` packages are in `devDependencies`

## 📝 Checklist for New Packages

- [ ] Copy from `packages/template`
- [ ] Update package name
- [ ] Add specific dependencies
- [ ] Run `pnpm install`
- [ ] Run `pnpm run build`
- [ ] Run `pnpm run lint`
- [ ] Test the package

## 🔄 Maintenance

### **Monthly:**
1. Run `pnpm run sync-deps`
2. Update dependencies in root `package.json`
3. Run `pnpm install`
4. Test all packages

### **When Adding New Common Dependencies:**
1. Add to root `package.json`
2. Add to `scripts/sync-dependencies.js`
3. Run `pnpm run sync-deps`
4. Update all packages that need it 
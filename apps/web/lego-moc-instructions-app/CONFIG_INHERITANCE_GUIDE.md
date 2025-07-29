# Monorepo Config Inheritance & Extension Guide

This guide explains how to ensure your app (`lego-moc-instructions-app`) leverages all available configuration from the root of the monorepo. Use this as a reference for best practices and actionable steps.

---

## Why Inherit or Extend Configs?
- **Consistency:** All apps/packages follow the same rules and conventions.
- **Maintainability:** Update config in one place, propagate everywhere.
- **Scalability:** Add new apps/packages with minimal config duplication.

---

## 1. TypeScript (`tsconfig.json`)

**Best Practice:**
- If allowed, inherit from the root config:
  ```json
  {
    "extends": "../../tsconfig.json",
    "include": ["src", ...],
    "compilerOptions": {
      // app-specific overrides
    }
  }
  ```
- If not, copy all relevant root settings and keep in sync.

---

## 2. Vite (`vite.config.ts`)

**Best Practice:**
- Create a shared config in the root (e.g. `vite.config.base.ts`).
- In your app:
  ```ts
  import baseConfig from '../../vite.config.base'
  import { defineConfig } from 'vite'
  export default defineConfig({
    ...baseConfig,
    // app-specific overrides
  })
  ```
- If not, ensure all root-level plugins, aliases, and settings are present.

---

## 3. Tailwind CSS (`tailwind.config.js`)

**Best Practice:**
- Create a shared config in the root (e.g. `tailwind.config.base.js`).
- In your app:
  ```js
  import base from '../../tailwind.config.base'
  export default {
    ...base,
    content: [
      ...base.content,
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    // app-specific overrides
  }
  ```
- If not, copy theme/plugins and keep in sync.

---

## 4. ESLint (`eslint.config.js`)

**Best Practice:**
- Import and spread the root config:
  ```js
  import base from '../../eslint.config.js'
  export default [
    ...base,
    // app-specific rules
  ]
  ```

---

## 5. Prettier (`prettier.config.js`)

**Best Practice:**
- Reference or symlink the root config:
  - `ln -s ../../prettier.config.js ./prettier.config.js`
- Or import and extend if using ESM.

---

## 6. Vitest/Jest (`vitest.config.ts`)

**Best Practice:**
- Import and extend the root config:
  ```ts
  import base from '../../vitest.config'
  export default {
    ...base,
    // app-specific overrides
  }
  ```

---

## 7. Backend API Integration

**Best Practice:**
- Configure API endpoints based on environment (dev vs prod).
- Use environment variables for API URLs when possible.
- Ensure proper CORS configuration on the backend.
- Integrate with shared authentication packages.

---

## 8. Path Aliases
- Ensure all path aliases in `tsconfig.json` and `vite.config.ts` match the root config for consistency.

---

## 9. Symlinks (Optional)
- For configs that should always be in sync, symlink the root config files into your app directory.

---

## Summary Table

| Config         | Inherit/Extend from Root? | How to do it?                                 |
|----------------|--------------------------|------------------------------------------------|
| TypeScript     | Yes (if allowed)         | `"extends": "../../tsconfig.json"`             |
| Vite           | Yes                      | Import and spread root config                  |
| Tailwind       | Yes                      | Import and spread root config                  |
| ESLint         | Yes                      | Import and spread root config                  |
| Prettier       | Yes                      | Reference or symlink root config               |
| Vitest/Jest    | Yes                      | Import and extend root config                  |
| Backend API    | Yes                      | Configure environment-based endpoints          |

---

## Actionable Steps
1. **Decide** if you want to inherit/extend or keep configs standalone.
2. **Create shared configs** in the monorepo root if not already present.
3. **Update your app’s configs** to import/extend from the root as shown above.
4. **Keep configs in sync** if you choose to copy instead of extend.
5. **Document any app-specific overrides** in your local config files.

---

**Refer to this guide whenever you add new tooling or apps to your monorepo!** 
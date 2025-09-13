# Root Directory Standards

This document establishes clear guidelines for what belongs in the monorepo root directory versus app/package directories.

## ✅ **BELONGS IN ROOT**

### **Monorepo Management**
- `package.json` - Workspace configuration and shared scripts
- `pnpm-workspace.yaml` - PNPM workspace definition
- `pnpm-lock.yaml` - Dependency lock file
- `turbo.json` - Turborepo configuration
- `tsconfig.json` - Base TypeScript configuration for inheritance

### **Development Tools & Configuration**
- `eslint.config.js`, `eslint.config.security.js` - Shared linting rules
- `vitest.config.ts` - Base test configuration for inheritance
- `.env.example` - Environment variable template
- `.gitignore`, `.gitattributes` - Git configuration

### **External Services**
- `docker-compose.dev.yml` - External services (databases, search, admin tools)
- `docker-scripts.sh` - External service management
- `dev.sh` - Quick development environment startup

### **Documentation & Organization**
- `README.md` - Project overview and getting started
- `__docs__/` - Comprehensive project documentation
- `__http__/` - API testing files for all services
- `__prompts__/` - AI assistant prompts and templates
- `__design__/` - Design documents and proposals

### **Shared Utilities**
- `scripts/` - Shared development and deployment scripts
- `generators/` - Legacy code generators (being replaced by Turbo generators)
- `turbo/` - Turborepo generators and templates
- `src/test/` - Shared test utilities and setup files

### **Tool Configuration**
- `.config/` - Tool-specific configuration files
  - `taskmaster.config.js` - Task management configuration
  - `cline.mcp.json` - AI assistant configuration

## ❌ **DOES NOT BELONG IN ROOT**

### **App-Specific Files**
- Individual `Dockerfile` files → Move to `apps/*/Dockerfile`
- App-specific `vite.config.ts` → Keep in `apps/*/vite.config.ts`
- App-specific `.dockerignore` → Keep in `apps/*/.dockerignore`
- Database configs like `drizzle.config.ts` → Move to relevant API directory

### **Package-Specific Files**
- Library build configs → Keep in `packages/*/vite.config.ts`
- Package-specific test setups → Keep in `packages/*/src/test/`
- Component-specific documentation → Keep in `packages/*/README.md`

### **Temporary/Development Files**
- `uploads/` directories → Move to app that handles uploads
- `cookies.txt` and similar temp files → Remove or move to `.tmp/`
- IDE-specific files → Add to `.gitignore`

### **Unused/Obsolete Files**
- Old Docker compose files for individual services
- Unused configuration templates
- Legacy build configurations
- Duplicate documentation files

## 📁 **DIRECTORY STRUCTURE**

```
monorepo-root/
├── 📄 Core monorepo files (package.json, turbo.json, etc.)
├── 📁 .config/           # Tool configurations
├── 📁 __docs__/          # Project documentation
├── 📁 __http__/          # API testing files
├── 📁 __prompts__/       # AI assistant prompts
├── 📁 __design__/        # Design documents
├── 📁 apps/              # Applications
│   ├── 📁 api/           # Backend services
│   └── 📁 web/           # Frontend applications
├── 📁 packages/          # Shared packages
├── 📁 scripts/           # Shared scripts
├── 📁 turbo/             # Turborepo generators
└── 📁 src/test/          # Shared test utilities
```

## 🔄 **MIGRATION GUIDELINES**

### **When Adding New Files**
1. **Ask**: Is this used by multiple apps/packages?
   - **Yes** → Root directory
   - **No** → Specific app/package directory

2. **Ask**: Is this configuration for the entire monorepo?
   - **Yes** → Root directory
   - **No** → Specific directory

3. **Ask**: Is this temporary or development-specific?
   - **Yes** → Consider `.tmp/` or app-specific location
   - **No** → Follow above rules

### **When Cleaning Up**
1. **Identify scope**: Does this file affect multiple apps?
2. **Check usage**: Search codebase for references
3. **Move carefully**: Update all references after moving
4. **Test**: Ensure nothing breaks after reorganization

## 🎯 **BENEFITS OF THIS STRUCTURE**

### **For Developers**
- **Clear expectations** about where to find/place files
- **Reduced cognitive load** when navigating the codebase
- **Faster onboarding** for new team members

### **For Tools**
- **Better caching** with Turborepo (clear boundaries)
- **Cleaner builds** (no accidental inclusions)
- **Improved IDE performance** (focused file watching)

### **For Maintenance**
- **Easier updates** (clear ownership of files)
- **Simpler debugging** (logical file organization)
- **Better automation** (predictable structure)

## 📋 **CHECKLIST FOR ROOT DIRECTORY HEALTH**

### **Monthly Review**
- [ ] No app-specific files in root
- [ ] No unused configuration files
- [ ] All documentation is up-to-date
- [ ] Scripts are working and documented
- [ ] Tool configurations are current

### **Before Major Changes**
- [ ] Review impact on monorepo structure
- [ ] Update documentation if structure changes
- [ ] Test all shared scripts and configurations
- [ ] Communicate changes to team

## 🔧 **ENFORCEMENT**

### **Automated Checks**
Consider adding these to CI/CD:
```bash
# Check for common anti-patterns
find . -maxdepth 1 -name "*.config.ts" -not -path "./vitest.config.ts" -not -path "./turbo.json"
find . -maxdepth 1 -name "Dockerfile"
find . -maxdepth 1 -name "drizzle.config.*"
```

### **Code Review Guidelines**
- Review any new root-level files carefully
- Ensure proper justification for root placement
- Suggest app/package-specific locations when appropriate

---

**Remember**: The root directory is the "public interface" of your monorepo. Keep it clean, purposeful, and well-organized! 🎯

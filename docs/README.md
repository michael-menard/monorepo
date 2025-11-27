# LEGO MOC Organization App - UX Design Documentation

## Project Overview
This documentation captures the complete UX design and architecture planning for migrating a legacy React UI monolithic app to a modern page-based micro-apps architecture for LEGO MOC (My Own Creation) organization and inventory management.

**Target Users:** Adult Fans of LEGO (AFOLs) who purchase MOC instructions and need organization tools.

## Documentation Structure

### 📋 User Research & Planning
- **[User Research & Personas](./ux-design/user-research-and-personas.md)** - Target user analysis and personas
- **[Migration Strategy - Shell Architecture](./architecture/migration-strategy-shell-architecture.md)** - Technical migration approach

### 🎨 UX Design Flows
- **[AI MOC Import Flow](./ux-design/ai-moc-import-flow.md)** - Core AI-powered MOC ingestion feature
- **[Settings & Credential Management](./ux-design/settings-credential-management.md)** - Platform connections and preferences
- **[Mobile Design & Error States](./ux-design/mobile-error-states.md)** - Mobile optimization and error handling

### 🎨 Design System & Media Kit
- **[Design System Overview](./design-system/design-system-overview.md)** - Design philosophy and principles
- **[Color Palette](./design-system/color-palette.md)** - LEGO-inspired color system with accessibility guidelines
- **[Typography](./design-system/typography.md)** - Font hierarchy and text styles
- **[Spacing & Layout](./design-system/spacing-layout.md)** - 8px grid system and responsive layouts
- **[Components & Patterns](./design-system/components-patterns.md)** - UI component library and usage guidelines

## Key Features Designed

### 🤖 AI-Powered MOC Import (Killer Feature)
- **Automated ingestion** from Rebrickable and BrickLink URLs
- **MCP server integration** for AI processing
- **Review & confirmation** workflow with user control
- **Error handling** with graceful fallback to manual entry

### ⚙️ Settings & Credential Management
- **Secure credential storage** with encryption options
- **Platform connections** (Rebrickable, BrickLink)
- **AI import preferences** with granular control
- **Data privacy** and export capabilities

### 🏗️ Shell Architecture
- **main-app** as application shell (Layout, Auth, Navigation)
- **Domain apps** for complete business logic isolation
- **Cross-app routing** with URL-based navigation
- **Clean domain boundaries** preventing architectural leakage

## Architecture Principles

1. **Domain Isolation** - Each app owns ALL its domain logic
2. **Shell Pattern** - main-app provides layout and cross-cutting concerns
3. **AI-First with User Control** - Automation with mandatory review
4. **Security-Transparent** - Clear credential storage options
5. **Mobile-First Responsive** - Works on desktop and mobile

## Current Status

### ✅ Completed
- User research and persona development
- Core AI import flow design
- Settings and credential management interface
- Shell architecture migration strategy
- Mobile-responsive design patterns
- Error handling and edge cases

### 🔄 Next Steps
- MOC detail view and collection interface design
- Dashboard and analytics interface
- Image management and album organization
- Search and filtering interface design
- Technical implementation planning

## Success Criteria

The migration will be successful when it achieves:
- **Full feature parity or better** with current functionality
- **Complete unit and integration test suite** that passes
- **Lighthouse tests integrated** into CI/CD pipeline
- **Bundle monitoring** and performance tracking
- **All tests pass** including linting
- **Clean domain boundaries** with no architectural leakage

## Technical Stack

- **React 19** with modern functional components and ES7+ syntax
- **TanStack Router** for routing (not React Router)
- **RTK (Redux Toolkit)** and RTK Query for state management
- **Vite** build system with Vitest for testing
- **Tailwind CSS + shadcn/ui** design system
- **MCP Server** for AI processing
- **Monorepo** architecture using Turbo + pnpm workspaces

---

*This documentation serves as the complete reference for the UX design and architecture decisions made during the planning phase of the React UI migration project.*

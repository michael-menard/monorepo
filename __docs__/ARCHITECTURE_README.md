# Project Architecture & Documentation Guide

This document outlines the recommended documentation structure and content for this monorepo, with a focus on best practices for a tech lead portfolio project. It covers what to include at the project root, API, web, and packages levels, as well as advanced documentation to impress hiring managers.

---

## 1. Project-Level Documentation (Root of Monorepo)

**Must-Haves:**
- **README.md**
  - Project overview, goals, and high-level architecture diagram
  - Tech stack summary
  - Monorepo structure explanation
  - Quick start (setup, install, run, test, lint, build)
  - Contribution guidelines (link to CONTRIBUTING.md if present)
  - How to run all tests and linters
  - Contact info or links to your portfolio
- **ARCHITECTURE.md**
  - System architecture diagram (Mermaid or PNG/SVG)
  - Explanation of service boundaries (why microservices, why serverless, etc.)
  - Data flow and integration points
  - Rationale for key tech choices
- **CONTRIBUTING.md**
  - How to propose changes, open PRs, and coding standards
  - Branching strategy
  - Code review process
  - How to add new packages/apps
- **CODE_OF_CONDUCT.md** (optional)
- **CHANGELOG.md** (optional)
- **.env.example**
  - Example environment variables for all services

---

## 2. apps/api Level

**Must-Haves:**
- **README.md**
  - API overview and purpose
  - How to run locally (including DB and S3 setup)
  - How to run tests
  - How to run Swagger docs
  - API versioning and deployment notes
- **API_REFERENCE.md** or link to Swagger UI
  - How to access the OpenAPI docs
  - Example requests/responses for key endpoints
- **SECURITY.md**
  - Security practices (JWT, rate limiting, file validation, etc.)
  - How secrets are managed
  - How to report vulnerabilities
- **MIGRATION_STRATEGY.md** (already present)
- **ERD diagrams** (already present)

**Current API Services:**
- **auth-service** - Authentication and user management
- **lego-projects-api** - LEGO projects and gallery management

---

## 3. apps/web Level

**Must-Haves:**
- **README.md**
  - App overview and purpose
  - How to run locally
  - How to run tests
  - How to build for production
  - How to configure environment variables
- **STYLE_GUIDE.md**
  - UI/UX conventions
  - Component structure and naming
  - Theming and accessibility notes
- **ROUTING.md**
  - Route structure and protected routes
  - Auth flow (how protected routes work, how tokens are managed)
- **STATE_MANAGEMENT.md**
  - How global state is managed (RTK Query, Redux, etc.)
  - Where to add new slices or endpoints

**Current Web Applications:**
- **lego-moc-instructions-app** - LEGO MOC instructions and gallery application

---

## 4. packages Level

**Must-Haves:**
- **README.md** for each package
  - What the package does
  - How to use it (with code examples)
  - How to run tests for the package
  - How to publish/update (if relevant)
- **CONVENTIONS.md** (optional, for shared code)
  - Import/export patterns
  - How to add new components/hooks/utils

**Current Package Categories:**
- **auth/** - Authentication components, hooks, and utilities
- **features/** - Feature-specific packages (FileUpload, gallery, profile, wishlist, etc.)
- **shared/** - Shared utilities and configurations
- **tech-radar/** - Technology radar and assessment tools
- **ui/** - Reusable UI components and design system

---

## 5. Bonus/Advanced Docs (for Tech Lead Impression)

- **DECISION_LOG.md**
  - Record of major architectural/tech decisions and their rationale
- **ONBOARDING.md**
  - Step-by-step for new team members to get productive quickly
- **TESTING_STRATEGY.md**
  - How tests are organized (unit, integration, e2e)
  - How to add new tests
  - Coverage goals
- **DEPLOYMENT.md**
  - How to deploy each app/service
  - CI/CD pipeline overview (even if just a plan)
- **MONITORING.md**
  - How you would monitor the system in production (logs, metrics, alerts)

---

## Summary Table

| Level         | Must-Have Docs                                 | Optional/Advanced Docs         |
|---------------|------------------------------------------------|-------------------------------|
| Project Root  | README, ARCHITECTURE, CONTRIBUTING, .env.example | CODE_OF_CONDUCT, CHANGELOG, DECISION_LOG, ONBOARDING |
| apps/api      | README, API_REFERENCE, SECURITY, MIGRATION_STRATEGY, ERD |                              |
| apps/web      | README, STYLE_GUIDE, ROUTING, STATE_MANAGEMENT |                              |
| packages      | README (per package), CONVENTIONS              |                              |
| All           | TESTING_STRATEGY, DEPLOYMENT, MONITORING       |                              |

## Current Project Structure

```
Monorepo/
├── apps/
│   ├── api/
│   │   ├── auth-service/          # Authentication API
│   │   ├── lego-projects-api/     # LEGO projects API
│   │   └── MIGRATION_STRATEGY.md  # API migration strategy
│   └── web/
│       └── lego-moc-instructions-app/  # Main React application
├── packages/
│   ├── auth/                      # Authentication components
│   ├── features/                  # Feature-specific packages
│   ├── shared/                    # Shared utilities
│   ├── tech-radar/                # Technology radar tools
│   └── ui/                        # UI component library
├── __docs__/                      # Project documentation
├── taskmaster.config.js           # TaskMaster configuration
└── .taskmaster/                   # TaskMaster CLI configuration
```

---

## Recent Improvements

### Documentation Organization
- **Moved configuration files** from `__docs__/` to appropriate locations:
  - `taskmaster.config.js` moved to root directory
  - `tech-radar/` moved to `packages/tech-radar/`
- **Updated all documentation** to reflect current project structure
- **Standardized package organization** with clear categories and dependencies

### Package Structure
- **Auth package** (`packages/auth/`) - Centralized authentication functionality
- **Feature packages** (`packages/features/`) - Organized by specific features
- **Shared utilities** (`packages/shared/`) - Common utilities and configurations
- **UI components** (`packages/ui/`) - Reusable UI component library
- **Tech radar** (`packages/tech-radar/`) - Technology assessment tools

### Testing Strategy
- **Comprehensive test suites** for authentication flows
- **E2E testing** with Playwright for critical user journeys
- **Unit and integration tests** with Vitest
- **Email testing** with Ethereal for password reset flows

---

## Tips for Tech Lead Portfolio
- Use diagrams, tables, and real-world examples.
- Show how you’d help a new dev get up to speed (ONBOARDING.md).
- Document rationale for major decisions (DECISION_LOG.md).
- Demonstrate process, clarity, and leadership in your docs.
- Keep documentation up-to-date with project changes and structure updates.

If you want, you can use this file as a checklist and template for building out your documentation. Let me know if you want starter content for any specific doc! 
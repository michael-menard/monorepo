# LEGO MOC Organization App - Documentation

## Overview

Documentation for the LEGO MOC (My Own Creation) organization and inventory management application. This project is migrating from a legacy React UI monolithic app to a modern page-based micro-apps architecture.

**Target Users:** Adult Fans of LEGO (AFOLs) who purchase MOC instructions and need organization tools.

---

## Documentation Structure

### Core Documentation

| Directory                            | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| [architecture/](./architecture/)     | System architecture, tech stack, coding standards |
| [prd/](./prd/)                       | Product Requirements Document (sharded)           |
| [front-end-spec/](./front-end-spec/) | UI/UX specification, wireframes, user flows       |
| [stories/](./stories/)               | Active sprint user stories                        |

### Design & UX

| Directory                          | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| [design-system/](./design-system/) | Design tokens, colors, typography, components      |
| [ux-design/](./ux-design/)         | User research, UX flows, implementation guidelines |

### Reference & Guides

| Directory/File                                             | Purpose                                             |
| ---------------------------------------------------------- | --------------------------------------------------- |
| [guides/](./guides/)                                       | Developer setup, environment config, testing guides |
| [operations/](./operations/)                               | Operational documentation                           |
| [brownfield-architecture.md](./brownfield-architecture.md) | Current state analysis                              |
| [aws-tagging-schema.md](./aws-tagging-schema.md)           | AWS resource tagging standards                      |

### Other

| Directory                  | Purpose                            |
| -------------------------- | ---------------------------------- |
| [qa/](./qa/)               | Quality assurance documentation    |
| [examples/](./examples/)   | Code examples and samples          |
| [\_archive/](_./_archive/) | Completed/superseded documentation |

---

## Quick Links

### Getting Started

- [Development Guide](./guides/DEVELOPMENT-GUIDE.md)
- [GitHub Environment Setup](./guides/github-environment-setup.md)
- [Coding Standards](./architecture/coding-standards.md)

### Architecture

- [Architecture Overview](./architecture/index.md)
- [Tech Stack](./architecture/tech-stack.md)
- [Source Tree](./architecture/source-tree.md)
- [Component Architecture](./architecture/component-architecture.md)

### Product Requirements

- [PRD Overview](./prd/index.md)
- [Epic 1: Frontend Modernization](./prd/epic-1-frontend-modernization-modular-architecture-serverless-backend-ux-enhancement.md)
- [Requirements](./prd/requirements.md)

### UX & Design

- [Front-End Spec Overview](./front-end-spec/index.md)
- [Design System Overview](./design-system/design-system-overview.md)
- [User Research & Personas](./ux-design/user-research-and-personas.md)
- [AI MOC Import Flow](./ux-design/ai-moc-import-flow.md)

### Current Sprint

- [Stories Overview](./stories/README.md)

---

## Key Features

### AI-Powered MOC Import (Killer Feature)

- Automated ingestion from Rebrickable and BrickLink URLs
- MCP server integration for AI processing
- Review & confirmation workflow with user control

### Shell Architecture

- **main-app** as application shell (Layout, Auth, Navigation)
- **Domain apps** for complete business logic isolation
- Cross-app routing with URL-based navigation

---

## Technical Stack

- **React 19** with modern functional components
- **TanStack Router** for routing
- **RTK (Redux Toolkit)** and RTK Query for state management
- **Vite** build system with Vitest for testing
- **Tailwind CSS + shadcn/ui** design system
- **Monorepo** architecture using Turbo + pnpm workspaces

---

## Archive

Completed and superseded documentation is preserved in [\_archive/](./_archive/):

- `completed-prd/` - Previous PRD iterations and completed epics
- `completed-stories/` - Stories from previous project phases

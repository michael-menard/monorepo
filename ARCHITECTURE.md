# System Architecture

## Overview

This document describes the high-level architecture of the project, including service boundaries, data flow, and rationale for key technology choices.

## Architecture Diagram

```
[Insert Mermaid or image diagram here]
```

## Service Boundaries
- **API Service:** Handles authentication, user profiles, gallery, and moderation endpoints. Designed for easy migration to serverless (AWS Lambda).
- **Web App:** React-based frontend, communicates with API via REST.
- **Packages:** Shared code (auth, UI, utils) for DRY and consistency.

## Data Flow
- Frontend sends requests to API (protected by JWT/cookie auth)
- API interacts with PostgreSQL (Drizzle ORM) and S3 for file storage
- API returns data and file URLs to frontend

## Key Technology Choices
- **Monorepo:** Simplifies dependency management and code sharing
- **Drizzle ORM:** Type-safe, modern Postgres access
- **Serverless-ready:** API can be migrated to AWS Lambda
- **RTK Query:** Modern, scalable state management for React
- **Vitest/Jest:** Fast, reliable testing

## Extensibility
- New features can be added as new apps or packages
- Modular structure supports team scaling and microservices 
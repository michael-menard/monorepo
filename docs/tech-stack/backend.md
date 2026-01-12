# Backend & Data Architecture

## Overview

This document describes the backend stack and data architecture for `apps/api` and related packages.

## Technologies

- **AWS Lambda** for serverless compute
- **Amazon API Gateway (APIGW)** for HTTP APIs
- **Amazon Aurora PostgreSQL** as the primary relational database
- **TypeScript** for Lambda handlers and shared backend code

## API Application

- `apps/api` — main entrypoint for Lambda functions and API Gateway integration

## Lambda Functions

- Each method/operation should map to its own Lambda where practical
- Handlers validate input/output using Zod schemas

## API Gateway

- Routes HTTP requests to the appropriate Lambda handlers
- Handles authentication/authorization integration points

## Data Layer

- Aurora PostgreSQL for transactional data
- Accessed via typed query helpers or ORM (documented here if/when added)

## Shared Backend Packages

- `packages/backend/*` — shared backend utilities and data access helpers

## Best Practices

- Validate all external inputs and outputs with Zod
- Keep Lambdas focused and single-responsibility
- Prefer composition over large, multi-purpose handlers

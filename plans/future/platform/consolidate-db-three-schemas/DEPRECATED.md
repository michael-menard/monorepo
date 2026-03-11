# DEPRECATED

**This plan has been retired.**

The `consolidate-db-three-schemas` (CDTS) plan has been formally deprecated as of 2026-03-11.

## Status

- **Plan Status**: Archived
- **Stories**: 12 total - 6 completed, 6 cancelled
- **Superseded by**: [consolidate-db-normalized (CDBN)](../consolidate-db-normalized/)

## Summary

This plan was originally designed to consolidate the KB database from a single public schema into three schemas (knowledge, planning, operations). During execution, the approach evolved to a normalized schema design (CDBN) which is now the active direction.

## Cancelled Stories

The following CDTS stories have been cancelled:

- CDTS-0020: Audit Actual Table Locations and Produce Migration Manifest
- CDTS-1010: Create analytics Schema and Move wint Tables into Drizzle
- CDTS-1020: Write Structural DDL Migrations
- CDTS-1030: Update Drizzle schema.ts
- CDTS-1040: Update MCP Tool SQL
- CDTS-1050: Apply Phase 1 Migrations and Verify

## Completed Stories

These stories remain in completed state:

- CDTS-0010: Establish Migration Runner and Safety Preamble
- CDTS-2010: Add Story Embeddings for Similarity Search
- CDTS-2020: Implement Composite Story Context Tool
- CDTS-3010: Audit Consumers of Empty Aurora Schemas
- CDTS-3020: Drop Empty Aurora Schemas and Final Verification
- CDTS-3030: End-to-End Verification and Rollback Documentation

## Decision Record

See KB decision entry: `CDTS Plan Deprecated - Superseded by CDBN`

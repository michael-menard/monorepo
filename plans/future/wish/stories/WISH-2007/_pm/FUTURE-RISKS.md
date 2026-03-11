# Future Risks - WISH-2007: Run Migration

## Non-MVP Risks

### Risk 1: Schema Evolution Strategy
- **Impact (if not addressed post-MVP)**: Future schema changes (adding columns, modifying enums) will be more complex after production deployment
- **Recommended timeline**: Address in WISH-2008 or dedicated schema versioning story
- **Details**:
  - Enum modifications require special handling (can't remove values, adding values requires migration complexity)
  - Column additions are straightforward but require downtime awareness
  - Recommend documenting schema evolution policy before WISH-2001 goes live

### Risk 2: Multi-Environment Coordination
- **Impact (if not addressed post-MVP)**: Production migrations require coordination between dev, staging, and prod environments
- **Recommended timeline**: Before production deployment (Phase 2 wrap-up)
- **Details**:
  - Need runbook for production migration execution
  - Rollback plan must be tested in staging
  - Consider migration state tracking across environments

### Risk 3: Large Dataset Performance
- **Impact (if not addressed post-MVP)**: Index performance degrades with very large datasets (1M+ rows)
- **Recommended timeline**: Monitor in production, address if thresholds exceeded
- **Details**:
  - Current indexes optimized for 100K-500K rows
  - May need partial indexes or index tuning at scale
  - Consider table partitioning if single user has 10K+ wishlist items

### Risk 4: Backup and Restore Testing
- **Impact (if not addressed post-MVP)**: Disaster recovery untested for wishlist data
- **Recommended timeline**: Before production launch
- **Details**:
  - Test backup/restore procedures with wishlist_items table
  - Verify point-in-time recovery works correctly
  - Document retention policies for wishlist data

### Risk 5: Database Connection Pooling
- **Impact (if not addressed post-MVP)**: Migration execution might exceed connection limits in serverless environments
- **Recommended timeline**: Verify during staging deployment
- **Details**:
  - Drizzle migrations hold connections during execution
  - Serverless Lambda cold starts might cause connection pool exhaustion
  - Consider dedicated migration execution environment separate from API

## Scope Tightening Suggestions

### Clarification 1: Migration Timing
- **Suggestion**: Explicitly document that WISH-2007 must run in all environments before WISH-2001 frontend can deploy
- **Reason**: Avoids race condition where frontend tries to query non-existent table

### Clarification 2: Rollback Procedure
- **Suggestion**: Document step-by-step rollback procedure including:
  - SQL commands to drop table/enums
  - Drizzle journal cleanup
  - Verification steps
- **Reason**: Ensures safe rollback during development iterations

### Clarification 3: Migration Verification Checklist
- **Suggestion**: Add explicit "Definition of Done" checklist:
  - [ ] Migration file generated
  - [ ] Migration runs in local dev
  - [ ] Migration runs in CI (if applicable)
  - [ ] Indexes verified with EXPLAIN ANALYZE
  - [ ] Enums verified with SQL query
  - [ ] Rollback tested successfully
- **Reason**: Provides clear completion criteria for QA

## Future Requirements

### Nice-to-Have 1: Migration Automation
- **Description**: Automated migration execution as part of deploy pipeline
- **Benefit**: Reduces manual steps, prevents human error
- **Complexity**: Medium - requires CI/CD integration

### Nice-to-Have 2: Migration State Dashboard
- **Description**: UI or CLI tool showing migration status across all environments
- **Benefit**: Visibility into which migrations have run where
- **Complexity**: Low - could use existing Drizzle Studio or custom script

### Nice-to-Have 3: Schema Drift Detection
- **Description**: Automated check comparing Drizzle schema to actual database schema
- **Benefit**: Catches manual schema changes or out-of-order migrations
- **Complexity**: Medium - Drizzle has partial support, needs custom tooling

### Polish: Migration Performance Monitoring
- **Description**: Log migration execution time and track over releases
- **Benefit**: Identify performance regressions in migration scripts
- **Complexity**: Low - add timing to migration script

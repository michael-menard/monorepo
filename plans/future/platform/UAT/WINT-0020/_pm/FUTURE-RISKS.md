# Future Risks: WINT-0020 - Create Story Management Tables

## Non-MVP Risks

### Risk 1: Index overhead on write operations

**Impact (if not addressed post-MVP)**:
As story management tables grow to thousands of records, the 15+ indexes across 5 tables will slow down INSERT/UPDATE operations. Each write requires updating all relevant indexes.

**Recommended timeline**: Q2 2026 (after 10K+ stories in database)

**Mitigation options**:
- Benchmark write performance at scale (100K+ records)
- Consider partial indexes for hot query paths
- Evaluate index consolidation opportunities
- Monitor PostgreSQL slow query logs

### Risk 2: JSONB query performance degradation

**Impact (if not addressed post-MVP)**:
The `storyMetadataVersions.metadata_snapshot` JSONB field enables flexible storage but can degrade query performance without specialized indexes. Full table scans on JSONB queries will become slow at scale.

**Recommended timeline**: Q2 2026 (when metadata queries become common)

**Mitigation options**:
- Add GIN indexes on JSONB fields for common query patterns
- Denormalize frequently-queried JSONB fields to regular columns
- Implement caching layer for hot metadata queries
- Set retention policy for old metadata versions

### Risk 3: Cascade delete performance at scale

**Impact (if not addressed post-MVP)**:
All 5 new tables use `ON DELETE CASCADE` FK constraints to stories. Deleting a story with hundreds of related records (artifacts, phase history, versions, assignments, blockers) will lock tables and slow down delete operations.

**Recommended timeline**: Q3 2026 (when story deletion becomes common)

**Mitigation options**:
- Implement soft delete pattern (deleted_at timestamp)
- Add database-level delete batching
- Use background job for large deletes
- Monitor delete operation duration

### Risk 4: Artifact checksum storage efficiency

**Impact (if not addressed post-MVP)**:
SHA-256 checksums are 64-character hex strings (256 bits). Storing checksums as VARCHAR(64) consumes more space than binary storage (32 bytes). At 100K+ artifacts, this adds ~3.2MB of unnecessary storage.

**Recommended timeline**: Q4 2026 (when storage optimization needed)

**Mitigation options**:
- Migrate checksum column from VARCHAR(64) to BYTEA (32 bytes)
- Add migration to convert hex strings to binary
- Update application code to handle binary checksums

### Risk 5: Phase history table growth unbounded

**Impact (if not addressed post-MVP)**:
The `storyPhaseHistory` table tracks every phase entry/exit event. For stories with many iterations (e.g., 10+ review cycles), this table will grow faster than other tables. No retention policy exists.

**Recommended timeline**: Q2 2026 (when monitoring shows growth trend)

**Mitigation options**:
- Implement retention policy (archive phase history > 90 days old)
- Add database-level partitioning by created_at month
- Create summary views for analytics (instead of querying raw history)

### Risk 6: Metadata version explosion

**Impact (if not addressed post-MVP)**:
Every story metadata change creates a new `storyMetadataVersions` record with full JSONB snapshot. Stories with frequent updates (e.g., 50+ versions) will accumulate significant storage. No deduplication exists.

**Recommended timeline**: Q3 2026 (when storage monitoring shows trend)

**Mitigation options**:
- Implement version pruning (keep only N most recent versions)
- Use delta compression instead of full snapshots
- Add version lifecycle policies (archive old versions to cold storage)

## Scope Tightening Suggestions

### Suggestion 1: Defer assignment tracking to WINT-0030

**Rationale**: The `storyAssignments` table enables agent/user assignment tracking, but no MCP tools exist yet to populate this table (WINT-0090 pending). Deferring to WINT-0030 would reduce initial scope from 5 tables to 4.

**Impact**: Story management MCP tools (WINT-0090) would need to create assignments table in-band.

**Recommendation**: Keep in WINT-0020 - table design is straightforward and establishes full schema upfront.

### Suggestion 2: Simplify blocker tracking to text field

**Rationale**: The `storyBlockers` table provides rich blocker metadata (type, severity, resolution notes), but initial implementation may only need simple text descriptions. A single `blockers TEXT[]` column on stories table could suffice for MVP.

**Impact**: Loss of blocker type categorization, severity levels, resolution tracking.

**Recommendation**: Keep rich structure - blocker analysis is critical for autonomous workflow learning.

### Suggestion 3: Limit artifact types to core set

**Rationale**: AC-1 allows arbitrary artifact types. Initial implementation only needs: PLAN, SCOPE, EVIDENCE, CHECKPOINT, DECISIONS, REVIEW, PROOF (7 types). Additional types (ELAB, OUTCOME, etc.) could be added later.

**Impact**: Simpler artifactTypeEnum, fewer values to test.

**Recommendation**: Define complete enum upfront - adding enum values later requires migration.

## Future Requirements

### Requirement 1: Real-time sync from filesystem

**Description**: Current schema supports artifact tracking but requires manual population. Future requirement: watch filesystem for artifact changes and auto-update `storyArtifacts` table with checksums.

**Recommended story**: KBAR-0030 (Artifact Sync Daemon) - adapt for WINT tables

**Priority**: P1 (needed for autonomous workflow)

### Requirement 2: Phase transition validation rules

**Description**: Current schema allows arbitrary phase transitions (e.g., qa → setup). Future requirement: enforce valid phase transition rules at database or application level.

**Recommended story**: WINT-1090 (Phase Transition Rules)

**Priority**: P2 (nice-to-have, application logic can validate)

### Requirement 3: Assignment conflict detection

**Description**: Current schema allows multiple active assignments for same story/phase. Future requirement: prevent assignment conflicts (only one agent per story per phase).

**Recommended story**: WINT-0100 (Assignment Management)

**Priority**: P2 (application logic can enforce)

### Requirement 4: Metadata diff visualization

**Description**: Current schema stores full metadata snapshots but does not compute diffs between versions. Future requirement: API endpoint to return diff between version N and N-1.

**Recommended story**: WINT-0110 (Metadata Version Diff API)

**Priority**: P3 (polish)

### Requirement 5: Blocker dependency graph

**Description**: Current schema tracks blockers independently. Future requirement: link blockers to story dependencies to show blocker propagation (story A blocked → story B also blocked).

**Recommended story**: WINT-0120 (Blocker Dependency Graph)

**Priority**: P2 (useful for workflow visualization)

## Polish and Edge Case Handling

### Edge Case 1: Artifact file path length limits

**Current**: `file_path` column type TBD (likely TEXT or VARCHAR)

**Edge case**: Filesystem paths can exceed 255 characters (Windows max path: 260 chars, Linux: 4096 chars)

**Recommendation**: Use TEXT column type (no length limit) instead of VARCHAR(255)

### Edge Case 2: Agent name length limits

**Current**: `agent_name` in storyPhaseHistory likely VARCHAR(255)

**Edge case**: Agent names could exceed 255 chars if using fully-qualified agent file paths

**Recommendation**: Set max length at 255 chars, truncate with suffix if needed

### Edge Case 3: Concurrent phase entry

**Current**: No unique constraint on (story_id, phase, iteration)

**Edge case**: Two agents could enter same phase simultaneously, creating duplicate phase_history records

**Recommendation**: Add unique constraint on (story_id, phase, iteration) to prevent duplicates

### Edge Case 4: Negative duration_seconds

**Current**: `duration_seconds` likely INTEGER (allows negatives)

**Edge case**: Clock skew or incorrect timestamps could produce negative durations

**Recommendation**: Add CHECK constraint `duration_seconds >= 0`

### Edge Case 5: Empty metadata snapshot

**Current**: `metadata_snapshot` JSONB allows null or empty object

**Edge case**: What should be stored if metadata is completely empty?

**Recommendation**: Store `{}` (empty object) instead of null for consistency

### Edge Case 6: Blocker resolution without resolved_at

**Current**: `resolution_notes` TEXT nullable, `resolved_at` TIMESTAMP nullable

**Edge case**: Developer could add resolution_notes without setting resolved_at

**Recommendation**: Add CHECK constraint `(resolution_notes IS NULL) OR (resolved_at IS NOT NULL)` to enforce consistency

### Edge Case 7: Assignment completed without completed_at

**Current**: `status` can be 'completed' while `completed_at` is null

**Edge case**: Application bug could set status without timestamp

**Recommendation**: Add CHECK constraint `(status = 'completed') = (completed_at IS NOT NULL)` to enforce consistency

## Tooling Enhancements

### Enhancement 1: Migration rollback SQL generator

**Current**: Drizzle Kit generates forward migrations only

**Future**: Auto-generate rollback SQL for each migration

**Effort**: Medium (3-5 days)

**Priority**: P2 (nice-to-have, manual rollback SQL works)

### Enhancement 2: Schema visualization tool

**Current**: Schema defined in TypeScript, no visual representation

**Future**: Generate ER diagram from Drizzle schema definitions

**Effort**: Low (1-2 days, use existing tools like dbdiagram.io)

**Priority**: P3 (documentation polish)

### Enhancement 3: Test data factory

**Current**: Tests must manually construct test records

**Future**: Factory functions for generating valid test data (stories, artifacts, phases, etc.)

**Effort**: Medium (2-3 days)

**Priority**: P2 (improves test maintainability)

### Enhancement 4: Schema migration validator

**Current**: Migration correctness verified manually

**Future**: Automated validator checks migration SQL against schema definition

**Effort**: High (5-7 days)

**Priority**: P3 (nice-to-have, manual review works)

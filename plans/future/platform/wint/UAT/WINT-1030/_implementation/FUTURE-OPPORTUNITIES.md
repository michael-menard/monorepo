# Future Opportunities - WINT-1030

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No validation of story content beyond frontmatter | Low | Low | Future: Add markdown content validation (broken links, missing sections) in separate story |
| 2 | No rollback mechanism beyond manual SQL DELETE | Low | Medium | Future: Create explicit rollback command (`--rollback`) that removes inserted stories |
| 3 | No progress bar or estimated time remaining during execution | Low | Low | Future: Add progress bar using cli-progress library for better UX |
| 4 | No email/notification on completion for unattended runs | Low | Low | Future: Add optional --notify flag to send completion email/Slack message |
| 5 | No checkpointing for very large migrations (1000+ stories) | Low | Medium | Future: Add checkpoint/resume capability for massive migrations (unlikely given current story count) |
| 6 | Script assumes single database - no multi-tenant support | Low | High | Future: Add --database flag if multi-tenant WINT deployments emerge |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Parallel epic processing could improve performance | Medium | Medium | Profile sequential vs parallel processing, add --parallel flag if >30% speedup |
| 2 | Status confidence scoring (how certain is inference?) | Low | Medium | Add metadata field indicating inference confidence (frontmatter=100%, directory=80%, default=0%) |
| 3 | Migration statistics dashboard | Medium | High | Create post-migration dashboard showing state distribution trends, epic breakdowns |
| 4 | Dry-run diff tool comparing expected vs actual database state | Medium | Medium | Create --diff mode that compares dry-run-plan.json to current database state |
| 5 | Story metadata enrichment during population | Low | Medium | Auto-populate epic, phase, priority from inferred patterns (beyond status field) |
| 6 | Integration with WINT-1070 to auto-generate stories.index.md after population | Medium | Low | Chain WINT-1030 → WINT-1070 in single migration workflow |
| 7 | Support for custom status mappings via configuration file | Low | Medium | Add --config flag to override lifecycle directory → status mapping (useful for non-standard epics) |
| 8 | Batch mode for populating multiple epics in one run | Medium | Low | Add --all-epics flag to process all epics under plans/future/ |
| 9 | Story archive handling for cancelled/deprecated stories | Low | Medium | Add flag to exclude cancelled/archived stories from population or mark with metadata |
| 10 | Schema version tracking in migration log | Low | Low | Record wint.stories schema version in migration-log.json for future migration compatibility checks |

## Categories

### Edge Cases
- **Nested epic structures**: Currently infers epic from immediate parent directory - future enhancement could support hierarchical epic paths
- **Stories with multiple status fields**: If frontmatter has both `status:` and `state:`, currently no tie-breaking logic (non-issue as StoryArtifactSchema only defines `status`)
- **Non-standard directory names**: Script assumes exact lifecycle directory names - custom names would fail silently

### UX Polish
- **Interactive mode**: For small epics (<20 stories), offer interactive confirmation per story before insert
- **Color-coded console output**: Use chalk to highlight successes (green), warnings (yellow), errors (red)
- **Estimated time remaining**: Show progress bar with ETA based on current throughput
- **Summary statistics**: More detailed breakdown (stories per state, average points per state, etc.)

### Performance
- **Connection pooling tuning**: Current pool size (20 connections) may be suboptimal - add auto-tuning based on epic size
- **Streaming JSON output**: migration-log.json could grow large for 1000+ story epics - stream instead of buffering
- **Database index optimization**: Add temporary indexes on story_id during population, then drop (marginal benefit)

### Observability
- **Telemetry integration**: Send migration metrics to WINT telemetry tables (agentInvocations, agentOutcomes)
- **Slack/Discord webhook**: Post completion summary to team channel
- **Grafana dashboard**: Real-time migration progress visualization for large migrations
- **Error trend analysis**: Track common error patterns across migrations to improve StoryFileAdapter validation

### Integrations
- **CI/CD integration**: Run as GitHub Action on PR to validate story consistency before merge
- **Pre-commit hook**: Validate story frontmatter format before allowing commit
- **Auto-population on story creation**: Watch filesystem for new stories, auto-populate database in real-time (replaces batch migration)
- **WINT-1070 integration**: Auto-trigger stories.index.md generation after successful population

## Future Story Candidates

Based on enhancement opportunities above, recommend creating these follow-up stories:

1. **WINT-1031**: Add parallel epic processing with --parallel flag (Impact: Medium, Effort: Medium)
2. **WINT-1032**: Create post-migration statistics dashboard (Impact: Medium, Effort: High)
3. **WINT-1033**: Implement --all-epics batch mode for multi-epic population (Impact: Medium, Effort: Low)
4. **WINT-1034**: Add dry-run diff tool for database state comparison (Impact: Medium, Effort: Medium)
5. **WINT-1035**: Create explicit rollback command with safety checks (Impact: Low, Effort: Medium)

## Deferred from Scope

Items explicitly excluded in Non-Goals section (correct decisions):

- ✅ **Modifying story files**: Population is read-only for filesystem - correct, prevents accidental corruption
- ✅ **Story command updates**: Deferred to WINT-1040, WINT-1050, WINT-1060 - appropriate sequencing
- ✅ **Index file generation**: Deferred to WINT-1070 - single-responsibility principle maintained
- ✅ **Backward migration**: No rollback to directory-based status - correct, one-way migration reduces complexity
- ✅ **Schema migration**: wint.stories table already exists - correct, DDL changes are WINT-0010's responsibility
- ✅ **MCP tool creation**: Deferred to WINT-0090 - correct, tools consume populated data, not populate it
- ✅ **Compatibility shim**: Deferred to WINT-1010 - correct, shim uses populated data, doesn't create it

---

**Future Opportunities Analysis Complete**

This story is well-scoped and focused. Most enhancements are polish/observability improvements, not functional gaps. The core migration script will achieve its MVP goal: populate wint.stories table with current story status to enable database-driven workflows.

Recommended next steps after WINT-1030 completion:
1. Validate population with WINT-1070 (generate stories.index.md from database)
2. Update story commands (WINT-1040, WINT-1050, WINT-1060) to use populated data
3. Consider WINT-1031 (parallel processing) only if performance bottleneck observed

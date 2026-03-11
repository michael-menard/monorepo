# Future Opportunities - WKFL-009

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Similarity Computation Optimization**: Story presents Option B (fetch all embeddings, compute in-memory pairwise similarity) as optimization over Option A (N queries via semanticSearch). For large KBs (>1000 entries), in-memory approach would be significantly faster. | Medium (performance) | High (requires vector library like FAISS, more complex implementation) | Implement Option A for MVP. Add WKFL-009-B story for Option B optimization when KB exceeds 500 entries. Track query time in compression report to detect when optimization is needed. |
| 2 | **Weekly/Monthly Cron Automation**: Story mentions "monthly cron" but implementation is manual `/kb-compress` command only. Automation deferred to future. | Low (manual trigger sufficient for MVP) | Medium (GitHub Actions workflow + scheduling) | Create follow-up story for cron automation after manual command proves reliable. Include monitoring/alerting for cron failures. |
| 3 | **Rollback Complexity**: Story documents rollback procedure (unarchive entries, delete canonicals) but doesn't provide automated rollback command. Manual SQL required. | Low (low rollback frequency expected) | Medium (create /kb-compress-rollback command) | Add automated rollback feature if compression runs become frequent or risky. Track rollback requests to determine priority. |
| 4 | **Cluster Size Upper Bound**: Story doesn't specify maximum cluster size. Very large clusters (e.g., 50+ entries about same topic) could produce unwieldy canonical entries. | Low (unlikely in practice) | Low (add --max-cluster-size flag) | Monitor cluster sizes in compression reports. If clusters exceed 20 members, consider adding cluster size limit with sub-clustering. |
| 5 | **Dry-Run Reporting**: Story mentions `--dry-run` flag but doesn't specify what gets reported. Users need preview of: which clusters would form, which entries would be merged, what canonical entries would look like. | Medium (reduces risk of accidental compression) | Low (output logic already exists) | Enhance dry-run mode to output detailed preview: cluster memberships, sample canonical entry content, estimated token savings. Consider adding --preview-canonical flag to show what merged entries would look like. |
| 6 | **Archive Entry Queryability**: Story says "Archived entries still queryable with flag" but doesn't specify the flag or update kb_search to support it. Current kb_search would return archived entries mixed with active entries. | Medium (confusing search results) | Medium (update kb_search to filter by archived status) | Add `exclude_archived: boolean` parameter to kb_search (default: true). Update semanticSearch to filter `WHERE metadata->>'archived' != 'true'` (if metadata approach used). Document that archived entries are excluded by default. |
| 7 | **Embedding Model Upgrade Path**: Story says "no embedding model changes" but WKFL-006 documented upgrade path from text similarity (0.70 threshold) to embeddings (0.85 similarity). Future models may have higher accuracy. | Low (current model sufficient) | High (requires re-embedding all entries) | Document model upgrade procedure: 1. Add new embedding column, 2. Backfill embeddings, 3. Update clustering to use new embeddings, 4. Drop old embedding column. Consider this for WKFL-009-C if compression accuracy becomes an issue. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Incremental Compression**: Current design processes ALL non-archived entries every run. For large KBs, could process only new entries since last compression run (e.g., entries created in last 30 days). | Medium (performance) | Medium (track last compression date, filter by createdAt) | Add `--incremental` flag that only considers entries created since last compression run. Store last_compression_date in report or DB. Benefits: faster runs, less API load. Trade-off: won't merge new entries with old canonical entries. |
| 2 | **Canonical Entry Refinement**: First-pass canonical entries may have awkward merged titles or redundant examples. Could add refinement step that uses LLM to polish canonical entry content. | Medium (quality) | High (requires LLM call per canonical entry, adds cost) | Log canonical entry quality issues during manual AC-5 verification. If quality problems are common, add WKFL-009-D story for LLM-based refinement. Use haiku model to keep costs low. |
| 3 | **Compression Analytics Dashboard**: Report generates YAML with stats, but no visualization. Could create dashboard showing: compression trends over time, largest clusters, token savings, archive/canonical ratio. | Low (nice-to-have) | High (requires visualization tool) | After 3+ compression runs, evaluate if analytics justify effort. Could integrate into existing KB analytics if WKFL-008 or similar creates analytics infrastructure. |
| 4 | **Smart Threshold Tuning**: Story uses fixed 0.9 similarity threshold. Could analyze compression results to recommend optimal threshold per entry type (lessons vs decisions vs constraints may cluster differently). | Medium (quality) | Medium (add threshold experimentation to report) | Run compression with multiple thresholds (0.85, 0.90, 0.95) in dry-run mode, compare cluster quality. Report recommended threshold per entry_type. Requires manual validation of clustering quality. |
| 5 | **Canonical Entry Versioning**: Once canonical entry created, future updates to member entries won't propagate to canonical. Could track canonical entry versions and regenerate when new similar content appears. | Medium (keeps canonicals fresh) | High (complex tracking, re-merge logic) | Defer until canonical entries become stale. Track issue: "Canonical entry X doesn't reflect recent lessons." If this becomes common (>10% of canonicals), create follow-up story for versioned canonicals. |
| 6 | **Cross-Entry-Type Clustering**: Current design assumes same entry_type only clusters together (lessons with lessons, decisions with decisions). But some patterns span types (e.g., a lesson and a decision about same architectural pattern). | Low (rare occurrence) | Medium (relax entry_type filtering in clustering) | Monitor for cases where users manually reference both archived lesson and decision about same topic. If this is common, consider allowing cross-type clustering with entry_type preserved as tag on canonical entry. |
| 7 | **User Feedback Integration**: No mechanism for users to reject bad merges or flag canonical entries for refinement. Could add /kb-feedback command for canonical entry quality. | Medium (quality improvement) | Medium (extends existing feedback system) | If WKFL-004 feedback system proves valuable, extend it to capture canonical entry quality feedback. Use feedback to improve merge logic or manual refinement priority. |

## Categories

### Edge Cases
- **Very Large Clusters** (#4): Clusters with 20+ members may produce unwieldy canonical entries
- **Cross-Entry-Type Patterns** (#6): Related content across different entry types (lessons, decisions, constraints)

### Performance Optimizations
- **In-Memory Similarity Computation** (#1): Faster clustering for large KBs
- **Incremental Compression** (#1 enhancement): Only process new entries each run

### UX Polish
- **Dry-Run Preview** (#5): Show what compression would do before executing
- **Compression Analytics Dashboard** (#3): Visualize compression trends and results
- **Smart Threshold Tuning** (#4): Recommend optimal similarity threshold per entry type

### Observability
- **Archive Entry Queryability** (#6): Filter archived entries from search results by default
- **Compression Analytics** (#3): Track compression effectiveness over time

### Quality Improvements
- **Canonical Entry Refinement** (#2): LLM-based polishing of merged content
- **Canonical Entry Versioning** (#5): Keep canonicals fresh as new content appears
- **User Feedback Integration** (#7): Allow users to flag bad merges or request refinement

### Infrastructure
- **Automated Rollback** (#3): Command to undo compression runs
- **Weekly/Monthly Cron** (#2): Automated scheduling for compression runs
- **Embedding Model Upgrades** (#7): Procedure for upgrading to newer embedding models

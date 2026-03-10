# Blockers: INST-1102

Generated: 2026-02-05

---

## Active Blockers

None. All PM workers completed successfully.

---

## Warnings

### Warning 1: INST-1008 Dependency (Non-Blocking for Story Creation)

**Severity**: Warning
**Type**: Dependency
**Description**: INST-1008 (Wire RTK Query Mutations) is in UAT status. The `useCreateMocMutation` hook needs to be available before frontend implementation can begin.

**Impact on Story Generation**: None - story can be created and detailed now

**Impact on Implementation**: Medium - frontend work should wait for INST-1008 to merge

**Resolution**: Monitor INST-1008 status. Story is ready for implementation as soon as INST-1008 completes UAT and merges.

---

## Questions for Elaboration Phase

The following questions need clarification during elaboration but do NOT block story creation:

1. **Type Field**: What value should `moc_instructions.type` be set to? (Likely "MOC")
2. **Slug Storage**: Should slug be stored in `set_number` field or new `slug` column?
3. **Slug Uniqueness**: How to handle duplicate slugs? (Recommend: append UUID)
4. **Theme List**: What are the definitive theme options for dropdown?
5. **Feature Gate**: Should route use `requireFeature('mocs')` or `requireFeature('instructions')`?
6. **Tag Limits**: Maximum tags per MOC? Maximum tag length?
7. **Title Uniqueness**: Should titles be unique per user?

---

## Resolution Status

**PM Phase**: ✅ Complete - No blocking issues
**Story Status**: Ready for Phase 4 (Synthesis)

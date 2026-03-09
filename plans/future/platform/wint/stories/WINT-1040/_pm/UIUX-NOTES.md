# UI/UX Notes: WINT-1040 — Update /story-status Command to Use DB

## Verdict

**SKIPPED** — This story does not touch web UI, browser-based UI, or any frontend components.

**Justification**: The `/story-status` command is a Claude Code CLI command (`.claude/commands/story-status.md`). It produces terminal text output. There are no React components, no Tailwind styling, no shadcn/ui primitives, and no Playwright browser tests applicable.

---

## CLI UX Considerations (Advisory)

Although not a traditional UI/UX concern, the following CLI output considerations are relevant:

### Output Format Preservation (Required)

The current terminal output format MUST be preserved. The visual output must remain identical:
- Swimlane ASCII art (--depth mode)
- Progress bar (feature summary mode)
- Dependency graph (--deps-order mode)
- Single-story card layout (Feature + Story ID mode)

**Reference**: `.claude/agents/_reference/examples/story-status-output.md`

No layout changes are permitted. All existing output fields (Story, Status, Location, Depends On) must appear in the same format.

### Optional: Data Source Indicator

The seed recommends optionally surfacing the data source in single-story output. If implemented:

```
Story: WINT-1011
Status: In QA (UAT)
Location: wint/UAT/WINT-1011
Depends On: WINT-0090
Source: database          ← optional one-line addition
```

Or for directory fallback:
```
Source: directory (DB miss)
```

This helps operators understand the data source during the migration window (while WINT-1020 and WINT-1070 are pending). This is optional and low-risk — implement only if the developer judges it useful.

### Migration Window Communication

The command's "Data Source" section (AC-8) should clearly communicate:
- DB is now the primary source for single-story lookup
- Directory fallback activates automatically if DB is unavailable or returns no result
- During the migration window, DB and directory may disagree — DB is authoritative

This is documentation-level guidance, not a visual UX change.

---

## Future UX Notes

- Once WINT-1020 (Flatten Story Directories) completes, the Location field in single-story output may show a flat path rather than a swim-lane path — this is a future UX concern, not in scope for WINT-1040.
- Once WINT-1070 (Deprecate stories.index.md) completes, the --depth and --deps-order modes may also transition to DB-sourced output. At that point, the swimlane visualization may need updating.

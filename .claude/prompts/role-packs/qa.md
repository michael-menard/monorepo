---
role: qa
version: "1.0.0"
created: "2026-03-02"
token_count: 294
token_method: line-count-proxy (42 non-blank lines x 7 tokens/line)
---

# QA Role Pack

Evidence-based verification. Every AC needs a traceable artifact — file, command output, or test result.

## Decision Rule

```
when: story submitted for QA → trace each AC; emit ac-trace.json
if any AC has no evidence → verdict: needs-evidence; block approval
```

## Pattern Skeleton (ac-trace.json)

```json
{ "story_id": "WINT-0210",
  "traces": [
    { "ac_id": "AC-1", "evidence_type": "file",
      "evidence_path": ".claude/prompts/role-packs/dev.md", "verified": true },
    { "ac_id": "AC-6", "evidence_type": "command_output",
      "evidence_path": "wc -l output (39 non-blank lines)", "verified": true }
  ],
  "verdict": "approved", "unverified_count": 0 }
```

## Proof Requirements

```
inspect: unverified_count == 0 AND verdict: approved
on fail: set verdict: needs-evidence; block approval
```

## Examples

### Positive 1: File evidence

AC-1 traced to `.claude/prompts/role-packs/dev.md`; file exists on disk. verified: true.
Correct: concrete artifact; reproducible.

### Positive 2: Command output evidence

AC-6 traced to `wc -l` output (39 lines measured). verified: true.
Correct: replayable command; specific measurement.

### Negative: Vibes-based approval

AC-3: "Looks good based on review." No file, no command.
Wrong: "Looks good" is not evidence; cite a concrete artifact.

## References

Framework: `.claude/prompts/role-packs/FRAMEWORK.md`

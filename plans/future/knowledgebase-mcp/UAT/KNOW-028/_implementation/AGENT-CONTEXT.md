# Agent Context - KNOW-028

```yaml
feature_dir: plans/future/knowledgebase-mcp
story_id: KNOW-028
base_path: plans/future/knowledgebase-mcp/UAT/KNOW-028/
artifacts_path: plans/future/knowledgebase-mcp/UAT/KNOW-028/_implementation/
story_file: plans/future/knowledgebase-mcp/UAT/KNOW-028/KNOW-028.md
proof_file: plans/future/knowledgebase-mcp/UAT/KNOW-028/PROOF-KNOW-028.md
verification_file: plans/future/knowledgebase-mcp/UAT/KNOW-028/_implementation/VERIFICATION.yaml
phase: qa-verify
started_at: 2026-01-25T21:44:48Z
```

## Package Paths

- **Target Package:** `apps/api/knowledge-base/`
- **Config Module:** `apps/api/knowledge-base/src/config/`
- **Test Setup:** `apps/api/knowledge-base/src/test/`

## Key Files

- Story: `KNOW-028.md`
- Scope: `_implementation/SCOPE.md`
- Implementation Plan: `_implementation/IMPLEMENTATION-PLAN.md` (to be created)
- Proof: `_implementation/PROOF-KNOW-028.md` (to be created)

## Acceptance Criteria Summary

1. AC1: README.md documents all required environment variables
2. AC2: .env.example file with all variables and instructions
3. AC3: Zod-based startup validation with clear error messages
4. AC4: .gitignore protection for .env files
5. AC5: Test configuration with mock environment values

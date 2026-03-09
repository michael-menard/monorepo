---
generated: "2026-02-16"
story_id: WINT-0210
phase: pm-generate
agent: pm-dev-feasibility-review
verdict: CONDITIONAL PASS
blockers: 0
risks: 2
---

# Dev Feasibility Review: WINT-0210

## Verdict: CONDITIONAL PASS

This story is **implementable** with the following conditions:
1. **Preferred:** Complete WINT-0180 AC-2 first to confirm storage location (filesystem recommended)
2. **Alternative:** Proceed with filesystem assumption (`.claude/prompts/role-packs/`) and adapt if WINT-0180 chooses database/hybrid

**No blocking technical issues identified.**

---

## Implementation Complexity: LOW

**Estimate:** 2-3 hours for experienced developer
**Breakdown:**
- Create directory structure: 5 minutes
- Create 4 role pack Markdown files (150-300 tokens each): 90 minutes
- Token count measurement and iteration: 30 minutes
- Create 4 example JSON outputs: 20 minutes
- README documentation: 15 minutes
- QA validation: 20 minutes

**Skill Level:** Junior+ (Markdown authoring, basic Python for token counting)

---

## Technical Risks

### Risk 1: WINT-0180 Storage Decision Pending
**Severity:** Medium
**Impact:** Don't know if role packs go in filesystem, database, or hybrid
**Current Status:** WINT-0180 is ready-to-work, recommends filesystem (`.claude/prompts/role-packs/`)
**Mitigation:**
- Proceed with filesystem implementation (seed recommendation)
- If WINT-0180 chooses database: Migrate files to database table (1-2 hour effort)
- If WINT-0180 chooses hybrid: Keep files, add database cache (2-3 hour effort)
**Resolution:** Accept filesystem approach, document migration path if needed
**Blocking:** No (can proceed with filesystem assumption)

### Risk 2: WINT-0190 Patch Queue Schema Pending
**Severity:** Low
**Impact:** Dev role pack example may not match final schema structure
**Current Status:** WINT-0190 is pending, but specification is available in seed
**Mitigation:**
- Use WINT-0190 specification to create inline patch-plan.json example
- Document in Dev role pack: "Example based on WINT-0190 spec, update when schema available"
- Add follow-up task to update example when WINT-0190 completes
**Resolution:** Create inline example, flag for update
**Blocking:** No (specification is sufficient for example creation)

---

## Reuse Opportunities

### Patterns to Reuse

#### 1. WINT-0200 JSON Schema Pattern
**Source:** `packages/backend/orchestrator/src/schemas/user-flows.schema.json`
**Application:** Template for cohesion-findings.json, scope-challenges.json, ac-trace.json structures
**Effort Savings:** 30 minutes (don't reinvent JSON structure format)

**Example Structure:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "findings": { "type": "array", "maxItems": 5 },
    "blocking": { "type": "array", "maxItems": 2 }
  },
  "required": ["findings", "blocking"]
}
```

#### 2. WINT-0180 Example Framework
**Source:** Seed recommendation (max 2 positive + 1 negative)
**Application:** Structure for examples section in each role pack
**Effort Savings:** 15 minutes (clear format guidance)

#### 3. Expert Personas Structure
**Source:** `.claude/agents/_shared/expert-personas.md`
**Application:** Condense Identity, Mental Models, Red Flags into role pack format
**Effort Savings:** 45 minutes (source material exists, just needs condensing)

**Condensing Strategy:**
- Identity: 1-2 sentences (vs 3-5 paragraphs in expert-personas.md)
- Mental Models: 3-5 bullet points (vs 10-15 paragraphs)
- Red Flags: 1 negative example (vs 5-7 red flags)

#### 4. YAML Frontmatter Pattern
**Source:** All `.agent.md` files
**Application:** Metadata format for role pack versioning
**Effort Savings:** 5 minutes (established convention)

---

## Implementation Approach

### Phase 1: Setup (5 minutes)
1. Create `.claude/prompts/role-packs/` directory
2. Verify tiktoken library available (or install: `pip install tiktoken`)

### Phase 2: Create Role Packs (90 minutes)
For each role (dev, po, da, qa):
1. Draft role pack Markdown (30 minutes per role)
   - YAML frontmatter (version, created, token_count placeholder)
   - Identity section (1-2 sentences)
   - Decision rule (when to apply)
   - Pattern skeleton (10-25 lines)
   - Proof requirements
   - 2 positive examples + 1 negative example
2. Measure token count using tiktoken
3. Iterate to fit 150-300 token budget (condense if over, expand if under)
4. Update `token_count` field in frontmatter

**Token Counting Script:**
```python
import tiktoken

encoder = tiktoken.get_encoding("cl100k_base")

with open('.claude/prompts/role-packs/dev.md') as f:
    content = f.read()
    tokens = encoder.encode(content)
    count = len(tokens)
    print(f"Dev role pack: {count} tokens")

    if count < 150:
        print("⚠️  Under budget - add more detail")
    elif count > 300:
        print("⚠️  Over budget - condense")
    else:
        print("✅ Within budget")
```

### Phase 3: Create Example Outputs (20 minutes)
1. Create example patch-plan.json (Dev role)
   - Demonstrate ordering: types→API→UI→tests→cleanup
   - Max 5 patches per plan (reasonable constraint)
2. Create example cohesion-findings.json (PO role)
   - Max 5 findings, max 2 blocking (hard cap from AC-2)
3. Create example scope-challenges.json (DA role)
   - Max 5 challenges (hard cap from AC-3)
4. Create example ac-trace.json (QA role)
   - Map 3-5 AC IDs to evidence paths

### Phase 4: README Documentation (15 minutes)
1. Create `.claude/prompts/role-packs/README.md`
2. Document:
   - Purpose of role packs
   - Links to WINT-0180, WINT-0190, WINT-0200
   - Consumption patterns (sidecar, direct injection, context-pack)
   - Versioning strategy (increment version when updating)
   - Directory structure

### Phase 5: QA Validation (20 minutes)
1. Run token count measurements (TC-001)
2. Verify example clarity (TC-002)
3. Check hard caps (TC-003)
4. Count pattern skeleton lines (TC-004)
5. Review README completeness (TC-005)
6. Validate example outputs (TC-006)
7. Check YAML frontmatter (TC-007)

---

## Dependencies

### Blocking Dependencies
**None** - Can proceed with filesystem assumption

### Soft Dependencies
1. **WINT-0180** (ready-to-work): Defines storage location
   - **Status:** Can start before completion, seed recommends filesystem
   - **Impact if incomplete:** May need to migrate to database later (low effort)

2. **WINT-0190** (pending): Defines Patch Queue schema
   - **Status:** Can use specification from seed to create inline example
   - **Impact if incomplete:** Example may need update when schema available (trivial)

3. **WINT-0200** (UAT): Defines user-flows.schema.json constraints
   - **Status:** Complete, can reference directly
   - **Impact:** None

---

## Testing Strategy

### No Unit Tests Required
This story creates documentation artifacts (Markdown files). No executable code is produced.

### Manual Validation Tests
- Token count measurement (tiktoken library)
- Example clarity review (PM/Dev)
- Hard cap verification (grep for numbers)
- Pattern skeleton line count (wc -l)
- YAML frontmatter parsing (yamllint)

See TEST-PLAN.md for full validation checklist.

---

## Integration Considerations

### Future Consumption by WINT-2010 (Role Pack Sidecar)
**Requirement:** HTTP endpoint GET /role-pack?role=dev&v=1.0.0
**Compatibility:** Filesystem structure supports direct file read
**No Changes Needed:** Role packs can be read as-is

### Future Consumption by WINT-4xxx Agents
**Requirement:** Agents load role pack content into prompt
**Compatibility:** 150-300 token budget designed for prompt injection
**No Changes Needed:** Role packs fit within agent token budgets

### Versioning for Future Updates
**Requirement:** Ability to update role packs without breaking existing agents
**Strategy:**
- Version in YAML frontmatter (v1.0.0, v1.1.0, etc.)
- Agents can request specific version: `GET /role-pack?role=dev&v=1.0.0`
- Default to latest if no version specified
**No Changes Needed:** Frontmatter includes version field

---

## Alternative Approaches Considered

### Alternative 1: Generate Role Packs with LLM
**Pros:** Could iterate faster, optimize token count automatically
**Cons:** Loses human curation, may produce generic examples
**Decision:** Manual authoring for v1.0.0, consider LLM generation for future iterations

### Alternative 2: Store in Database Only
**Pros:** Centralized storage, easier to query
**Cons:** Harder to version control, requires database access for viewing
**Decision:** Filesystem preferred (WINT-0180 recommendation), database cache optional

### Alternative 3: Single Unified Role Pack
**Pros:** Simpler structure (1 file instead of 4)
**Cons:** Harder to inject specific role context, larger token footprint
**Decision:** Separate role packs (150-300 tokens each) for targeted injection

---

## Estimated Effort

**Total:** 2-3 hours (documentation work)

**Breakdown:**
- Setup: 5 minutes
- Role pack authoring: 90 minutes (22-23 minutes per role)
- Token count iteration: 30 minutes
- Example outputs: 20 minutes
- README: 15 minutes
- QA validation: 20 minutes

**Skill Level:** Junior+ (Markdown, basic Python)

---

## Recommended Implementation Order

1. **Start:** Create directory structure, install tiktoken
2. **Dev role pack first:** Use WINT-0190 spec, includes Patch Queue example
3. **PO role pack second:** Use WINT-0200 schema, includes hard caps
4. **DA role pack third:** Similar to PO (hard caps pattern)
5. **QA role pack fourth:** Simplest (AC→Evidence trace)
6. **README last:** After all role packs complete
7. **QA validation:** Run full test plan checklist

---

## Success Criteria

- ✅ All 4 role packs created (dev.md, po.md, da.md, qa.md)
- ✅ All role packs within 150-300 token budget (measured)
- ✅ All pattern skeletons 10-25 lines
- ✅ All hard caps explicit (PO: max 5/2, DA: max 5)
- ✅ All examples grounded in codebase patterns (not generic)
- ✅ README documents integration, versioning, consumption
- ✅ All example outputs valid JSON

---

## Blockers: NONE

This story is ready to implement. Proceed with filesystem approach.

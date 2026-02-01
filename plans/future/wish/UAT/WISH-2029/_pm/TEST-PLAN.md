# Test Plan - WISH-2029

**Story**: Update architecture documentation for lego-api/domains/ pattern
**Type**: Documentation-only (no code/UI changes)

---

## Scope Summary

- **Endpoints touched:** None (documentation-only)
- **UI touched:** No
- **Data/storage touched:** No
- **Documentation touched:** Yes
  - Primary: `docs/architecture/api-layer.md`
  - Verification: All 6 existing domains (gallery, wishlist, health, instructions, sets, parts-lists)

---

## Happy Path Tests

### Test 1: Documentation Content Completeness

**Setup:**
- Read updated `docs/architecture/api-layer.md`
- Review all 6 existing domains in `apps/api/lego-api/domains/`

**Action:**
- Verify documentation includes all required sections:
  - Directory structure tree showing `domains/{domain}/` pattern
  - Subdirectory responsibilities (application/, adapters/, ports/, routes.ts, types.ts, __tests__/)
  - Hexagonal architecture explanation
  - Example from at least one existing domain
  - "Creating a New Domain" guide
  - Hono framework usage patterns
  - Shared schema patterns

**Expected Outcome:**
- All sections present with accurate content
- Examples match actual codebase structure
- Directory tree reflects current domain structure

**Evidence:**
- Manual review checklist of all sections
- Cross-reference examples against actual domain code
- Screenshot/copy of updated documentation structure

---

### Test 2: Cross-Reference Accuracy

**Setup:**
- Open `docs/architecture/api-layer.md`
- Open `apps/api/lego-api/domains/wishlist/` as reference domain

**Action:**
- Verify documented structure matches actual domain structure
- Check that file paths in examples are correct
- Verify subdirectory descriptions match actual usage

**Expected Outcome:**
- All file paths are accurate
- Directory structure diagram matches actual folders
- Examples use real code patterns from existing domains

**Evidence:**
- Side-by-side comparison of doc vs. actual structure
- Validation that example code snippets exist in codebase
- File tree output from actual domain directory

---

### Test 3: Migration Guidance Clarity

**Setup:**
- Read "Migration Path" section in updated doc
- Review old pattern references (services/{domain}/)

**Action:**
- Verify documentation clearly states:
  - Old pattern: `services/{domain}/` (deprecated)
  - New pattern: `apps/api/lego-api/domains/{domain}/` (canonical)
  - Migration steps for existing code
  - When to use which pattern

**Expected Outcome:**
- Clear distinction between old and new patterns
- Migration path is actionable
- No ambiguity about which pattern to use for new work

**Evidence:**
- Presence of migration section
- Clear statement of canonical pattern
- Step-by-step migration instructions

---

### Test 4: Pattern Consistency Verification

**Setup:**
- Review all 6 domains: gallery, wishlist, health, instructions, sets, parts-lists

**Action:**
- For each domain, verify:
  - Has `application/` subdirectory (business logic)
  - Has `adapters/` subdirectory (infrastructure)
  - Has `ports/` subdirectory (interfaces)
  - Has `routes.ts` (Hono HTTP routes)
  - Has `types.ts` (Zod schemas)
  - Has `__tests__/` directory

**Expected Outcome:**
- All domains follow consistent structure
- Documentation accurately describes the pattern
- Any variations are documented

**Evidence:**
- File tree output for each domain
- Checklist confirming structure presence
- Notes on any structural variations

---

## Error Cases

### Error 1: Documentation Contradicts CLAUDE.md

**Setup:**
- Read updated `docs/architecture/api-layer.md`
- Read `CLAUDE.md` project guidelines

**Action:**
- Check for contradictions between architecture doc and CLAUDE.md
- Verify Zod-first guidance is consistent
- Verify no-barrel-files rule is consistent

**Expected Outcome:**
- No contradictions found
- Both docs promote Zod schemas
- Both docs discourage barrel files
- Architecture doc extends (not contradicts) CLAUDE.md

**Evidence:**
- Cross-reference checklist
- List of potential conflicts (should be empty)
- Confirmation of guideline alignment

---

### Error 2: Outdated References Remain

**Setup:**
- Search `docs/architecture/api-layer.md` for old pattern references

**Action:**
- Search for:
  - `services/{domain}/` (should only appear in migration/historical context)
  - `platforms/aws/endpoints/` (legacy pattern - should be marked as deprecated)
  - Any references to old directory structure

**Expected Outcome:**
- Old patterns only mentioned in migration/historical sections
- Clear labels indicating deprecated patterns
- No misleading guidance suggesting old patterns are current

**Evidence:**
- Grep output for old pattern references
- Context showing deprecated pattern is clearly marked
- Verification that canonical pattern is prominently featured

---

### Error 3: Missing Domain Example

**Setup:**
- Read documentation examples section

**Action:**
- Verify at least one complete domain example is included
- Check that example shows:
  - Full directory structure
  - Sample service code (application/)
  - Sample adapter code (adapters/)
  - Sample route code (routes.ts)
  - Sample type definitions (types.ts)

**Expected Outcome:**
- At least one complete, realistic example
- Example code is copy-pasteable and accurate
- Example demonstrates hexagonal architecture principles

**Evidence:**
- Presence of example code blocks
- Verification that example code matches actual domain
- Completeness checklist for example

---

## Edge Cases (Reasonable)

### Edge 1: Documentation Drift Detection

**Setup:**
- Add "Last Verified" date to documentation

**Action:**
- Verify documentation includes:
  - "Last Verified: YYYY-MM-DD" field
  - Process for updating verification date
  - Trigger for re-verification (e.g., when adding new domains)

**Expected Outcome:**
- Verification date present
- Process documented for keeping docs current

**Evidence:**
- Presence of verification date field
- Description of update process

---

### Edge 2: Cross-Domain Dependencies Example

**Setup:**
- Review wishlist domain's dependency on sets domain (purchase flow)

**Action:**
- Verify documentation addresses:
  - How to handle cross-domain dependencies
  - Dependency injection patterns
  - Service composition across domains

**Expected Outcome:**
- Cross-domain dependency guidance present
- Example shows proper service injection
- Pattern for avoiding circular dependencies

**Evidence:**
- Section on cross-domain dependencies
- Example from actual codebase (wishlist -> sets)
- Dependency injection pattern documented

---

### Edge 3: Testing Strategy for Domains

**Setup:**
- Review `__tests__/` structure in existing domains

**Action:**
- Verify documentation includes:
  - Where to place unit tests (application/)
  - Where to place integration tests (adapters/)
  - Route testing patterns
  - Service mocking strategies

**Expected Outcome:**
- Testing guidance included
- Test organization clear
- Examples of test structure provided

**Evidence:**
- Testing section in documentation
- Test file organization examples
- Testing best practices listed

---

## Required Tooling Evidence

### Documentation Validation

**Manual Review Required:**
1. Open `docs/architecture/api-layer.md` in VS Code
2. Review all sections against acceptance criteria checklist
3. Cross-reference examples against actual domain code
4. Verify no outdated patterns remain (except in migration section)

**File System Verification:**
```bash
# Verify all domains follow documented structure
for domain in gallery wishlist health instructions sets parts-lists; do
  echo "Checking $domain..."
  ls -la apps/api/lego-api/domains/$domain
done

# Check for old pattern usage (should be minimal/zero)
grep -r "services/{domain}" apps/api/ --exclude-dir=node_modules
```

**Documentation Quality Checks:**
- Markdown linting passes
- All links are valid (internal references)
- Code blocks have language tags
- Headings follow logical hierarchy

**Artifacts to Capture:**
- Screenshot/markdown copy of updated doc structure
- File tree outputs showing domain structure consistency
- Grep results showing old pattern references (if any)
- Cross-reference validation checklist

---

## Risks to Call Out

### Risk 1: Documentation Becomes Stale
**Mitigation:** Include "Last Verified" date field and verification process in doc

### Risk 2: Contradictions with CLAUDE.md
**Mitigation:** Explicit cross-check during documentation writing phase

### Risk 3: Incomplete Pattern Coverage
**Mitigation:** Review all 6 existing domains to ensure pattern is consistently applied before documenting

### Risk 4: Ambiguity for Future Implementers
**Mitigation:** Include concrete "Creating a New Domain" step-by-step guide with example

---

## Test Completion Criteria

- [ ] All sections in updated doc match acceptance criteria
- [ ] Examples cross-referenced against actual code
- [ ] Old pattern references only in migration/historical context
- [ ] All 6 domains verified to follow documented pattern
- [ ] CLAUDE.md compatibility confirmed
- [ ] "Last Verified" date field present
- [ ] "Creating a New Domain" guide is actionable
- [ ] Cross-domain dependency pattern documented
- [ ] Testing guidance included
- [ ] Markdown quality checks pass

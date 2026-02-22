# Future Risks: WINT-0180 — Define Examples + Negative Examples Framework

## Non-MVP Risks

### Risk 1: Token counting is manual / tool-dependent

- **Impact**: Developers may produce role instructions that exceed 300 tokens without realizing it, since no automated tool enforces the budget.
- **Recommended timeline**: Post-MVP — WINT-2010 (Role Pack Sidecar) could add token counting at load time.

### Risk 2: No machine-readable conformance validation

- **Impact**: As more pattern specs are created (WINT-0190+), there is no automated way to validate they conform to FRAMEWORK.md. Divergence accumulates over time.
- **Recommended timeline**: Phase 2 — consider a linting script or JSON Schema for `_specs/` files.

### Risk 3: Framework versioning not specified

- **Impact**: FRAMEWORK.md v1 may not accommodate future pattern types. Without versioning, breaking changes cannot be communicated to downstream consumers.
- **Recommended timeline**: Add `version: 1.0.0` frontmatter to FRAMEWORK.md now; establish versioning policy before Phase 2.

---

## Scope Tightening Suggestions

- **Delivery mechanism — sidecar injection**: AC-7 mentions context-pack sidecar injection as a delivery mechanism. This story should only document the injection point (where to inject), NOT implement the sidecar (that is WINT-2020). If the implementation team conflates documentation with implementation, scope will expand.
- **KB MCP storage format**: AC-7 mentions KB MCP as a delivery mechanism via `kb_search`. This story should specify which tags/categories to use, but NOT create KB entries (that is WINT-0210's responsibility).

---

## Future Requirements

- Automated conformance checker for `_specs/` files against FRAMEWORK.md
- Token budget enforcement tool (part of Role Pack Sidecar, WINT-2010)
- FRAMEWORK.md versioning + changelog as the standard evolves
- Example gallery: a `_examples/` directory showing complete worked examples for each role (beyond the skeleton)

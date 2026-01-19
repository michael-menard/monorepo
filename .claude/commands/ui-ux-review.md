# .claude/commands/ui-ux-review.md

Usage:
/ui-ux-review STORY-XXX

You are acting as the UI/UX Agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command performs a **UI/UX review** AFTER implementation (and typically after code review),
focused on:
- design system compliance
- accessibility validation
- performance and standard web metrics
- adherence to required UI tech and patterns

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

Required Tooling (MANDATORY):
- Chrome DevTools (for Lighthouse + performance metrics capture)
- Playwright MCP (for deterministic navigation + screenshots + axe runs)

Authoritative Inputs:
- The story file: STORY-XXX.md
- The Dev proof file: PROOF-STORY-XXX.md
- (Optional but recommended) The code review file: CODE-REVIEW-STORY-XXX.md
- vercel.migration.plan.meta.md
- vercel.migration.plan.exec.md
- uiux.agent.md (UI/UX agent rules; assumed present and authoritative)
- Agent definition file

Preconditions (MANDATORY):
- The UI is runnable locally (per story/proof), e.g. `pnpm dev` (or equivalent)
- If the app cannot be launched, the review MUST FAIL with the blocking reason

Scope:
This review applies ONLY if STORY-XXX touches UI.
If STORY-XXX does not touch UI, output SKIPPED with a brief justification.

Task:
Perform a UI/UX review for STORY-XXX with two categories of checks:

A) Design System Compliance (HARD GATE)
B) Experience Metrics (A11y + Performance) (HARD GATE on a11y; metrics are regression/warn-based unless thresholds exist)

MANDATORY Checks:

1) Design System Compliance (HARD GATE)
Verify changed UI code adheres to the rules defined in uiux.agent.md:
- Tailwind token colors only (no arbitrary colors like `text-[#...]`, `bg-[rgb(...)]`)
- No custom fonts or new font-family usage
- No inline styles in UI components unless explicitly permitted by the story
- shadcn primitives must be imported via:
  `packages/core/app-component-library/src/_primitives/*`
  and follow the canonical pattern:
  `packages/core/app-component-library/src/cards/AppCounterCard.tsx`
- Required tech usage:
  - TypeScript for UI changes
  - Tailwind for styling
  - shadcn via _primitives pattern
  - shared logger package where logging exists (no console.log in production UI)

Evidence requirement:
- Cite file paths (and line references if available) for any violation.

2) Accessibility (HARD GATE)
Using Playwright MCP:
- Navigate to affected routes/pages for STORY-XXX
- Run axe (or equivalent) accessibility scan
- Validate keyboard navigation + focus states for key interactions where applicable

Fail conditions:
- Any critical a11y issue or regression attributable to STORY-XXX
- Missing labels/roles for interactive elements in changed UI

Evidence requirement:
- Include axe summary and the key violations (with selectors/routes).

3) Performance & Standard Web Metrics (Chrome DevTools REQUIRED)
Using Chrome DevTools:
- Run Lighthouse on affected routes/pages
- Record:
  - Performance
  - Accessibility
  - Best Practices
  - SEO (if relevant)
- Capture standard web metrics where available:
  - FCP
  - LCP
  - CLS
  - TTI / INP (as available)

Gating rules for metrics:
- If explicit thresholds exist in your docs, enforce them.
- Otherwise:
  - Regressions caused by STORY-XXX are WARN (or FAIL only if severe and clearly attributable)
  - Non-regressive low scores are WARN, not FAIL

Evidence requirement:
- Include Lighthouse score summary and key metric values per route tested.

4) Visual / Interaction Sanity (RECOMMENDED)
Using Playwright MCP:
- Capture screenshots for the affected views (before/after if baseline exists; otherwise “current”)
- Confirm no obvious layout breakage on common viewport(s)

Output:
Produce ONE markdown file only:
- UI-UX-REVIEW-STORY-XXX.md

The report MUST include:
1) Verdict: PASS / PASS-WITH-WARNINGS / FAIL / SKIPPED
2) Design System Compliance table:
   - token colors only
   - no custom fonts
   - no inline styles
   - shadcn via _primitives
   - pattern matches AppCounterCard
   - logger usage
3) Accessibility results:
   - routes tested
   - axe summary
   - violations list (must-fix vs should-fix)
4) Lighthouse + metrics:
   - routes tested
   - Lighthouse scores
   - FCP/LCP/CLS/etc values
   - regression notes
5) Findings:
   - Violations (must-fix) with evidence
   - Warnings (should-fix) with evidence
   - Info notes (optional)
6) Explicit statement whether STORY-XXX is acceptable to ship from a UI/UX standpoint

Hard Constraints:
- Do NOT implement code
- Do NOT redesign UX
- Do NOT change story scope/AC
- Do NOT generate additional files

Stop when UI-UX-REVIEW-STORY-XXX.md is complete.

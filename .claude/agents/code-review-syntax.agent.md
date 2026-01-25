# Agent: code-review-syntax

## Mission
Verify that code follows ES7+ syntax standards.
Focus on correctness and modern patterns, NOT stylistic preferences.

## Inputs (authoritative)
- STORY-XXX/_implementation/BACKEND-LOG.md (lists touched files)
- STORY-XXX/_implementation/FRONTEND-LOG.md (lists touched files)
- STORY-XXX/PROOF-STORY-XXX.md (lists changed files)

## WHAT TO CHECK (ES7+ Requirements)

These are BLOCKING issues:

1. **Async/Await Usage**
   - Prefer `async/await` over raw Promise chains for readability
   - Proper error handling with try/catch
   - No unhandled promise rejections

2. **Modern Array Methods**
   - Use `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`, `.every()`
   - Avoid `for...in` for arrays (use `for...of` or methods)

3. **Destructuring**
   - Use object/array destructuring where it improves clarity
   - Not required everywhere - use judgment

4. **Spread/Rest Operators**
   - Use spread for object/array copies: `{ ...obj }`, `[...arr]`
   - Use rest for function parameters where appropriate

5. **Optional Chaining & Nullish Coalescing**
   - Use `?.` instead of `&&` chains for property access
   - Use `??` instead of `||` for nullish defaults

6. **Template Literals**
   - Use template literals for string interpolation
   - No string concatenation with `+` for complex strings

7. **Arrow Functions**
   - Use arrow functions for callbacks and short functions
   - Regular functions OK for methods and when `this` binding needed

8. **Const/Let**
   - Use `const` by default
   - Use `let` only when reassignment is needed
   - Never use `var`

## WHAT NOT TO FAIL ON (Stylistic - Do Not Block)

These are preferences, NOT failures:

- Trailing commas vs no trailing commas
- Semicolons vs no semicolons (Prettier handles this)
- Single quotes vs double quotes
- Spaces vs tabs
- Line length (within reason)
- Blank line placement
- Import order (auto-fixed by tooling)
- Bracket placement styles

## Task

1. Identify Touched Files
   - Extract .ts, .tsx, .js, .jsx files from implementation logs

2. Review Syntax Patterns
   - Check for ES7+ compliance
   - Flag outdated patterns (var, raw promises, string concat)
   - Note modern pattern opportunities

3. Categorize Findings
   - BLOCKING: Must fix (var usage, unhandled promises, etc.)
   - SUGGESTION: Could improve (not using optional chaining where helpful)

## Output (MUST WRITE)
Write to:
- STORY-XXX/_implementation/CODE-REVIEW-SYNTAX.md

## Required Structure

```markdown
# Syntax Check: STORY-XXX

## Result: PASS / PASS-WITH-SUGGESTIONS / FAIL

## Files Checked
- <file path>
- ...

## Blocking Issues (must fix)
<numbered list with file:line and code snippet, or "None">

Example format:
1. `src/handlers/list.ts:45` - Uses `var` instead of `const/let`
   ```typescript
   var items = []  // Should be: const items = []
   ```

## Suggestions (optional improvements)
<numbered list with file:line, or "None">

Example format:
1. `src/handlers/list.ts:67` - Could use optional chaining
   ```typescript
   // Current
   if (user && user.profile && user.profile.name)
   // Suggested
   if (user?.profile?.name)
   ```

## Summary
- Blocking issues: <count>
- Suggestions: <count>
```

## Token Tracking

Track bytes read/written and report to the orchestrator:

```markdown
## Worker Token Summary
- Input: ~X tokens (files read)
- Output: ~Y tokens (CODE-REVIEW-SYNTAX.md)
```

The orchestrator aggregates and calls `/token-log` for the code-review phase.

## Completion Signal
- "SYNTAX PASS" if no blocking issues
- "SYNTAX PASS-WITH-SUGGESTIONS" if only suggestions exist
- "SYNTAX FAIL: <count> blocking issues" if blocking issues exist

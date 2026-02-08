# Reference Directory

On-demand content for agents to load when needed. This reduces base context consumption by 40-60% while preserving functionality.

## Structure

```
_reference/
├── examples/        # Code examples, patterns, templates
│   ├── playwright-*.md       # Playwright test patterns
│   ├── api-*.md              # API implementation patterns
│   └── testing-*.md          # Testing patterns
├── schemas/         # YAML/JSON schemas, validation patterns
│   ├── story-schema.md       # Story YAML structure
│   └── verification-*.md     # Verification output schemas
└── patterns/        # Decision patterns, escalation flows
    ├── escalation-*.md       # When to escalate decisions
    └── spawn-*.md            # Agent spawn patterns
```

## Usage

Agents reference this content via lazy loading instructions:

```markdown
## Complex Patterns (Load on Demand)

When implementing multi-step authentication:
1. First read: `.claude/agents/_reference/examples/playwright-auth-patterns.md`
2. Apply patterns to current test
```

## Design Principles

1. **Load on Demand**: Content loaded only when the specific scenario arises
2. **Shareable**: Multiple agents can reference the same file
3. **Versioned**: Content follows semantic versioning like agents
4. **Discoverable**: Clear naming makes it easy to find relevant content

## When to Extract

Content should be extracted to `_reference/` when:

- It's >50 lines of examples or patterns
- It's used by multiple agents
- It's not needed for every invocation
- It contains verbose step-by-step instructions

## When NOT to Extract

Keep content in the agent when:

- It's core mission/identity information
- It's <20 lines
- It's always needed regardless of scenario
- It defines the agent's inputs/outputs

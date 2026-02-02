# Test Fixtures

This directory contains test fixtures for validating agent behavior.

## Structure

```
fixtures/
  STORY-TEST/
    STORY-TEST.md        # Minimal valid story
    _pm/
      TEST-PLAN.md       # Minimal test plan
    _implementation/
      .gitkeep           # Placeholder for artifacts
```

## Usage

### Unit Testing

```typescript
import { resolve } from 'path'

const FIXTURES_DIR = resolve(__dirname, '../fixtures')
const STORY_PATH = resolve(FIXTURES_DIR, 'STORY-TEST/STORY-TEST.md')

// Use in tests
it('should parse story correctly', () => {
  const content = readFileSync(STORY_PATH, 'utf-8')
  // ... assertions
})
```

### Integration Testing

```bash
# Run agent with fixture
claude --agent .claude/agents/my-agent.agent.md \
  --input "Process STORY-TEST" \
  --dry-run
```

## Adding New Fixtures

1. Create a new directory: `fixtures/STORY-NEW/`
2. Add the story file: `STORY-NEW.md`
3. Add required PM artifacts in `_pm/`
4. Add expected outputs in `_implementation/` (if testing output)
5. Document the fixture purpose in this README

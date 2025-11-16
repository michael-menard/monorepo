# Development Workflow

## Local Development Setup

**Prerequisites**:
```bash
# Install Node.js 20 and pnpm 9
node --version  # v20.x
pnpm --version  # 9.x

# Install SST CLI globally
npm install -g sst
```

**Initial Setup**:
```bash
# Clone repo and install dependencies
git clone <repo-url>
cd Monorepo
pnpm install

# Navigate to SST project
cd apps/api/lego-api-serverless

# Copy environment template
cp .env.example .env.local

# Configure AWS credentials
export AWS_PROFILE=lego-moc-dev
export AWS_REGION=us-east-1
```

**Start Development**:
```bash
# Start SST dev mode (Live Lambda Development)
sst dev

# In another terminal, run tests
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run type checking
pnpm check-types
```

**SST Dev Mode**:
- Deploys infrastructure to your personal AWS account (stage: `dev-{username}`)
- Runs Lambda functions locally connected to remote AWS resources
- Hot reload on code changes
- Access to RDS, Redis, OpenSearch in AWS

## Testing Strategy

**Unit Tests** (Vitest):
- Test handler logic with mocked dependencies
- Test utility functions in isolation
- Coverage target: >95%

**Example Unit Test**:
```typescript
// __tests__/unit/functions/mocs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '@/functions/mocs';
import * as dbModule from '@/lib/db/client';

vi.mock('@/lib/db/client');

describe('MOC Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new MOC', async () => {
    const mockDb = vi.spyOn(dbModule, 'db').mockReturnValue({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'moc-123', title: 'Test MOC' }]),
        }),
      }),
    });

    const event = {
      requestContext: {
        http: { method: 'POST' },
        authorizer: { jwt: { claims: { sub: 'user-123' } } },
      },
      body: JSON.stringify({ title: 'Test MOC', type: 'moc' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).data.id).toBe('moc-123');
  });
});
```

**Integration Tests**:
- Test against actual deployed resources in dev environment
- Use `sst deploy --stage test` for ephemeral test stack
- Validate end-to-end API behavior

**Example Integration Test**:
```typescript
// __tests__/integration/mocs.test.ts
import { describe, it, expect } from 'vitest';
import { Resource } from 'sst';

const API_URL = Resource.MyApi.url;
const TEST_TOKEN = process.env.TEST_USER_TOKEN;

describe('MOC API Integration', () => {
  it('should create and retrieve a MOC', async () => {
    const createResponse = await fetch(`${API_URL}/api/mocs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({ title: 'Integration Test MOC', type: 'moc' }),
    });

    expect(createResponse.status).toBe(201);
    const { data } = await createResponse.json();

    const getResponse = await fetch(`${API_URL}/api/mocs/${data.id}`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(getResponse.status).toBe(200);
    const retrievedMOC = await getResponse.json();
    expect(retrievedMOC.data.title).toBe('Integration Test MOC');
  });
});
```

**E2E Tests** (Playwright):
- Existing Playwright tests run against serverless API
- No changes required (API contracts unchanged)
- Run against staging before production deployment

---

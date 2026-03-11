# Test Plan: INST-1102 - Create Basic MOC

Generated: 2026-02-05
Story: INST-1102 - Create Basic MOC
Author: PM Test Plan Worker

---

## Test Strategy Summary

| Test Level | Framework | Coverage Target | Priority |
|------------|-----------|-----------------|----------|
| Unit | Vitest + RTL | Form rendering, validation logic | HIGH |
| Integration | Vitest + MSW | API interaction, error handling | HIGH |
| E2E | Playwright (live API) | Happy path create flow | CRITICAL (ADR-006) |

---

## Unit Tests

### Frontend: CreateMocPage Component

**Location**: `apps/web/app-instructions-gallery/src/pages/__tests__/CreateMocPage.test.tsx`

**Setup**:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateMocPage } from '../CreateMocPage'
import { createTestWrapper } from '../../../test/test-utils'
```

**Test Cases**:

#### TC-U1: Form Renders All Required Fields
```typescript
test('renders create form with all fields', () => {
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create moc/i })).toBeInTheDocument()
})
```

#### TC-U2: Title Field Auto-Focuses on Mount
```typescript
test('auto-focuses title field on mount', async () => {
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  await waitFor(() => {
    expect(screen.getByLabelText(/title/i)).toHaveFocus()
  }, { timeout: 200 })
})
```

#### TC-U3: Title Validation - Required Field
```typescript
test('shows error when title is empty and blurred', async () => {
  const user = userEvent.setup()
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  const titleInput = screen.getByLabelText(/title/i)
  await user.click(titleInput)
  await user.tab() // Blur the field

  expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
})
```

#### TC-U4: Title Validation - Minimum Length
```typescript
test('shows error when title is less than 3 characters', async () => {
  const user = userEvent.setup()
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  const titleInput = screen.getByLabelText(/title/i)
  await user.type(titleInput, 'AB')
  await user.tab()

  expect(await screen.findByText(/minimum 3 characters/i)).toBeInTheDocument()
})
```

#### TC-U5: Submit Button Disabled Until Valid
```typescript
test('submit button disabled when title is invalid', async () => {
  const user = userEvent.setup()
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  const submitButton = screen.getByRole('button', { name: /create moc/i })
  expect(submitButton).toBeDisabled()

  const titleInput = screen.getByLabelText(/title/i)
  await user.type(titleInput, 'My Castle MOC')

  await waitFor(() => {
    expect(submitButton).toBeEnabled()
  })
})
```

#### TC-U6: Loading State During Submission
```typescript
test('shows loading state while creating MOC', async () => {
  const user = userEvent.setup()
  const mockMutate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

  render(<CreateMocPage />, {
    wrapper: createTestWrapper({
      mockMutations: { useCreateMocMutation: mockMutate }
    })
  })

  await user.type(screen.getByLabelText(/title/i), 'My Castle')
  await user.click(screen.getByRole('button', { name: /create moc/i }))

  expect(screen.getByText(/creating/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create moc/i })).toBeDisabled()
})
```

#### TC-U7: Tag Input Multi-Select
```typescript
test('allows adding and removing tags', async () => {
  const user = userEvent.setup()
  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  const tagInput = screen.getByLabelText(/tags/i)
  await user.type(tagInput, 'castle{enter}')
  await user.type(tagInput, 'medieval{enter}')

  expect(screen.getByText('castle')).toBeInTheDocument()
  expect(screen.getByText('medieval')).toBeInTheDocument()

  // Remove tag
  const removeButton = screen.getAllByRole('button', { name: /remove tag/i })[0]
  await user.click(removeButton)

  expect(screen.queryByText('castle')).not.toBeInTheDocument()
})
```

#### TC-U8: Escape Key Cancels Form
```typescript
test('escape key navigates back to gallery', async () => {
  const mockNavigate = vi.fn()
  render(<CreateMocPage />, {
    wrapper: createTestWrapper({ mockNavigate })
  })

  await userEvent.keyboard('{Escape}')

  expect(mockNavigate).toHaveBeenCalledWith({ to: '/mocs' })
})
```

---

## Integration Tests

### Frontend + API Integration

**Location**: `apps/web/app-instructions-gallery/src/pages/__tests__/CreateMocPage.integration.test.tsx`

**Setup**:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { server } from '../../../test/mocks/server'
import { CreateMocPage } from '../CreateMocPage'
import { createTestWrapper } from '../../../test/test-utils'
```

**Test Cases**:

#### TC-I1: Successful MOC Creation
```typescript
test('creates MOC and redirects to detail page', async () => {
  const mockNavigate = vi.fn()
  const user = userEvent.setup()

  server.use(
    rest.post('/api/v2/mocs', (req, res, ctx) => {
      return res(ctx.status(201), ctx.json({
        id: 'moc-123',
        title: 'My Castle',
        description: 'A medieval castle',
        theme: 'Castle',
        tags: ['medieval'],
        createdAt: '2026-02-05T12:00:00Z'
      }))
    })
  )

  render(<CreateMocPage />, { wrapper: createTestWrapper({ mockNavigate }) })

  await user.type(screen.getByLabelText(/title/i), 'My Castle')
  await user.type(screen.getByLabelText(/description/i), 'A medieval castle')
  await user.selectOptions(screen.getByLabelText(/theme/i), 'Castle')
  await user.type(screen.getByLabelText(/tags/i), 'medieval{enter}')

  await user.click(screen.getByRole('button', { name: /create moc/i }))

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/mocs/moc-123' })
  })

  expect(screen.getByText(/moc created/i)).toBeInTheDocument()
})
```

#### TC-I2: POST Request Body Validation
```typescript
test('sends correct request body to API', async () => {
  const user = userEvent.setup()
  let requestBody: any

  server.use(
    rest.post('/api/v2/mocs', async (req, res, ctx) => {
      requestBody = await req.json()
      return res(ctx.status(201), ctx.json({
        id: 'moc-123',
        ...requestBody
      }))
    })
  )

  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  await user.type(screen.getByLabelText(/title/i), 'My Castle')
  await user.type(screen.getByLabelText(/description/i), 'A medieval castle')
  await user.selectOptions(screen.getByLabelText(/theme/i), 'Castle')
  await user.type(screen.getByLabelText(/tags/i), 'medieval{enter}')

  await user.click(screen.getByRole('button', { name: /create moc/i }))

  await waitFor(() => {
    expect(requestBody).toEqual({
      title: 'My Castle',
      description: 'A medieval castle',
      theme: 'Castle',
      tags: ['medieval']
    })
  })
})
```

#### TC-I3: API Validation Error Display
```typescript
test('displays validation errors from API', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/v2/mocs', (req, res, ctx) => {
      return res(ctx.status(400), ctx.json({
        error: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {
            title: ['Title must be unique']
          }
        }
      }))
    })
  )

  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  await user.type(screen.getByLabelText(/title/i), 'Duplicate MOC')
  await user.click(screen.getByRole('button', { name: /create moc/i }))

  expect(await screen.findByText(/title must be unique/i)).toBeInTheDocument()
})
```

#### TC-I4: Network Error Handling
```typescript
test('shows error toast on network failure', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/v2/mocs', (req, res) => {
      return res.networkError('Connection failed')
    })
  )

  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  await user.type(screen.getByLabelText(/title/i), 'My Castle')
  await user.click(screen.getByRole('button', { name: /create moc/i }))

  expect(await screen.findByText(/failed to create moc/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})
```

#### TC-I5: Form State Recovery After Failure
```typescript
test('persists form data to localStorage on failure', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/v2/mocs', (req, res) => {
      return res.networkError('Connection failed')
    })
  )

  render(<CreateMocPage />, { wrapper: createTestWrapper() })

  await user.type(screen.getByLabelText(/title/i), 'My Castle')
  await user.type(screen.getByLabelText(/description/i), 'A medieval castle')
  await user.click(screen.getByRole('button', { name: /create moc/i }))

  await waitFor(() => {
    const stored = localStorage.getItem('mocs:form:recovery')
    expect(JSON.parse(stored!)).toMatchObject({
      title: 'My Castle',
      description: 'A medieval castle'
    })
  })
})
```

---

### Backend: POST /mocs Route

**Location**: `apps/api/lego-api/domains/mocs/__tests__/routes.test.ts`

**Setup**:
```typescript
import { testClient } from '../../test/test-utils'
import { db } from '../../composition'
import { mocInstructionsTable } from '@repo/database-schema'
```

**Test Cases**:

#### TC-B1: Creates MOC with Valid Data
```typescript
test('POST /mocs creates MOC record', async () => {
  const res = await testClient.mocs.$post({
    json: {
      title: 'My Castle',
      description: 'A medieval castle',
      theme: 'Castle',
      tags: ['medieval']
    }
  })

  expect(res.status).toBe(201)
  const body = await res.json()

  expect(body).toMatchObject({
    id: expect.any(String),
    title: 'My Castle',
    description: 'A medieval castle',
    theme: 'Castle',
    tags: ['medieval'],
    userId: 'test-user-id',
    createdAt: expect.any(String)
  })
})
```

#### TC-B2: Validation - Title Required
```typescript
test('returns 400 when title is missing', async () => {
  const res = await testClient.mocs.$post({
    json: {
      description: 'A castle',
      theme: 'Castle'
    }
  })

  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('VALIDATION_ERROR')
})
```

#### TC-B3: Validation - Title Minimum Length
```typescript
test('returns 400 when title is too short', async () => {
  const res = await testClient.mocs.$post({
    json: {
      title: 'AB',
      theme: 'Castle'
    }
  })

  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.details.fieldErrors.title).toContain('minimum 3 characters')
})
```

#### TC-B4: Sets userId from Auth Context
```typescript
test('sets userId from authenticated user', async () => {
  const res = await testClient.mocs.$post({
    json: {
      title: 'My Castle',
      theme: 'Castle'
    },
    headers: {
      'Authorization': 'Bearer test-token'
    }
  })

  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.userId).toBe('test-user-id-from-token')
})
```

#### TC-B5: Generates Slug from Title
```typescript
test('generates URL-friendly slug', async () => {
  const res = await testClient.mocs.$post({
    json: {
      title: 'My Amazing Castle MOC!',
      theme: 'Castle'
    }
  })

  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.slug).toBe('my-amazing-castle-moc')
})
```

#### TC-B6: Requires Authentication
```typescript
test('returns 401 when not authenticated', async () => {
  const res = await testClient.mocs.$post({
    json: {
      title: 'My Castle',
      theme: 'Castle'
    }
    // No Authorization header
  })

  expect(res.status).toBe(401)
})
```

---

## E2E Tests (Playwright - Live API)

**CRITICAL**: Per ADR-006, at least one happy-path E2E test is REQUIRED during dev phase.

**Location**: `apps/web/playwright/tests/instructions/inst-1102-create.spec.ts`

**Configuration**: Use `playwright.legacy.config.ts` (live API, no MSW)

**Environment**:
```bash
VITE_ENABLE_MSW=false
VITE_SERVERLESS_API_BASE_URL=http://localhost:3001
```

**Test Cases**:

#### TC-E1: Happy Path - Create MOC Flow (CRITICAL)
```typescript
test('user can create a new MOC from gallery', async ({ page, browserAuthFixture }) => {
  await browserAuthFixture.signIn()

  // Navigate to gallery
  await page.goto('/mocs')

  // Click Create MOC button
  await page.getByRole('button', { name: /create moc/i }).click()

  // Verify navigation to create page
  await expect(page).toHaveURL('/mocs/new')

  // Fill form
  const titleInput = page.getByLabel(/title/i)
  await expect(titleInput).toBeFocused() // Auto-focus verification
  await titleInput.fill('My Test Castle')

  await page.getByLabel(/description/i).fill('A beautiful medieval castle')
  await page.getByLabel(/theme/i).selectOption('Castle')

  // Add tags
  const tagInput = page.getByLabel(/tags/i)
  await tagInput.fill('medieval')
  await tagInput.press('Enter')
  await tagInput.fill('architecture')
  await tagInput.press('Enter')

  // Submit form
  await page.getByRole('button', { name: /create moc/i }).click()

  // Verify success toast
  await expect(page.getByText(/moc created/i)).toBeVisible()

  // Verify navigation to detail page
  await expect(page).toHaveURL(/\/mocs\/[a-f0-9-]+/)

  // Verify MOC data displayed
  await expect(page.getByRole('heading', { name: 'My Test Castle' })).toBeVisible()
  await expect(page.getByText('A beautiful medieval castle')).toBeVisible()
  await expect(page.getByText('medieval')).toBeVisible()
  await expect(page.getByText('architecture')).toBeVisible()
})
```

#### TC-E2: Validation Prevents Empty Submission
```typescript
test('validation prevents submitting empty form', async ({ page, browserAuthFixture }) => {
  await browserAuthFixture.signIn()
  await page.goto('/mocs/new')

  const submitButton = page.getByRole('button', { name: /create moc/i })

  // Verify button is disabled
  await expect(submitButton).toBeDisabled()

  // Try to submit (should not work)
  await submitButton.click({ force: true }) // Force click to test

  // Verify still on create page (no navigation)
  await expect(page).toHaveURL('/mocs/new')
})
```

#### TC-E3: Escape Key Cancels Form
```typescript
test('escape key returns to gallery', async ({ page, browserAuthFixture }) => {
  await browserAuthFixture.signIn()
  await page.goto('/mocs/new')

  // Type some data
  await page.getByLabel(/title/i).fill('My Castle')

  // Press Escape
  await page.keyboard.press('Escape')

  // Verify navigation back to gallery
  await expect(page).toHaveURL('/mocs')
})
```

---

## Test Data Management

### Test MOCs
```typescript
export const testMocs = {
  basic: {
    title: 'Test MOC Basic',
    description: 'A basic test MOC',
    theme: 'Castle',
    tags: ['test']
  },
  detailed: {
    title: 'Test MOC Detailed',
    description: 'A detailed test MOC with all fields',
    theme: 'Space',
    tags: ['space', 'detailed', 'complete']
  },
  minimal: {
    title: 'Min'  // Edge case: minimum length
  }
}
```

### Database Cleanup
```typescript
afterEach(async () => {
  // Clean up test MOCs
  await db.delete(mocInstructionsTable)
    .where(eq(mocInstructionsTable.userId, 'test-user-id'))
})
```

---

## Coverage Targets

| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| CreateMocPage | 95%+ | 90%+ | Happy path |
| Form validation | 100% | 90%+ | Error cases |
| API routes | 90%+ | 95%+ | Happy path |
| Error handling | 80%+ | 90%+ | Network errors |

---

## Risk Mitigation

### Risk 1: INST-1008 Dependency (BLOCKER)
**Impact**: `useCreateMocMutation` may not exist yet
**Mitigation**:
- Verify INST-1008 (Wire RTK Query) is merged before implementation
- Or mock the mutation hook in tests until available
- Check for hook existence in test setup

### Risk 2: Theme Options Unknown
**Impact**: Theme dropdown values not specified in story
**Mitigation**:
- Coordinate with PM to define theme list
- Use hardcoded test values: `['Castle', 'Space', 'City', 'Other']`
- Document in story elaboration phase

### Risk 3: Slug Generation Collisions
**Impact**: Duplicate slugs cause database errors
**Mitigation**:
- Test collision handling in backend
- Add unique constraint or append ID to slug
- Document slug strategy in story

---

## Test Execution Order

1. **Pre-implementation**: Unit tests for validation logic (TDD approach)
2. **During implementation**: Integration tests for API interaction
3. **Post-implementation**: E2E tests for happy path (ADR-006)
4. **Before PR**: Full test suite passes

---

## Dependencies

- ✅ Vitest + React Testing Library
- ✅ MSW for API mocking
- ✅ Playwright for E2E
- ⚠️ INST-1008: RTK Query mutations (UAT - should be ready soon)
- ✅ Backend database table exists

---

## Acceptance Criteria Coverage Matrix

| AC | Unit | Integration | E2E |
|----|------|-------------|-----|
| AC1: Navigate from gallery | - | - | ✅ TC-E1 |
| AC2: Form renders all fields | ✅ TC-U1 | - | - |
| AC3: Title auto-focus | ✅ TC-U2 | - | ✅ TC-E1 |
| AC4: Inline validation | ✅ TC-U3, TC-U4 | - | ✅ TC-E2 |
| AC5: Submit disabled until valid | ✅ TC-U5 | - | ✅ TC-E2 |
| AC6: Mutation triggered | - | ✅ TC-I1, TC-I2 | ✅ TC-E1 |
| AC7: Success toast + redirect | - | ✅ TC-I1 | ✅ TC-E1 |
| AC8: Backend validation | - | ✅ TC-B2, TC-B3 | - |
| AC9: userId from auth | - | ✅ TC-B4 | - |
| AC10: Slug generation | - | ✅ TC-B5 | - |
| AC11: Database insert | ✅ TC-B1 | - | ✅ TC-E1 |
| AC12: 201 response | ✅ TC-B1 | ✅ TC-I1 | - |
| AC13: API errors display | - | ✅ TC-I3 | - |
| AC14: Escape cancels | ✅ TC-U8 | - | ✅ TC-E3 |
| AC15: Form recovery | - | ✅ TC-I5 | - |

---

## Notes

- **ADR-006 Compliance**: TC-E1 provides required happy-path E2E test with live API
- **ADR-005 Compliance**: E2E tests use `playwright.legacy.config.ts` with `VITE_ENABLE_MSW=false`
- **Reuse from Wishlist**: Test patterns adapted from `AddItemPage.test.tsx` and wishlist E2E tests
- **localStorage**: Form recovery pattern tested per WISH-2032 learnings

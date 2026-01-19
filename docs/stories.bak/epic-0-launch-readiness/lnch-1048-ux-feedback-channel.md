# Story lnch-1048: User Feedback/Support Channel

## Status

Draft

## Story

**As a** user who needs help,
**I want** an easy way to get support or give feedback,
**so that** I can resolve issues and share my thoughts.

## Epic Context

This is **Story 10 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Critical for user retention and issue discovery.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1047: 404 & Error Pages (error page support link)
- lnch-1039: Onboarding Flow (new user help)

## Acceptance Criteria

1. Help/Support link visible in navigation
2. Feedback mechanism exists (form or email)
3. Contact information is accessible
4. FAQ or help content available
5. Error pages include support contact
6. Feedback can include screenshots (optional)
7. Submissions are tracked/responded to

## Tasks / Subtasks

- [ ] **Task 1: Add Support Link to Nav** (AC: 1, 3)
  - [ ] Add "Help" or "Support" link
  - [ ] Link to help page or mailto
  - [ ] Visible on all pages

- [ ] **Task 2: Create Feedback Form** (AC: 2, 6)
  - [ ] Create feedback form component
  - [ ] Fields: type, description, email
  - [ ] Optional screenshot attachment
  - [ ] Submit to backend or email

- [ ] **Task 3: Create Help Page** (AC: 4)
  - [ ] FAQ section
  - [ ] Getting started guide
  - [ ] Contact information
  - [ ] Common troubleshooting

- [ ] **Task 4: Add to Error Pages** (AC: 5)
  - [ ] "Need help?" section on 404
  - [ ] "Contact support" on error page
  - [ ] Include support email/link

- [ ] **Task 5: Set Up Backend** (AC: 7)
  - [ ] Endpoint to receive feedback
  - [ ] Store in database or send email
  - [ ] Integrate with ticketing (optional)

- [ ] **Task 6: Set Up Tracking** (AC: 7)
  - [ ] Track feedback submissions
  - [ ] Create response workflow
  - [ ] Set response time expectations

- [ ] **Task 7: Test Feedback Flow**
  - [ ] Submit test feedback
  - [ ] Verify received
  - [ ] Test screenshot upload

## Dev Notes

### Support Options

| Option | Pros | Cons |
|--------|------|------|
| Email (mailto:) | Simple, no backend | No tracking |
| Google Form | Free, hosted | External, branded |
| In-app Form | Best UX, tracking | Requires backend |
| Intercom/Zendesk | Full support | Cost |

### Simple Mailto Link
```tsx
<a href="mailto:support@legomocs.com?subject=Support Request">
  Contact Support
</a>
```

### In-App Feedback Form
```tsx
const FeedbackFormSchema = z.object({
  type: z.enum(['bug', 'feature', 'question', 'other']),
  description: z.string().min(10).max(2000),
  email: z.string().email().optional(),
  screenshot: z.any().optional(),
})

<form onSubmit={handleSubmit}>
  <Select name="type" label="Type">
    <option value="bug">Bug Report</option>
    <option value="feature">Feature Request</option>
    <option value="question">Question</option>
    <option value="other">Other</option>
  </Select>

  <Textarea
    name="description"
    label="Description"
    placeholder="Tell us what's on your mind..."
  />

  <Input
    name="email"
    type="email"
    label="Email (optional)"
    placeholder="So we can follow up"
  />

  <Input
    name="screenshot"
    type="file"
    accept="image/*"
    label="Screenshot (optional)"
  />

  <Button type="submit">Submit Feedback</Button>
</form>
```

### FAQ Content Structure
```markdown
## Frequently Asked Questions

### Getting Started
- How do I create my first MOC?
- What file types are supported?
- How do I edit a MOC?

### Account
- How do I reset my password?
- How do I delete my account?

### Troubleshooting
- My upload is failing. What should I do?
- I can't log in. What's wrong?

### Contact
For additional help, email support@legomocs.com
```

### Backend Endpoint (Optional)
```typescript
// POST /api/feedback
const FeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'question', 'other']),
  description: z.string(),
  email: z.string().email().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
})
```

## Testing

### Test Requirements
- Unit: Feedback form validation
- Integration: Form submission works
- E2E: Full feedback flow
- Manual: Verify feedback received

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |

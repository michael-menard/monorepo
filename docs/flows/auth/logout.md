---
title: Logout Flow
description: Sign out user and clear all session data
status: active
feature: auth
entry-points:
  - User menu dropdown (any authenticated page)
related-stories: []
e2e-tests: []
created: 2026-01-25
last-verified: 2026-01-25
author: michael
tags:
  - authentication
  - core-flow
  - cognito
  - security
---

# Logout Flow

## Overview

Users sign out via the user menu dropdown. The flow includes a confirmation dialog to prevent accidental logouts. Sign out is global (invalidates all sessions across devices) and clears all local state including API caches.

## Prerequisites

- User must be authenticated

## Flow Diagram

```mermaid
flowchart TD
    A[Any authenticated page] --> B(Click user avatar/menu)
    B --> C[Dropdown opens]
    C --> D(Click "Sign out")
    D --> E[Confirmation dialog]

    E --> F{User confirms?}
    F -->|No| G[Close dialog]
    G --> A

    F -->|Yes| H([authProvider.signOut])
    H --> I[(Cognito global signOut)]
    I --> J[(Clear token manager)]
    J --> K[(Reset RTK Query caches)]
    K --> L[(Dispatch setUnauthenticated)]
    L --> M[/home]
```

## Steps

1. User clicks avatar/name in header (any authenticated page)
2. User menu dropdown opens
3. User clicks "Sign out" option
4. Confirmation dialog appears: "Are you sure you want to sign out?"
5. User clicks "Sign out" to confirm (or "Cancel" to abort)
6. `authProvider.signOut()` called with `global: true`
7. Cognito invalidates all sessions (all devices)
8. Token manager cleared
9. RTK Query caches reset (gallery, wishlist, dashboard, etc.)
10. Redux auth state set to unauthenticated
11. User redirected to home page

## Cleanup Actions

| Action | Purpose |
|--------|---------|
| Cognito signOut (global) | Invalidate tokens on all devices |
| Clear token manager | Stop auto-refresh |
| Reset RTK Query | Clear cached API data |
| setUnauthenticated() | Update Redux state |
| Navigate to home | Exit protected routes |

## Cross-Tab Behavior

- Amplify Hub broadcasts `signedOut` event
- All open tabs receive the event
- Each tab clears its local state
- All tabs redirect to home/login

## Error States

| Error | Trigger | User Message | Recovery |
|-------|---------|--------------|----------|
| NetworkError | API unreachable | "Unable to sign out. Please try again." | Retry or force clear |
| SignOutError | Cognito error | "Sign out failed. Please try again." | Retry |

Note: Even on error, local state should be cleared to prevent stale auth.

## Edge Cases

- **Offline**: Local state cleared, server-side invalidation queued
- **Token already expired**: Still clears local state
- **Multiple tabs**: All tabs sync via Hub events
- **Mid-request**: Pending API calls may fail with 401

## Security Considerations

- **Global sign-out**: Invalidates all sessions, not just current device
- **Cache clearing**: Ensures no sensitive data remains
- **No "remember me"**: Session not preserved after signout
- **Redirect to public page**: Prevents back-button access to protected content

## UX Gaps / TODOs

- [ ] No E2E test coverage
- [ ] No "sign out from all devices" vs "this device only" option
- [ ] No feedback toast on successful logout

## Related Flows

- [Login](./login.md) - Re-authentication after logout

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Initial documentation |

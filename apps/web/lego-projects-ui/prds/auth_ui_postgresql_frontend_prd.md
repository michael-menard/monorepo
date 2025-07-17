---
tags: ['@frontend', '#auth', '#postgresql-compatibility', '#redux', '#zod', '#typescript', '#testing']
priority: 1
---

# 🔄 Auth UI – PostgreSQL Backend Compatibility PRD

## 1. Overview

Updates to the `@repo/auth` UI package to support changes in the authentication backend migration to PostgreSQL. Focus is on schema alignment, API response structure, and seamless user experience.

---

## 2. Responsibilities

- Align frontend field names with new PostgreSQL schema
- Update API response types and flatten structure
- Maintain full zod validation and TS type safety
- Preserve backward compatibility and seamless migration
- Update UI display and hooks for new fields

---

## 3. Zod Schemas

### `UserSchema`
```ts
z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  is_verified: z.boolean(),
  last_login: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
```

### `AuthResponseSchema`
```ts
z.object({
  success: z.boolean(),
  message: z.string(),
  user: UserSchema,
})
```

---

## 4. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Login with PostgreSQL structure | Auth state populated |
| TC02 | Signup returns flat user object | User state correct |
| TC03 | Old-style nested API fallback | Field transformation utility works |
| TC04 | Form validation for updated fields | Fields valid |
| TC05 | Render user data in UI | UI displays formatted fields |
| TC06 | `useAuth` returns updated structure | All fields present |
| TC07 | Redux slice stores updated user | Field names preserved |
| TC08 | Invalid response handled | Error toast shown |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Backend sends old structure | Use transformation utility |
| API returns missing fields | Use defaults or fallback |
| Non-nullable date parsing fails | Fallback to current date |
| Redux hydration mismatch | Reset on login success |

---

## 6. Dependencies

```json
{
  "dependencies": {
    "@repo/auth": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@reduxjs/toolkit": "^2.2.1",
    "react-redux": "^9.1.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "axios": "^1.6.0",
    "js-cookie": "^3.0.5"
  }
}
```

---

## 7. Success Criteria

- [ ] All fields updated to match PostgreSQL schema
- [ ] API response handling updated and tested
- [ ] Redux state and thunks aligned
- [ ] UI components updated with accurate fields
- [ ] Tests cover field mapping and zod validation

---

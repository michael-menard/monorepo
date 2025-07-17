---
tags: ['@backend', '#avatar-upload', '#user-profile-api']
priority: 3
---

# 📄 Profile Page – Backend PRD

## 1. Overview

Outlines backend support for the frontend ProfilePage component: user data retrieval, avatar storage, upload limits, and endpoint protection.

---

## 2. Responsibilities

- Fetch user profile (name, bio, avatar)
- Handle avatar uploads (.jpg, .heic)
- Validate file types and sizes
- Secure profile update endpoints

---

## 3. Suggested Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users/:id` | Fetch profile data |
| POST | `/api/users/:id/avatar` | Upload avatar |
| PATCH | `/api/users/:id` | Update user info |

---

## 4. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | GET profile | Profile data returned |
| TC02 | Valid avatar upload | File saved, URL returned |
| TC03 | Invalid format upload | 400 Bad Request |
| TC04 | Unauthorized upload | 403 Forbidden |
| TC05 | Update name/bio | 200 OK |
| TC06 | Oversized upload | 413 Payload Too Large |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Avatar >10MB | Reject with 413 |
| Upload fails | Return 500 |
| Duplicate filename | Use UUID or hash |
| Unauthorized PATCH | Return 403 |
| Unexpected file structure | Return 422 |

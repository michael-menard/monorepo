---
tags: ['@backend', '#moc-instructions', '#permissions', '#s3', '#postgres', '#elasticsearch', '#security']
priority: 2
---

# 📘 MOC Instructions Library – Backend PRD

## Overview

Backend implementation of the MOC Instructions Library: includes file storage, metadata indexing, permission controls, and Elasticsearch support.

---

## Responsibilities

- Store metadata in PostgreSQL
- Upload/download to/from S3 (user-scoped)
- Index title, tags, description in Elasticsearch
- Enforce that MOCs are visible/editable only by owners
- Validate file types and enforce one instruction file per MOC
- Handle file deletion and access control

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mocs` | Create new MOC with metadata |
| PATCH | `/api/mocs/:id` | Update metadata |
| POST | `/api/mocs/:id/files` | Upload files |
| DELETE | `/api/mocs/:id/files/:fileId` | Delete file |
| GET | `/api/mocs/search?q=` | Full-text search via Elasticsearch |

---

## Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Upload PDF | Saved to S3, metadata in DB |
| TC02 | Upload CSV parts list | Saved and linked |
| TC03 | Enforce file type | Reject unsupported files |
| TC04 | Index tags/title | Search returns result |
| TC05 | Upload second instruction | Replace or reject |
| TC06 | Access another user’s MOC | 403 Forbidden |
| TC07 | Delete file | File removed from S3 |
| TC08 | Invalid file ID | 404 error |
| TC09 | Remove all files | MOC remains but file list is empty |
| TC10 | Elasticsearch down | Fallback UI handles error |

---

## Edge Cases

- Flagged large file fails mid-upload → return error
- Duplicate flagging logic not needed
- No public views → only owners + admins
- File deleted externally (e.g., S3 corruption) → mark as missing

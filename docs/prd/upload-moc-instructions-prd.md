# Upload MOC Instructions Product Requirements Document (PRD)

## 1. Goals and Background Context

### Goals

- Enable registered users to upload their own MOC instruction packages end to end
- Owner-only visibility in MVP: users see only their own uploads
- Validate size/type/extension client- and server-side using env-configured limits
- Persist metadata and asset references; immediate visibility in "My Instructions" after finalize
- Support fields: title, description, PDF (required); optional images (JPEG/PNG/WEBP/HEIC), parts lists (txt/csv/json/xml), tags, theme
- Conform to repo standards (React 19, Zod-first, @repo/ui, AWS serverless, @repo/logger, Tailwind, a11y)

### Background Context

- Current platform supports viewing a gallery but lacks a user upload path, blocking the UGC loop and growth.
- MVP adds a secure owner-only upload flow with Dashboard/Gallery entry points, early validation, and env-based limits. Existing presign/finalize endpoints likely exist; dev will verify and align.

### Change Log

| Date       | Version | Description                                              | Author   |
| ---------- | ------- | -------------------------------------------------------- | -------- |
| 2025-12-06 | 0.1     | Initial PRD draft (Goals, Requirements, UI, Tech, Epics) | PM Agent |

## 2. Requirements

### Functional (FR)

- FR1: Provide "Upload" CTA in Dashboard and in the MOC Instructions Gallery; both open the uploader flow (/dashboard/mocs/upload).
- FR2: Restrict uploader to authenticated users; signed-out users are redirected to sign in then returned to the uploader.
- FR3: Uploader collects title and description (required); tags and theme optional (free text, normalized).
- FR4: Require one PDF (application/pdf) of the instructions.
- FR5: Accept optional images (JPEG/PNG/WEBP/HEIC); max count/size from env.
- FR6: Accept multiple parts lists (txt/csv/json/xml) up to env-configured count/size.
- FR7: Use presigned S3 uploads for all assets; API returns signed URLs and keys.
- FR8: Finalize persists record: id, ownerId, title, slug, description, pdfKey, imageKeys[], partsKeys[], tags[], theme, status=private, timestamps.
- FR9: After finalize, show new instruction in "My Instructions" for the owner (owner-only list/filter).
- FR10: Enforce env-configured limits across presign and finalize.
- FR11: Server-side validation: size, content-type, extension; CSV/JSON schema checks will use provided specs when available.
- FR12: API enforces owner-only read/list/update; non-owners receive 403 without existence leak.
- FR13: Accessible inline errors and error summary; Finalize disabled until required checks pass.
- FR14: Presign failures show retry; log with @repo/logger and user-friendly message.
- FR15: Expired presigned URLs trigger auto-refresh and retry flow.
- FR16: Interrupted uploads support per-file retry; show per-file progress and failure states.
- FR17: Finalize errors are actionable and preserve state; unaffected files not re-uploaded.
- FR18: Finalize is idempotent by uploadToken; duplicate submissions return prior result.
- FR19: Owner-only visibility guaranteed; non-owners get 403 on read/list.
- FR20: Rate limiting: per-user/day; show 429 with next-allowed time; values from env.
- FR21: Invalid types/extensions produce specific messages naming offending files and allowed types.
- FR22: HEIC preview fallback: show "preview not available" placeholder; upload allowed.
- FR23: Session expiry during upload/finalize redirects to sign-in and restores uploader state on return.
- FR24: Per-user slug uniqueness; on 409 suggest an available slug and allow in-place correction.
- FR25: User can remove files pre-finalize; finalize references only current selections.

### Non-Functional (NFR)

- NFR1: Adhere to repo standards (React 19, Zod-first, @repo/ui, @repo/logger, Tailwind, a11y-first, no barrel files).
- NFR2: Accessibility target WCAG AA; ARIA live regions for async/validation messaging.
- NFR3: Limits configurable via env (examples below) and applied uniformly.
- NFR4: Finalize-to-visible target ≤ 60s under normal network.
- NFR5: Security: allowlist content-type + extension; size enforcement; safe S3 keying; 401/403/429/409 mapped consistently.
- NFR6: Resilience: retries for presign/upload; preserve state across transient failures.
- NFR7: Observability: structured logs with correlationId/requestId; no PII beyond ownerId.
- NFR8: Compatibility: HEIC uploads supported; preview fallback if browser unsupported.
- NFR9: Example env keys: UPLOAD_PDF_MAX_MB, UPLOAD_IMAGE_MAX_MB, UPLOAD_IMAGE_MAX_COUNT, UPLOAD_PARTSLIST_MAX_MB, UPLOAD_PARTSLIST_MAX_COUNT, UPLOAD_ALLOWED_IMAGE_FORMATS, UPLOAD_ALLOWED_PARTS_FORMATS, UPLOAD_RATE_LIMIT_PER_DAY, PRESIGN_TTL_MINUTES.
- NFR10: State resilience: preserve form fields locally during session; unsaved-changes guard.
- NFR11: Error messaging must be accessible, specific, and consistent.
- NFR12: Testing: maintain ≥45% global coverage; include unit/integration/E2E per below.

## 3. User Interface Design Goals

- UX Vision: Simple, accessible, resilient flow; validate early; preserve state; consistent design language.
- Interaction Paradigms: Drag-and-drop and pickers; per-file progress; retries; finalize gate; owner-only visibility.
- Core Screens: Dashboard My Instructions; Uploader (/dashboard/mocs/upload); Gallery with Upload CTA; Success/Review; Error/Recovery; Access Denied; (optional) owner detail.
- Accessibility: WCAG AA; ARIA live regions; keyboard operability; focus management.
- Branding: Use @repo/ui, design system, Tailwind; LEGO-inspired sky/teal; consistent empty states and previews.
- Target Platforms: Web Responsive; keyboard alternatives for DnD.

## 4. Technical Assumptions

- Repository: Monorepo with pnpm + Turborepo; shared packages (@repo/ui, @repo/logger, design-system, accessibility, backend utils); Zod-first types; no barrel files.
- Architecture: AWS Serverless (API Gateway + Lambda + S3). Presign → client uploads → Finalize persists metadata and sets owner-only visibility.
- Persistence: Use existing data layer; if missing, DynamoDB single-table. Record fields per FR8.
- S3 keys: {env}/moc-instructions/{ownerId}/{uploadToken}/{category}/{uuid.ext}
- Security: allowlist type/extension; size caps via presign and finalize; signed URL TTL (default 10m, env).
- API (proposed; align if existing): POST /mocs/uploads/presign, POST /mocs/uploads/finalize, GET /mocs/uploads, GET /mocs/uploads/:id.
- Testing Strategy: Unit (client Zod, server validators, slug); Integration (presign/finalize, ACL); E2E (happy + error cases); a11y checks.
- Observability: @repo/logger with correlationId; rate limiting per user/day; friendly 429 UX.
- Email verification: Not required for MVP.

## 5. Epic List

- Epic 1: Backend Upload Pipeline (Presign + Finalize) — Secure, env-configurable upload pipeline, validation, idempotent finalize, owner-only list/read.
- Epic 2: Uploader UX + Dashboard/Gallery Entry Points — Accessible uploader with progress, retries, finalize, and immediate owner visibility.
- Epic 3: Hardening, Edge Cases, and QA/E2E — Unified error model, schema validation hooks, expiry/retry, quotas, comprehensive tests.

## 6. Epic 1 Details: Backend Upload Pipeline

- Story 1.1 Config & Validation Foundations — Env keys + Zod config; fail fast on invalid; unit tests.
- Story 1.2 Presign Endpoint — Validate types/sizes; generate owner-scoped keys; 401/429 handling; integration tests.
- Story 1.3 Finalize Endpoint — Validate payload, verify S3 objects, per-user slug uniqueness, idempotent by uploadToken; integration tests.
- Story 1.4 Owner-Only List/Get — Newest-first; 404 for non-owners; integration tests.
- Story 1.5 Slug Generation — Deterministic slugify; -2 suffixing; unit tests.
- Story 1.6 Rate Limiting & Observability — Per-user/day limits; structured logs; unit tests.

## 7. Epic 2 Details: Uploader UX + Entry Points

- Story 2.1 Routes & CTAs — Upload buttons in Dashboard and Gallery → /dashboard/mocs/upload; auth redirect/return.
- Story 2.2 Form & Validation — Zod-first schemas; inline + summary errors; disable finalize until valid.
- Story 2.3 File UX — DnD and pickers; per-file chips with progress, retry/remove; HEIC placeholder.
- Story 2.4 Presign/Upload Handling — Batched presign; retries; client pre-checks; 401 restore intent.
- Story 2.5 Finalize & Slug Conflict — 409 suggests slug; re-finalize without re-upload; success CTA to My Instructions.
- Story 2.6 State Resilience — Local session state; unsaved-changes prompt; restore after auth.
- Story 2.7 Accessibility — WCAG AA a11y; keyboard nav; automated a11y checks in CI.

## 8. Epic 3 Details: Hardening, Edge Cases, QA/E2E

- Story 3.1 Error Contract — {code,message,details?,correlationId}; map 400/401/403/409/429/5xx; tests.
- Story 3.2 Filename/Content Hardening — Safe keys; reject dangerous names; best-effort magic-byte sniff; tests.
- Story 3.3 Parts Schema Validation — Pluggable CSV/JSON validators; strict vs relaxed mode via env; tests.
- Story 3.4 Expiry & Interrupted Uploads — TTL honored; auto-refresh presign; retry without duplication; tests.
- Story 3.5 Quotas & UX — Enforce per-user/day; 429 UX with next-allowed time; tests.
- Story 3.6 E2E + A11y + Perf — Playwright flows (happy + errors); a11y checks; finalize-to-visible ≤ 60s.

## 9. Next Steps

- UX Expert Prompt: Create a step-by-step uploader flow using @repo/ui with WCAG AA and resilient error/summary patterns; provide wireframes for Dashboard CTA, Uploader, Success, and Error states.
- Architect Prompt: Verify/define presign/finalize endpoints, data model, S3 keying, env config; design idempotency and ACL; propose tests and rate limit middleware.

## 10. Checklist Results Report

- To be populated after running the PM checklist against this document.

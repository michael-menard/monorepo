# Auth Service Hardening PRD (Phases 2+)

Version: 1.0  
Owner: Auth Platform  
Service: `apps/api/auth-service`  
Last updated: 2025-09-01

## Context (What&#39;s done)

- Phase 0 (Build Green) shipped:
  - JWT payload standardized (`sub` + `userId`), required `JWT_SECRET`, no fallback secret
  - `verifyToken` accepts cookie or `Authorization: Bearer` and requires `JWT_SECRET`
  - DB policy hardened: no hardcoded creds; prod requires `MONGO_URI`; prod fails fast on DB errors
  - Server startup: await DB in prod; dev/test continue on DB failure (warn)
- Phase 1 (Security + Operability) shipped:
  - Request body limit `100kb`; CORS by env (prod: `APP_ORIGIN`/`FRONTEND_URL`)
  - Helmet tuned for API (disable CSP, HSTS in prod, COOP/CORP, no-referrer)
  - Structured logging (pino/pino-http) with configurable `LOG_LEVEL`
  - Rate limiting: global for `/api/auth` + per-route (login, signup, forgot, verify, resend)
  - Zod validation middleware (signup, login, verify, forgot, reset, resend)
  - Reset link origin unified (uses `APP_ORIGIN`/`FRONTEND_URL`)

## Goals

- Phase 2: Security hardening and CSRF defense using a header token (double-submit pattern)
- Subsequent phases: Token hashing for reset/verification, refresh token rotation, 2FA, observability, Docker hardening, testing

## Non-Goals

- OAuth/OpenID Connect integrations (out-of-scope for these phases)
- Migrating to a different database or ORM
- UI/Frontend refactors beyond minimal CSRF header adoption

## Assumptions

- Cookie-based session (JWT in `token` cookie) remains for now
- Frontend will send a CSRF header token on all state-changing requests
- `APP_ORIGIN` (or `FRONTEND_URL`) is available in all environments

---

## Phase 2 — CSRF Defense (Header Token) + Token Storage Hardening

### 2.1 CSRF Strategy (Header Token, Double-Submit Cookie)

- Approach
  - Server issues a CSRF token on login and exposes `/api/auth/csrf` to refresh token
  - Token is set in a non-HttpOnly cookie (e.g., `XSRF-TOKEN`) and must be sent back in `X-CSRF-Token` header
  - CSRF middleware rejects state-changing requests if header missing/mismatch or origin not allowed
  - Applies to: POST/PUT/PATCH/DELETE (incl. `/login`, `/sign-up`, `/log-out`, `/reset-password`, `/verify-email`, `/resend-verification`, `/forgot-password`)
- Middleware logic (pseudocode)

  ```ts
  // middleware/csrf.ts
  export function csrf(req, res, next) {
    const method = req.method.toUpperCase()
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next()

    const allowed = new Set(
      ['http://localhost:5173', process.env.APP_ORIGIN, process.env.FRONTEND_URL].filter(Boolean),
    )
    const origin = req.get('origin') || req.get('referer') || ''
    if (
      process.env.NODE_ENV === 'production' &&
      origin &&
      ![...allowed].some(o => origin.startsWith(o))
    ) {
      return res.status(403).json({ success: false, message: 'Invalid origin' })
    }

    const cookieToken = req.cookies['XSRF-TOKEN']
    const headerToken = req.get('x-csrf-token')
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ success: false, message: 'CSRF validation failed' })
    }
    next()
  }
  ```

- Issuance
  - On successful login and signup, set `XSRF-TOKEN` cookie with a cryptographically random value (`crypto.randomBytes(32).toString('hex')`, 2h TTL)
  - Expose `GET /api/auth/csrf` to refresh the CSRF cookie + return token body `{ token }` for convenience
- Frontend Impact
  - Send `X-CSRF-Token` header on all state-changing requests
  - If missing/expired, call `GET /api/auth/csrf` to refresh and retry
  - Continue sending credentials/cookies in requests if cookie-based auth remains

### 2.2 Hash Password Reset + Email Verification Tokens

- Replace plaintext tokens in DB with SHA-256 hash
  - Generation: `raw = crypto.randomBytes(32).toString('hex')`, `hash = sha256(raw)`
  - Persist hash only; send raw via email links or codes
  - Verification compares `sha256(presented)` against stored hash
  - Keep/shorten expiry windows (reset 1h, verify 24h) and consider rate limits on attempts

### 2.3 Error Shape + Codes

- Normalize error responses for auth endpoints:
  - `{ success: false, code: 'VALIDATION_ERROR' | 'INVALID_CREDENTIALS' | 'CSRF_FAILED' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND' | 'ALREADY_VERIFIED' | 'UNAUTHORIZED' | 'FORBIDDEN', message, ... }`
- Consolidate controller try/catch to `next(err)` where appropriate to centralize formatting in `errorHandler`

### 2.4 Logging Improvements

- Add request ID/correlation ID (pino-http generates `req.id`), include `userId` when available (but never PII)
- Reduce noisy logs (remove full user object logs)

### 2.5 Acceptance Criteria

- All state-changing requests without valid `X-CSRF-Token` header fail with 403 and code `CSRF_FAILED`
- CSRF cookie set on login/signup; `GET /api/auth/csrf` returns a new token and sets cookie
- Reset/verification tokens are hashed in DB; plaintext never persisted
- Build green (`pnpm -C apps/api/auth-service run check-types && ... build`)
- Postman/http suite can demonstrate CSRF pass/fail and hashed token flows

---

## Phase 3 — Session & Token Lifecycle

### 3.1 Refresh Token Rotation (Optional if staying simple, but recommended)

- Introduce short-lived access token (JWT in memory or header) + long-lived refresh token (HttpOnly cookie)
- Rotation on each refresh with reuse detection (store refresh token jti in Redis; revoke chain on reuse)
- Endpoints: `POST /api/auth/refresh`, `POST /api/auth/logout` (revoke current session)

### 3.2 Device/Session Management

- Track sessions per user (device name, last active, IP, user-agent)
- Endpoint to list and revoke other sessions

### 3.3 Acceptance Criteria

- Refresh rotates tokens; replayed refresh tokens get rejected and previous sessions invalidated
- Session list and revoke endpoints function and are protected

---

## Phase 4 — 2FA (TOTP) and Advanced Security

### 4.1 TOTP with Backup Codes

- Enroll flow: generate secret + QR, verify code, persist 2FA enabled
- Backup code generation and one-time use
- Login flow: after password, require TOTP if enabled

### 4.2 Email Throttling / Abuse Prevention

- Throttle verification and reset emails per user/IP
- Add hCaptcha/Cloudflare Turnstile on public endpoints if abuse escalates (future)

### 4.3 Acceptance Criteria

- Fully functional 2FA with backup codes, recovery flow, disable flow
- Email throttling in place and tested

---

## Phase 5 — Observability, Health, and Ops

### 5.1 Enhanced Health Checks

- `/api/auth/healthz` (liveness) and `/api/auth/readyz` (readiness: DB connectivity, critical deps)
- Include build info (git sha) and uptime metrics

### 5.2 Metrics & Tracing

- Structured logs already present; optionally add Prometheus metrics (`/metrics`) behind auth or private network
- Optionally add OpenTelemetry tracing hooks for Express/Mongoose

### 5.3 Docker Hardening

- Multi-stage Dockerfile:
  - `pnpm --filter @repo/api-auth-service...` install minimal deps
  - Compile TS; copy dist + pruned `node_modules` to slim runtime
  - Run as non-root; set `EXPOSE` to actual port; add `HEALTHCHECK`
- Compose and k8s manifests (if applicable) updated for liveness/readiness probes

### 5.4 Acceptance Criteria

- Health endpoints integrated with probes
- Image is non-root, small, and starts with `node dist/index.js`
- Healthcheck passes in compose/prod

---

## Phase 6 — Testing Upgrades

### 6.1 Integration Tests (Supertest)

- Cover: signup/login/check-auth, forgot + reset (with hashed tokens), verify + resend, CSRF pass/fail
- Use `mongodb-memory-server` or dockerized Mongo for tests
- Enforce stable, deterministic tests (seeded data, no real email/network)

### 6.2 Coverage Goals

- Lines ≥ 90%, Branches ≥ 85%, Functions ≥ 90%, Statements ≥ 90% (Phase B of DoD)

### 6.3 Acceptance Criteria

- `pnpm test:run`/`pnpm test` for repo achieves configured coverage thresholds for service
- No flaky tests; suite runtime reasonable (< 30s for service)

---

## API Additions/Changes

- New: `GET /api/auth/csrf`
  - Response: `{ token: string }`
  - Sets `XSRF-TOKEN` cookie (non-HttpOnly, sameSite aligned with CORS)
- CSRF header requirement:
  - All state-changing routes require `X-CSRF-Token` header matching `XSRF-TOKEN` cookie in prod
  - Development may relax ORIGIN checks but keep header validation

---

## Frontend Requirements

- Include `X-CSRF-Token` header on POST/PUT/PATCH/DELETE (obtain from cookie or `/api/auth/csrf`)
- On 403 `CSRF_FAILED`, call `/api/auth/csrf`, then retry request
- Continue sending credentials if cookie-based auth remains

---

## Risks & Mitigations

- Risk: CSRF token desync when tabs opened for long periods
  - Mitigate with `/csrf` endpoint and retry logic
- Risk: Inadvertent caching of token responses
  - Mitigate with `Cache-Control: no-store` on CSRF responses
- Risk: Increased complexity with refresh rotation
  - Consider deferring rotation until abuse signals appear

---

## Milestones & Timeline (Indicative)

- Phase 2: 1–2 days (CSRF header token + token hashing + error shape)
- Phase 3: 2–4 days (refresh rotation + sessions)
- Phase 4: 3–5 days (2FA + email throttling)
- Phase 5: 1–2 days (observability + Docker)
- Phase 6: 2–3 days (tests + coverage)

---

## Acceptance (Per Phase)

- Build green (A) + Tests green (B) per repo DoD
- Clear migration notes for frontend (CSRF header) and environment variables
- Updated docs: README-AUTH and this PRD kept in sync

---

## Implementation Notes (Checklist Extract)

- [ ] Add `middleware/csrf.ts` and mount after cookie-parser and before routes
- [ ] Issue CSRF token on login/signup and via `GET /api/auth/csrf` (sets cookie and returns `{ token }`)
- [ ] Require `X-CSRF-Token` on write methods; validate vs cookie
- [ ] Hash reset/verification tokens (store SHA-256, compare on use)
- [ ] Normalize error codes across controllers
- [ ] Add request ID to logs; remove sensitive logs
- [ ] Update Postman/HTTP collection to include CSRF flows
- [ ] Document frontend changes (header + retry on 403)

---

## Open Questions

- Do we want to migrate to Authorization header JWT (stateless) to avoid CSRF altogether? (Future option)
- Should we store CSRF token server-side (e.g., Redis) to allow revocation or stick with double-submit only?
- Do we want to adopt refresh token rotation now or defer until abuse/scale demands?

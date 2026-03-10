---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-5004

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No secrets management infrastructure exists anywhere in the codebase. No AWS Secrets Manager client, no Vault client, and no key-rotation logic is present. All API keys are currently read directly from `process.env` at provider `loadConfig()` time with no abstraction layer.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator provider adapters | `packages/backend/orchestrator/src/providers/` | All four providers (OpenRouter, Anthropic, MiniMax, Ollama) currently read API keys directly from `process.env` inside `loadConfig()` — this is the injection point APIP-5004 must replace or wrap |
| BaseProvider abstract class | `packages/backend/orchestrator/src/providers/base.ts` | Defines `loadConfig(): unknown` as the contract; secrets injection must be compatible with this interface without breaking existing providers |
| Knowledge Base env validation | `apps/api/knowledge-base/src/config/env.ts` | Shows the established Zod-first env-var validation pattern used at startup; the secrets client should follow the same fail-fast validation approach |
| Docker Compose infra | `infra/compose.lego-app.yaml` | Local dev runs PostgreSQL, Redis, Prometheus, Grafana via Compose; secrets in local dev should be injected via `.env` file (no Secrets Manager dependency for local dev) |
| ADR-002: IaC Strategy | `plans/stories/ADR-LOG.md` | Mandates standalone CloudFormation templates in `infra/`; any AWS Secrets Manager resources must be defined as an independent CloudFormation stack |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-5006 — LangGraph Server Infrastructure Baseline | In Elaboration | Defines the server that will host the pipeline; secrets injection strategy must align with whatever process/container model it establishes |
| APIP-5000 — Test Infrastructure Setup for LangGraph Graph Unit Testing | In Elaboration | Test harness must be able to stub the secrets client; the secrets abstraction must be mockable for unit tests |

### Constraints to Respect

- All production DB schemas in `packages/backend/database-schema/` are protected; APIP-5004 must not add tables there (secrets access audit log, if any, lives in the autonomous-pipeline schema)
- `@repo/db` client package API surface is protected; do not modify it
- ADR-002: IaC must use standalone CloudFormation, not SST/CDK/Serverless Framework
- ADR-005: UAT must use real secrets engine (not env-var stubs)
- Zod-first types are required everywhere — no TypeScript interfaces for schemas
- No barrel files; import directly from source

---

## Retrieved Context

### Related Endpoints

None. APIP-5004 is infrastructure-only: no HTTP endpoints are added or modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `AnthropicProvider.loadConfig()` | `packages/backend/orchestrator/src/providers/anthropic.ts:72` | Reads `ANTHROPIC_API_KEY` from `process.env`; primary injection target |
| `OpenRouterProvider.loadConfig()` | `packages/backend/orchestrator/src/providers/openrouter.ts:75` | Reads `OPENROUTER_API_KEY` from `process.env`; primary injection target |
| `MiniMaxProvider.loadConfig()` | `packages/backend/orchestrator/src/providers/minimax.ts:72` | Reads `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` from `process.env`; primary injection target |
| `BaseProvider` abstract class | `packages/backend/orchestrator/src/providers/base.ts` | Defines the `loadConfig()` contract; secrets client must fit this interface |
| `validateEnv()` in KB config | `apps/api/knowledge-base/src/config/env.ts` | Established pattern for Zod-validated startup config; secrets client should follow this pattern |

### Reuse Candidates

- **Zod startup validation pattern** from `apps/api/knowledge-base/src/config/env.ts` — use the same fail-fast `validateEnv()` / `safeValidateEnv()` approach for the secrets client config
- **`generateConfigHash()`** in `packages/backend/orchestrator/src/providers/base.ts:155` — already excludes `apiKey` from hash, which is the correct behavior; keep this working correctly when keys come from secrets engine
- **`@repo/logger`** — use for all secrets access audit log entries (structured JSON output already configured for production)
- **Docker Compose pattern** in `infra/compose.lego-app.yaml` — local dev will continue using `.env` files; the secrets abstraction layer must have a local-dev fallback that reads from environment variables

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Provider config loading (injection target) | `packages/backend/orchestrator/src/providers/anthropic.ts` | Canonical example of how a provider currently loads its API key from env; the secrets client must produce the same value this method returns, making it a drop-in replacement |
| Zod env validation at startup | `apps/api/knowledge-base/src/config/env.ts` | Demonstrates the project's established fail-fast Zod validation pattern for required secrets; the `SecretsClientConfigSchema` and startup validation in APIP-5004 should mirror this structure exactly |
| BaseProvider abstraction | `packages/backend/orchestrator/src/providers/base.ts` | Defines `loadConfig(): unknown` — any secrets injection must remain compatible with this interface without requiring changes to all four provider subclasses |
| IaC CloudFormation stack structure | `infra/elasticache/template.yaml` | Existing example of an independent CloudFormation stack that follows ADR-002; the `infra/secrets/template.yaml` for AWS Secrets Manager should follow the same structure |

---

## Knowledge Context

### Lessons Learned

No domain-specific lessons found in the knowledge base for secrets management patterns in this codebase. The knowledge base returned only general workflow entries. The following is derived from codebase analysis.

- **[Codebase Observation]** All four provider `loadConfig()` methods throw immediately if their API key env var is missing — there is no graceful degradation. The secrets client must maintain this fail-fast behavior and must surface clear error messages when a secret cannot be fetched. *(category: pattern)*
  - *Applies because*: A silent failure to fetch a secret at runtime would cause the escalation chain in APIP-0040 to fail cryptically rather than with a clear "secret unavailable" error.

- **[Codebase Observation]** `generateConfigHash()` in `base.ts` already deliberately excludes `apiKey` from the cache hash to prevent sensitive data leakage. The secrets layer must preserve this invariant. *(category: pattern)*
  - *Applies because*: If the secrets client caches by a hash that includes the key value, it defeats the purpose of the exclusion.

- **[Codebase Observation]** The `.env` file at the monorepo root contains a live `OPENAI_API_KEY` value committed in plaintext — this is the exact anti-pattern that APIP-5004 must remedy for the autonomous pipeline's model API keys. *(category: blocker)*
  - *Applies because*: The autonomous pipeline will manage Anthropic, OpenRouter, and MiniMax keys that must never be committed to the repository.

### Blockers to Avoid (from past stories)

- Do not add Secrets Manager runtime dependency to local development workflow without a `.env` fallback — this would break all developers running the pipeline locally
- Do not couple secrets fetching to `process.env` validation in a way that forces both code paths to be active simultaneously; the abstraction must be either env-based or secrets-engine-based, not both at once
- Do not store secret values in the in-memory config caches (`configCache`) beyond what is strictly required by the provider — keep cached lifetime minimal and controlled

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | All AWS infrastructure (including Secrets Manager resources) must be defined in standalone CloudFormation templates under `infra/`; no SST/CDK/Serverless Framework |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT must connect to the real secrets engine; mocked secrets are only permitted in unit/integration tests |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no UI); however, integration tests that confirm secret fetch → provider instantiation → successful model invocation are the equivalent "happy path" gate |

### Patterns to Follow

- Zod-first schemas for all config/secret value types — `SecretsClientConfigSchema`, `ProviderSecretsSchema`, etc.
- Fail-fast startup validation for the secrets client config (mirror `validateEnv()` pattern)
- `@repo/logger` for all access logging — never `console.log`
- Standalone CloudFormation template per ADR-002
- Provider `loadConfig()` methods remain the single point of key retrieval; the secrets client is injected into or called by those methods, not bypassing them
- Local dev falls back to environment variables (same variables as today: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, etc.) with no secrets engine required

### Patterns to Avoid

- Do not hardcode secret names/ARNs in provider source code; all secret identifiers must be configurable (env var or config file)
- Do not fetch secrets on every model invocation — cache the fetched values for the provider's session lifetime, invalidating only on explicit rotation signal
- Do not add AWS SDK dependencies to packages that do not already have them without consideration of Lambda bundle size (this pipeline runs on a dedicated server, not Lambda, per APIP-5006; bundle size is less critical but still relevant)
- Do not use TypeScript interfaces for schemas — use `z.object()` + `z.infer<>` throughout

---

## Conflict Analysis

### Conflict: Dependency ordering (warning)
- **Severity**: warning
- **Description**: APIP-5004 depends on APIP-0040 (Model Router v1), but APIP-0040 itself is backlog and has no story seed or elaboration started. The secrets injection interface must be designed in coordination with whatever provider-dispatch contract APIP-0040 establishes. If APIP-0040 introduces a new `getModel(modelString)` factory that replaces the per-provider `loadConfig()` pattern, APIP-5004's injection point may need to change.
- **Resolution Hint**: Design the secrets abstraction as a standalone `SecretsClient` module that any code can call, rather than coupling it tightly to the current per-provider `loadConfig()` pattern. This way APIP-0040's refactoring does not require APIP-5004 to be re-done.
- **Source**: baseline + codebase analysis

### Conflict: Scope overlap with APIP-5003 (warning)
- **Severity**: warning
- **Description**: APIP-5003 (Security Hardening and Network Boundary) also mentions "secrets management integration" in its infrastructure list. There is a risk of scope overlap between the two stories — APIP-5003 focuses on network isolation and container hardening while APIP-5004 owns the secrets engine implementation, but neither story currently has clear boundaries about who owns the Docker secrets / container environment variable injection.
- **Resolution Hint**: Explicitly scope APIP-5004 as owning the secrets client library and AWS Secrets Manager CloudFormation resources. Explicitly scope APIP-5003 as owning Docker container-level secret mounting and network boundary rules. The two stories should cross-reference each other's outputs.
- **Source**: index analysis (both stories in backlog, no elaboration yet)

---

## Story Seed

### Title

Secrets Engine and API Key Management for Autonomous Pipeline

### Description

**Context**: The autonomous pipeline's model router (APIP-0040) dispatches work across four LLM provider APIs: Anthropic, OpenRouter, MiniMax, and Ollama. Currently, all four provider adapters in `packages/backend/orchestrator/src/providers/` read their API keys directly from `process.env` at `loadConfig()` time — there is no abstraction layer, no rotation capability, and no audit trail for key access. A `.env` file containing live keys is the only mechanism. For a locally-run development tool this is acceptable; for an autonomous pipeline that runs autonomously on a dedicated server, it is not.

**Problem**: The pipeline needs API keys to be stored securely, retrievable without embedding them in `.env` files on the server filesystem, rotatable without restarting the pipeline process, and auditable so that any key fetch is logged. The current `process.env` pattern provides none of these properties.

**Proposed Solution Direction**: Introduce a `SecretsClient` module (under `packages/backend/orchestrator/src/secrets/` or a new `packages/backend/secrets-client/` package) that wraps AWS Secrets Manager for server deployments and falls back to environment variables for local development. The four provider `loadConfig()` methods are refactored to call `SecretsClient.get(secretName)` instead of reading `process.env` directly. A corresponding CloudFormation stack in `infra/secrets/template.yaml` defines the Secrets Manager resources following ADR-002. Access audit logging is emitted via `@repo/logger` at each `get()` call.

### Initial Acceptance Criteria

- [ ] AC-1: A `SecretsClient` module exists with a `get(secretName: string): Promise<string>` method that retrieves a secret value from AWS Secrets Manager when `SECRETS_ENGINE=aws-secrets-manager` is set, or falls back to `process.env[secretName]` when `SECRETS_ENGINE=env` (default for local dev)
- [ ] AC-2: The `SecretsClient` config is validated at instantiation time using a Zod schema; if `SECRETS_ENGINE=aws-secrets-manager` is set without a valid `AWS_REGION` or required IAM context, the client throws a clear startup error (fail-fast pattern matching `validateEnv()` in `apps/api/knowledge-base/src/config/env.ts`)
- [ ] AC-3: `AnthropicProvider.loadConfig()`, `OpenRouterProvider.loadConfig()`, and `MiniMaxProvider.loadConfig()` are refactored to retrieve their API keys via `SecretsClient.get()` instead of reading `process.env` directly; the returned config shape and caching behaviour are unchanged
- [ ] AC-4: `SecretsClient.get()` emits a structured log entry via `@repo/logger` for each cache-miss fetch (secret name, engine used, latency in ms) — this is the audit log for secrets access; no sensitive value is logged
- [ ] AC-5: Fetched secret values are cached in-memory for a configurable TTL (default 5 minutes) to avoid hammering Secrets Manager on every model invocation; the cache is invalidated when the client is reset or the TTL expires
- [ ] AC-6: An `infra/secrets/template.yaml` CloudFormation stack defines AWS Secrets Manager secret resources for `anthropic-api-key`, `openrouter-api-key`, and `minimax-api-key` following ADR-002 standalone stack conventions
- [ ] AC-7: A rotation policy is documented (not automated in MVP) — the README or stack description explains the manual rotation procedure: update the secret in AWS Secrets Manager, then signal the pipeline process to flush its in-memory cache (e.g., via `SIGHUP` or a CLI command stub)
- [ ] AC-8: Unit tests cover: (a) `env` fallback mode correctly reads from `process.env`, (b) `aws-secrets-manager` mode calls the AWS SDK client (mocked), (c) cache hit avoids a second SDK call, (d) a missing secret in env fallback mode throws with the same error shape as today's provider errors
- [ ] AC-9: Local development workflow is unaffected — developers can run the pipeline with `SECRETS_ENGINE=env` (the default) and their existing `.env` file without any AWS credentials required
- [ ] AC-10: The `SecretsClient` module is exported from its package with a clear public API; all Zod schemas follow the project's Zod-first convention (`SecretsClientConfigSchema`, etc.)

### Non-Goals

- Automated secret rotation (e.g., Lambda rotation function) — deferred; MVP rotation is manual
- HashiCorp Vault integration — AWS Secrets Manager is the target for this story; Vault is a future option
- Secrets management for non-model-API credentials (e.g., database connection strings) — APIP-5004 focuses on model API keys; DB credentials are handled separately and their current pattern (env var at container start) is acceptable for the MVP server
- A UI or operator CLI for secret management — that is APIP-5005 scope
- Automatic cache invalidation via AWS Secrets Manager rotation events (SNS/EventBridge) — deferred to a later story in Phase 2
- Modifying any protected DB schema packages (`packages/backend/database-schema/`) or the `@repo/db` client

### Reuse Plan

- **Patterns**: Zod startup validation from `apps/api/knowledge-base/src/config/env.ts`; provider `loadConfig()` caching pattern from `packages/backend/orchestrator/src/providers/anthropic.ts`; CloudFormation standalone stack structure from `infra/elasticache/template.yaml`
- **Packages**: `@repo/logger` for audit logging; `@aws-sdk/client-secrets-manager` (new dependency, to be added to the orchestrator package or a new `packages/backend/secrets-client` package)
- **Components**: `BaseProvider` abstract class — the `loadConfig()` override in each provider is the injection point; no changes to the abstract interface itself are required

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The critical test boundary is the `SecretsClient.get()` method: unit tests must mock the AWS SDK (`@aws-sdk/client-secrets-manager`) and confirm env-fallback vs. secrets-engine code paths are exercised independently
- Integration tests (not UAT) should confirm that the three refactored `loadConfig()` methods successfully produce valid config objects when `SecretsClient` is backed by mocked secrets
- UAT per ADR-005 must use a real AWS Secrets Manager instance in the staging environment — a test secret (with a non-sensitive dummy value) should be pre-created in the `infra/secrets/template.yaml` stack for UAT purposes
- There is no UI component — ADR-006 E2E requirements do not apply; the "happy path" gate is an integration test that confirms `SecretsClient.get('ANTHROPIC_API_KEY')` → `AnthropicProvider.loadConfig()` → `provider.checkAvailability()` returns true
- Test for the negative case: `SECRETS_ENGINE=aws-secrets-manager` with no AWS credentials should fail at startup, not silently at first model invocation

### For UI/UX Advisor

- No UI surface is introduced by this story. Not applicable.
- If APIP-5005 (Minimal Operator Visibility CLI) later needs to surface secrets status (e.g., "secrets loaded successfully" vs. "using env fallback"), the `SecretsClient` should expose a `getStatus(): SecretsClientStatus` method; flag this as a future hook during feasibility review.

### For Dev Feasibility

- **Primary implementation location**: `packages/backend/orchestrator/src/secrets/` — a new subdirectory within the existing orchestrator package is preferred over a new top-level package to keep the dependency graph simple at this stage
- **AWS SDK**: `@aws-sdk/client-secrets-manager` must be added as a dependency; confirm the orchestrator package's build target (Node.js ESM) is compatible with the v3 modular SDK before implementation
- **Injection strategy**: The simplest approach is a module-level singleton `SecretsClient` that the three provider `loadConfig()` methods call; avoid constructor injection for now to minimise refactoring surface area against the `BaseProvider` interface
- **Cache TTL**: 5-minute default is reasonable; make it configurable via `SECRETS_CACHE_TTL_MS` env var following the existing pattern in `LLMProviderConfigSchema`
- **Canonical references for subtask decomposition**:
  1. `packages/backend/orchestrator/src/providers/anthropic.ts` — refactoring target for AC-3
  2. `apps/api/knowledge-base/src/config/env.ts` — pattern for AC-2 (Zod startup validation)
  3. `packages/backend/orchestrator/src/providers/base.ts` — verify `generateConfigHash()` still excludes `apiKey` after refactoring (AC-3 side effect)
  4. `infra/elasticache/template.yaml` — structural template for AC-6 CloudFormation stack
- **Risk**: The `configCache` static fields on each provider class mean the first call to `loadConfig()` caches the secret value for the process lifetime. If a secret is rotated, the provider will continue using the old value until process restart. Ensure AC-7's rotation documentation explicitly calls this out.
- **APIP-5003 coordination**: Confirm with APIP-5003 author who owns Docker container secret mounting — APIP-5004 owns the `SecretsClient` library; APIP-5003 should own whether secrets are mounted as Docker secrets vs. env vars in the container definition.

# Secrets Engine Infrastructure

CloudFormation stack for AWS Secrets Manager secrets used by the Autonomous Pipeline (APIP-5004).

## Overview

This stack creates three `AWS::SecretsManager::Secret` resources for provider API keys:
- `ANTHROPIC_API_KEY` — Anthropic Claude API
- `OPENROUTER_API_KEY` — OpenRouter multi-model access
- `MINIMAX_API_KEY` — MiniMax AI API

The secrets are created without values (`SecretString` is intentionally omitted from the template). Inject values after deployment using the AWS CLI or Console.

---

## Deployment

```bash
# Deploy to staging
aws cloudformation deploy \
  --template-file infra/secrets/template.yaml \
  --stack-name staging-apip-secrets \
  --parameter-overrides Environment=staging \
  --region us-east-1

# Deploy to production
aws cloudformation deploy \
  --template-file infra/secrets/template.yaml \
  --stack-name production-apip-secrets \
  --parameter-overrides Environment=production \
  --region us-east-1
```

---

## Injecting Secret Values

After the stack is deployed, inject values via AWS CLI:

```bash
# Anthropic
aws secretsmanager put-secret-value \
  --secret-id staging/autonomous-pipeline/ANTHROPIC_API_KEY \
  --secret-string "sk-ant-..."

# OpenRouter
aws secretsmanager put-secret-value \
  --secret-id staging/autonomous-pipeline/OPENROUTER_API_KEY \
  --secret-string "sk-or-..."

# MiniMax
aws secretsmanager put-secret-value \
  --secret-id staging/autonomous-pipeline/MINIMAX_API_KEY \
  --secret-string "..."
```

---

## Manual Rotation Procedure

AWS Secrets Manager does **not** auto-rotate these secrets (no rotation Lambda is configured). Rotate manually as follows:

1. Generate the new API key in the provider's console (Anthropic / OpenRouter / MiniMax).
2. Stage the new key in AWS Secrets Manager without removing the old one:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id <secret-id> \
     --secret-string "new-key-here"
   ```
3. **Signal running processes** to pick up the new value (see Pickup Pattern below).
4. Verify the new key is working (check application logs).
5. Revoke the old key in the provider's console.

---

## Pickup Pattern: How Rotated Secrets Are Picked Up

### Process-Lifetime `configCache` Limitation

Provider classes (`AnthropicProvider`, `OpenRouterProvider`, `MinimaxProvider`) use **static `configCache`** fields. Once a provider loads its config (via `loadConfig()`), the config — including the API key — is cached for the **lifetime of the process**.

This means: **updating Secrets Manager does NOT automatically update running processes.**

### Option A: Process Restart (simplest)

The safest way to pick up a rotated secret is to restart the process:

```bash
# Lambda: Deploy a new function version or update the function code
aws lambda update-function-code --function-name my-function ...

# ECS: Force a new deployment
aws ecs update-service --cluster my-cluster --service my-service --force-new-deployment
```

### Option B: SIGHUP + flush() Signal Pattern

For long-running processes, attach a `SIGHUP` handler at startup:

```typescript
import { secretsClient } from './secrets/index.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { OpenRouterProvider } from './providers/openrouter.js'
import { MinimaxProvider } from './providers/minimax.js'

process.on('SIGHUP', async () => {
  // 1. Flush the SecretsClient cache
  secretsClient.flush()

  // 2. Clear provider static config caches
  AnthropicProvider.clearCaches()
  OpenRouterProvider.clearCaches()
  MinimaxProvider.clearCaches()

  // 3. Prefetch fresh values
  await secretsClient.prefetch([
    'ANTHROPIC_API_KEY',
    'OPENROUTER_API_KEY',
    'MINIMAX_API_KEY',
    'MINIMAX_GROUP_ID',
  ])

  logger.info('Secrets rotated and caches refreshed via SIGHUP')
})
```

Send the signal to trigger rotation pickup:

```bash
kill -HUP <pid>
```

---

## Environment Variable Mode (Local Dev)

When `SECRETS_ENGINE` is unset or set to `env`, `SecretsClient` reads directly from `process.env`. No AWS credentials required.

Set the following in your `.env` file:

```bash
SECRETS_ENGINE=env                     # (default — can be omitted)
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
```

---

## Cross-Story Dependency: APIP-5006

The server infrastructure entrypoint (**APIP-5006**) MUST call `secretsClient.prefetch()` before the model router initializes. Example:

```typescript
// server entrypoint
import { secretsClient } from '@repo/orchestrator/secrets'

// Called at startup, before provider factory is used
await secretsClient.prefetch([
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY',
  'MINIMAX_API_KEY',
  'MINIMAX_GROUP_ID',
])

// Now providers can safely call getSync() in loadConfig()
const router = new ModelRouter()
```

---

## IAM Requirements

The Lambda execution role must have permission to read these secrets:

```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": [
    "arn:aws:secretsmanager:us-east-1:*:secret:staging/autonomous-pipeline/*"
  ]
}
```

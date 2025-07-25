# 🔁 CI/CD and Infra Rules

- Use GitHub Actions workflows for CI
- Every push must run:
  - `turbo run lint test build --since=origin/main`
- Only changed apps/packages should deploy
- Deployments handled via Serverless Framework
- Use `.codecov.yml` to enforce coverage targets
- CI must never pass if lint or test fail

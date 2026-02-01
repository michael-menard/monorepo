# Future Opportunities - KNOW-017

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No infrastructure deployment roadmap | Medium | Low | Create architectural decision record (ADR) documenting Docker vs AWS PostgreSQL strategy. Include timeline for AWS migration if planned, or explicit "Docker-only for foreseeable future" decision. |
| 2 | Docker PostgreSQL encryption at rest | Low | Medium | Explore Docker volume encryption for local development if sensitive data needs protection. Note: Typically YAGNI for local dev environments. |
| 3 | Backup/restore DR procedures (KNOW-015) tested only against Docker | Low | Low | If AWS RDS deployment planned, validate KNOW-015 disaster recovery runbook works with AWS RDS snapshots vs. Docker pg_dump approach. Update documentation for AWS-specific procedures. |
| 4 | No AWS account/IAM setup documented | High | Medium | If AWS deployment planned, create prerequisite story for AWS account setup, IAM roles/policies, billing alerts, and access control. Critical before any AWS resource provisioning. |
| 5 | Multi-environment connection string management | Medium | Low | Document how DATABASE_URL differs between local/staging/production. Define environment variable management strategy (AWS Secrets Manager, Parameter Store, or .env files). |
| 6 | SSL/TLS enforcement strategy undefined | Medium | Low | Story mentions SSL/TLS for RDS but Docker setup doesn't enforce it. Document when SSL becomes mandatory (production only vs. all environments). Consider pgBouncer for connection pooling + SSL termination. |
| 7 | Compliance framework requirements not validated | Low | Low | AC8 asks to clarify compliance scope but doesn't validate whether any compliance is actually required. Document YAGNI decision if no SOC2/HIPAA/PCI-DSS requirements. Create compliance checklist if needed. |
| 8 | Performance baseline for encryption overhead | Medium | Medium | Cannot validate "encryption overhead < 5%" claim without pre-encryption baseline metrics. If AWS deployment planned, establish performance baseline first, then measure post-encryption impact. |
| 9 | Staging environment not documented | High | High | Story assumes staging RDS environment exists for testing encryption migration. No staging AWS RDS documented in project. Define staging environment strategy (required vs. test in production). |
| 10 | Key rotation testing approach undefined | Low | Medium | Story enables annual KMS key rotation but no validation procedure for rotation events. If AWS deployment planned, create runbook for testing key rotation without production impact. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Document-first approach for encryption | Low | Low | If AWS deployment is distant future, create encryption runbook now as reference architecture. Reduces implementation time when AWS migration actually happens. |
| 2 | Database-level encryption alternatives | Low | Medium | Explore pgcrypto PostgreSQL extension for application-level column encryption in Docker. Interim solution if specific sensitive fields need encryption before AWS migration. Trade-off: Application complexity vs. transparent RDS encryption. |
| 3 | Secrets management improvement | Medium | Low | Enhance .env.example with security best practices even for local development. Document secure handling of DATABASE_URL, OPENAI_API_KEY, and future AWS credentials. |
| 4 | Infrastructure decision documentation | High | Low | Create `docs/ARCHITECTURE-DECISIONS.md` (or ADR format) capturing Docker vs AWS rationale, migration triggers, cost-benefit analysis. Prevents future confusion and re-litigation of decisions. |
| 5 | Cost calculator for AWS deployment | Low | Low | If AWS planned, create cost estimation spreadsheet: RDS instance class, storage, IOPS, KMS keys, data transfer, automated backups, snapshots. Helps prioritize AWS migration vs. Docker-only strategy. |
| 6 | Docker Compose encryption exploration | Low | Medium | Research if Docker volume encryption is possible/valuable for local sensitive data. Linux LUKS encryption, macOS FileVault for Docker.raw, Windows BitLocker. Likely overkill for local dev but useful for compliance scenarios. |
| 7 | Environment parity documentation | Medium | Low | Document intentional differences between local/staging/production (e.g., Docker vs RDS, encryption vs. no encryption, SSL vs. no SSL). Avoids confusion and sets expectations. Follows 12-factor app "dev/prod parity" principle. |
| 8 | Security compliance checklist | Low | Low | Create reusable security checklist applicable to any data store: encryption at rest, encryption in transit, access control, audit logs, key rotation, backup encryption. Useful beyond just PostgreSQL. |
| 9 | Monitoring-first approach | Medium | Medium | Define encryption health metrics even if AWS implementation deferred. Sets expectation for future AWS setup. Example metrics: KMS key access failures, RDS encryption credential errors, snapshot encryption status. |
| 10 | Disaster recovery dry-run with encryption | Medium | High | If encryption is eventually implemented on AWS RDS, update KNOW-015 DR procedures to include encrypted snapshot restore testing. Validate key access during restore, cross-region encrypted snapshot copy (if multi-region DR planned). |

## Categories

- **Edge Cases**: Encryption key rotation events, KMS key deletion scenarios, cross-region encrypted snapshot copies, performance impact of encryption on high-throughput workloads
- **UX Polish**: Transparent encryption enablement (no application code changes), automated key rotation with zero downtime, encryption status dashboard
- **Performance**: Measure encryption overhead on read/write latency, IOPS impact, CPU utilization during encryption migration
- **Observability**: CloudWatch alarms for KMS key access failures, RDS encryption credential errors, encryption status monitoring, audit trail for key usage (CloudTrail)
- **Integrations**: AWS Systems Manager Parameter Store for encrypted connection strings, AWS Secrets Manager for KMS key access, cross-account KMS key grants for shared services

# Future Opportunities - WISH-2027

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Automated enum validation checks in CI/CD | Medium | Medium | Create pre-deployment validation that checks enum values match across environments before migration runs |
| 2 | Enum value usage analytics | Low | Low | Add CloudWatch metrics to track which enum values are actively used vs deprecated |
| 3 | Enum modification rollback automation | Medium | High | Build tooling to automate rollback scenarios (e.g., data migration scripts for enum deprecation) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Shared enum validation in Zod schemas | High | Medium | Create automated sync between database ENUMs and Zod schemas to prevent drift (mentioned in Risk 5) |
| 2 | Enum-to-table migration automation | Medium | High | Build migration generator that automates conversion from ENUM to lookup table pattern |
| 3 | Multi-environment enum sync dashboard | Low | Medium | Create admin dashboard showing enum values across local/staging/production for drift detection |
| 4 | Enum modification approvals workflow | Low | Medium | Add approval workflow for enum changes that affect multiple teams (e.g., frontend + backend coordination) |
| 5 | Database migration testing framework | High | High | Create automated testing framework that validates migrations in isolated environment before production (general improvement beyond WISH-2027) |

## Categories

### Documentation Polish
- Add visual diagrams for enum evolution decision trees
- Create video walkthrough of enum modification procedures
- Add troubleshooting section with common error messages and solutions

### Testing Infrastructure
- Automated enum value consistency checks across environments
- Mutation testing for enum migration scripts (verify they handle edge cases)
- Load testing for enum additions under high transaction volume

### Observability
- CloudWatch alerts for enum modification attempts in production
- Audit logging for all enum changes with approval trail
- Usage heatmap dashboard showing which enum values are most/least used

### Developer Experience
- VS Code extension that validates enum usage in code against database
- Git pre-commit hook that warns when adding new enum values without documentation update
- Interactive CLI tool for guided enum modification (wizard-style)

### Architecture Evolution
- Decision framework for when to migrate from ENUMs to lookup tables
- Cost-benefit analysis template for ENUM vs table pattern
- Migration path documentation for other immutable database features

# Story lnch-1019: VPC Troubleshooting Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a VPC troubleshooting runbook,
**so that** I can diagnose and resolve network issues.

## Epic Context

This is **Story 1 of Launch Readiness Epic: Infrastructure Runbooks Workstream**.
Priority: **Medium** - Required for network troubleshooting.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1013: Lambda Troubleshooting (connectivity issues)
- lnch-1015: Database Troubleshooting (DB connectivity)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/vpc-troubleshooting.md`
2. Documents VPC architecture diagram
3. Documents subnet configuration
4. Documents NAT Gateway issues
5. Documents VPC Endpoint troubleshooting
6. Documents security group debugging
7. Documents connectivity testing

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/vpc-troubleshooting.md`
  - [ ] Add problem/solution format

- [ ] **Task 2: Document Architecture** (AC: 2)
  - [ ] VPC CIDR configuration
  - [ ] AZ distribution
  - [ ] Subnet layout diagram

- [ ] **Task 3: Document Subnets** (AC: 3)
  - [ ] Public vs private subnets
  - [ ] Lambda subnet placement
  - [ ] Route table configuration

- [ ] **Task 4: Document NAT Gateway** (AC: 4)
  - [ ] NAT Gateway location
  - [ ] Common failure modes
  - [ ] Cost implications
  - [ ] Dev environment (no NAT)

- [ ] **Task 5: Document VPC Endpoints** (AC: 5)
  - [ ] S3 endpoint
  - [ ] Secrets Manager endpoint
  - [ ] CloudWatch Logs endpoint
  - [ ] When endpoints vs NAT

- [ ] **Task 6: Document Security Groups** (AC: 6)
  - [ ] Lambda security groups
  - [ ] RDS security groups
  - [ ] Debugging inbound/outbound rules

- [ ] **Task 7: Document Testing** (AC: 7)
  - [ ] Connectivity test Lambda
  - [ ] VPC Reachability Analyzer
  - [ ] Flow logs analysis

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/vpc-troubleshooting.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers diagnostics, connectivity testing, common fixes

2. **Playbook**: `docs/operations/playbooks/network-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers connectivity failures, NAT issues, security group incidents

The runbook is the diagnostic guide; the playbook is the incident response flow.

---

### VPC Configuration (from serverless.yml)
- CIDR: /24 (256 addresses)
- AZs: 2
- Public Subnets: 2
- Private Subnets: 2
- NAT Gateway: staging/production only

### Subnet Layout
```
VPC: 10.0.0.0/24
├── Public Subnet A:  10.0.0.0/26  (64 addresses)
├── Public Subnet B:  10.0.0.64/26 (64 addresses)
├── Private Subnet A: 10.0.0.128/26 (64 addresses)
└── Private Subnet B: 10.0.0.192/26 (64 addresses)
```

### VPC Endpoints (Dev Only)
Dev uses VPC endpoints instead of NAT Gateway:
- `com.amazonaws.us-east-1.s3` (Gateway)
- `com.amazonaws.us-east-1.secretsmanager` (Interface)
- `com.amazonaws.us-east-1.logs` (Interface)

### Common Issues

**Lambda can't reach internet**
- Check NAT Gateway exists (staging/prod)
- Check route table points to NAT
- Check VPC endpoint for dev

**Lambda can't reach RDS**
- Check security group allows inbound 5432
- Check Lambda is in same VPC
- Check subnet routing

## Testing

### Verification
- Diagram matches actual infrastructure
- Troubleshooting steps are actionable
- Commands work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |

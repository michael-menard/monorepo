# Security Review PRD

## Meta
- Tag: ops-security-review
- Owner: TBD
- Timeline: TBD
- Related: code-quality-prd.md, ci workflow

## Overview
Establish a security review process, scanning, and documentation to ensure zero high-severity vulnerabilities and safe patterns.

## Goals
- Automated scanning in CI and manual checklist for reviews
- Documented security guidelines and procedures

## Non-Goals
- Penetration testing (tracked separately)

## Constraints & Standards (Must-Follow)
- pnpm audit; eslint-plugin-security; optional Snyk
- No secrets in code; safe links; CSP-friendly patterns

## Dependencies & Environments
- GitHub Actions; optional Snyk

## Acceptance Criteria (per vertical slice)
- Phase A: scripts + CI steps present
- Phase B1: unit guards for unsafe client patterns
- Phase B2: N/A
- Phase C: N/A
- Phase D: N/A
- Phase E: CI gates high severity findings

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Small tasks with A..E subtasks

## Deliverables
- Security checklist, CI gates, docs

## Rollout / Risks
- False positives → tune rules, document allows

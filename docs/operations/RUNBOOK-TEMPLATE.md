# Runbook: [Title]

> **Status:** Draft | Active | Deprecated
> **Owner:** [Team/Person]
> **Last Reviewed:** YYYY-MM-DD
> **Next Review:** YYYY-MM-DD

## Overview

Brief description of what this runbook covers and when to use it.

## Prerequisites

- [ ] Access to AWS Console / CLI configured
- [ ] Required permissions: [list specific IAM roles/permissions]
- [ ] Tools installed: [list required tools]
- [ ] Environment variables set: [list required env vars]

## Quick Reference

| Item | Value |
|------|-------|
| Service | [Service name] |
| Environment | dev / staging / production |
| Dashboard | [Link to monitoring dashboard] |
| Logs | [Link to CloudWatch/logging] |
| Alerts | [Link to alert configuration] |

## Procedure

### Step 1: [Action Name]

**Purpose:** Why this step is needed

```bash
# Command to execute
command --with-flags
```

**Expected Output:**
```
What you should see
```

**If this fails:**
- Check [specific thing]
- See [Troubleshooting](#troubleshooting) section

### Step 2: [Action Name]

**Purpose:** Why this step is needed

```bash
# Command to execute
command --with-flags
```

**Verification:**
```bash
# How to verify success
verification-command
```

### Step 3: [Action Name]

Continue pattern...

## Verification

How to confirm the entire procedure completed successfully:

- [ ] Verification check 1
- [ ] Verification check 2
- [ ] Verification check 3

## Rollback

If something goes wrong, follow these steps to revert:

### Rollback Step 1

```bash
# Rollback command
```

### Rollback Step 2

```bash
# Rollback command
```

## Troubleshooting

### Issue: [Common Problem 1]

**Symptoms:**
- What you might see

**Cause:**
- Why this happens

**Resolution:**
```bash
# Fix command
```

### Issue: [Common Problem 2]

**Symptoms:**
- What you might see

**Cause:**
- Why this happens

**Resolution:**
```bash
# Fix command
```

## Escalation

If this runbook does not resolve the issue:

1. **First escalation:** [Team/Person] - [contact method]
2. **Second escalation:** [Team/Person] - [contact method]
3. **Emergency:** [On-call process]

## Related Resources

- [Link to related runbook]
- [Link to architecture docs]
- [Link to service documentation]

## Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | [Name] | Initial version |

---

## Template Usage Notes

Delete this section when creating an actual runbook.

### When to Create a Runbook

- Routine operational tasks (deployments, backups, rotations)
- Incident response procedures
- Maintenance windows
- Data migrations
- Environment setup

### Best Practices

1. **Be explicit** - Assume the reader is stressed and unfamiliar
2. **Include verification** - Every step should be verifiable
3. **Provide rollback** - Always have a way to undo
4. **Test regularly** - Run through the procedure periodically
5. **Keep current** - Update when systems change
6. **Link to monitoring** - Include dashboards and logs

### Naming Convention

```
runbook-[service]-[action].md
```

Examples:
- `runbook-api-deployment.md`
- `runbook-database-backup.md`
- `runbook-certificate-rotation.md`

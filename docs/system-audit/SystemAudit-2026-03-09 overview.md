# Automation Workflow Audit Checklist

This checklist is designed to help systematically audit an automated development workflow that uses agents, orchestration, sidecars, and LLMs.

The goal is to clearly distinguish:

* what **exists today**
* what is **planned**
* what is **hypothetical**

and to identify **cost drivers, duplicate reasoning, and automation debt**.

This document is meant to be **filled out gradually**. Partial answers are perfectly acceptable.

---

# 1. System Overview

## Project / System Name

* [ ] Name of automation system:

## Primary Goal

What is the system intended to do?

Examples:

* automated software development
* story elaboration and implementation
* automated code review

Answer:

```
```

---

# 7. Token Cost Estimate

Estimate token usage per step if known.

Example:

| Step           | Avg Tokens | Fail Rate |
| -------------- | ---------- | --------- |
| Elaboration    | 20k        | 5%        |
| Implementation | 12k        | 30%       |

Fill in:

```
Step:
Average tokens:
Failure rate:
```

---

# 10. Hypotheses / Ideas

List ideas that exist but are not yet committed.

Examples:

* agent consolidation
* cheaper elaboration models
* caching research results

```
Idea:
Reason for considering:
```

---

# 11. Known Pain Points

Where is the system currently struggling?

Examples:

* story elaboration cost
* retry loops
* excessive context retrieval

```
```

---

# 12. Success Criteria

Define measurable goals for the workflow.

Examples:

* tokens per story < 100k
* retry rate < 20%
* premium model usage < 15%

Fill in:

```
```

---

# Final Goal

By completing this document, the system should have a **complete map of:**

* workflow steps
* agents
* knowledge base structure
* skills
* commands
* scripts
* sidecar services

This enables identification of:

* duplicate agents
* redundant research
* excessive token usage
* unused infrastructure
* opportunities to replace LLM reasoning with deterministic tools


# Final Notes

The goal of this checklist is **clarity, not perfection**.

Once completed, the system can be evaluated for:

* redundant agents
* repeated reasoning
* context duplication
* unnecessary premium model usage

This information will enable targeted improvements without introducing duplicate work or redesigning already planned features.

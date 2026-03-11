# 2. Workflow Map

List every major stage in the automation pipeline.

Example stages:

* Story Intake
* Story Elaboration
* Context Retrieval
* Planning
* Implementation
* Code Review
* QA
* Retry Loop
* Escalation

Fill in the workflow below.

```
1.
2.
3.
4.
5.
6.
7.
8.
9.
```

---

# 3. Step-by-Step Workflow Details

For **each workflow step**, fill out the following template.

Duplicate this section for each step.

---

## Step Name

Example: Story Elaboration

```
Step Name:
```

### State

Choose one:

* [ ] Implemented
* [ ] Planned
* [ ] Hypothesis

---

### Description

What does this step do?

```
```

---

### Models Used

Example:

* Claude Opus
* GPT-4
* Qwen 2.5 Coder

```
```

---

### Agents Involved

Example:

* elaboration orchestrator
* UI reviewer
* security reviewer
* SRE reviewer

```
```

---

### Retry Behavior

Does this step retry?

* [ ] No retries
* [ ] Manual retry
* [ ] Automated retry

If retries exist:

```
max retries:
retry trigger:
```

---

### Known Problems

Examples:

* high token cost
* frequent retries
* unclear outputs
* redundant research

```
```

---
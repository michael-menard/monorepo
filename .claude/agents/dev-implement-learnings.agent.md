# Agent: dev-implement-learnings

## Mission
After a story completes, extract lessons learned to improve future implementations.
This is a lightweight retrospective that builds institutional knowledge.

## Inputs (authoritative)
- STORY-XXX/STORY-XXX.md
- STORY-XXX/PROOF-STORY-XXX.md
- STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
- STORY-XXX/_implementation/BACKEND-LOG.md (if exists)
- STORY-XXX/_implementation/FRONTEND-LOG.md (if exists)
- STORY-XXX/_implementation/BLOCKERS.md (if exists)
- STORY-XXX/_implementation/VERIFICATION.md

## Analysis Questions

1. **Reuse Discoveries**
   - Were any reusable packages/utilities discovered during implementation that weren't in the plan?
   - Should these be added to a "known reuse targets" reference?

2. **Blockers Encountered**
   - What blocked progress?
   - Was it foreseeable? How could future plans avoid it?

3. **Plan Accuracy**
   - Did the plan's "Files to Touch" match reality?
   - Were there surprise files that needed changes?

4. **Time Sinks**
   - What took longer than expected?
   - What patterns should future agents watch for?

5. **Verification Failures**
   - Did fast-fail catch anything?
   - Did final verification find issues that fast-fail missed?

6. **Token Usage Analysis** (REQUIRED - read from TOKEN-SUMMARY.md)
   - What was the total token usage for this story?
   - Which phase consumed the most tokens? Why?
   - Which sub-agent was most expensive? What files did it read?
   - Were there any redundant file reads across agents?
   - What high-cost operations could have been avoided?

## Output (MUST UPDATE)

**1. Append story entry to:**
- plans/stories/LESSONS-LEARNED.md

**2. Update Token Usage Summary table:**
- Find the "Story Token Costs" table at the top
- Fill in the row for STORY-XXX with totals from TOKEN-SUMMARY.md

**3. Update High-Cost Operations Registry (if applicable):**
- If any operation in this story used >10k tokens, add it to the registry
- Include mitigation strategy based on what you learned

Create LESSONS-LEARNED.md if it doesn't exist.

## Required Structure (append for each story)

---

## STORY-XXX: <title>
Date: <timestamp>

### Reuse Discoveries
- <package/utility discovered>: <where it could be reused>

### Blockers Hit
- <blocker>: <how to avoid in future>

### Plan vs Reality
- Files planned: <count>
- Files actually touched: <count>
- Surprise files: <list>

### Time Sinks
- <area>: <why it took long>

### Verification Notes
- Fast-fail caught: <what>
- Final verification caught: <what>

### Token Usage Analysis
- **Total tokens:** <input + output>
- **Most expensive phase:** <phase> (<tokens>) - <reason>
- **Most expensive sub-agent:** <agent> (<tokens>)
- **High-cost operations:**
  - <operation>: <tokens> - <could it be avoided?>
- **Redundant reads:** <files read by multiple agents>
- **Optimization opportunities:**
  - <specific recommendation>

### Recommendations for Future Stories
- <actionable recommendation>

---

## Completion Signal
End with "LEARNINGS CAPTURED".

## Notes
- Keep entries concise (5-10 bullet points total)
- Focus on actionable insights, not complaints
- This file grows over time - future planners should read recent entries

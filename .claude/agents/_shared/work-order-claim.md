# Work Order Claim/Release Protocol — OBSOLETE

> **This file is obsolete.** The `WORK-ORDER-BY-BATCH.md` filesystem artifact has been replaced by the KB `workflow.stories` table.
>
> Parallel conflict prevention is now handled by the `kb_update_story_status` guard in each orchestrator command:
>
> ```javascript
> kb_update_story_status({ story_id: '{STORY_ID}', state: 'in_progress', phase: 'implementation' })
> // Guard: If already `in_progress`, STOP — story is being worked by another agent.
> ```
>
> Do NOT reference or use `WORK-ORDER-BY-BATCH.md` in any agent or command.

-- Restore 57 incorrectly cancelled WINT stories back to backlog.
-- The batch-elaborate.sh relevance checker wrongly assumed all WINT-prefixed
-- stories were tied to the dead wint.* DB schemas.

BEGIN;

-- Disable all triggers on workflow.stories
ALTER TABLE workflow.stories DISABLE TRIGGER ALL;

-- Restore all cancelled WINT stories to backlog and clear the blocked_reason
UPDATE workflow.stories
SET state = 'backlog',
    blocked_reason = NULL,
    updated_at = NOW()
WHERE story_id IN (
  'WINT-0050', 'WINT-0060', 'WINT-0140', 'WINT-0260', 'WINT-0270',
  'WINT-1010', 'WINT-1040', 'WINT-1170',
  'WINT-3080', 'WINT-3090', 'WINT-3100',
  'WINT-5010', 'WINT-5020', 'WINT-5030', 'WINT-5040', 'WINT-5050',
  'WINT-5060', 'WINT-5070', 'WINT-5080', 'WINT-5090', 'WINT-5100',
  'WINT-5110', 'WINT-5120', 'WINT-5130', 'WINT-5140',
  'WINT-6010', 'WINT-6020', 'WINT-6030', 'WINT-6040', 'WINT-6050',
  'WINT-6060', 'WINT-6070', 'WINT-6080', 'WINT-6090',
  'WINT-7030', 'WINT-7040', 'WINT-7050', 'WINT-7060', 'WINT-7070',
  'WINT-7080', 'WINT-7090', 'WINT-7100', 'WINT-7110', 'WINT-7120',
  'WINT-7130',
  'WINT-8010', 'WINT-8020', 'WINT-8030', 'WINT-8040', 'WINT-8050',
  'WINT-8060', 'WINT-8070', 'WINT-8080', 'WINT-8090',
  'WINT-9080', 'WINT-9100', 'WINT-9107'
)
AND state = 'cancelled';

-- Re-enable all triggers
ALTER TABLE workflow.stories ENABLE TRIGGER ALL;

COMMIT;

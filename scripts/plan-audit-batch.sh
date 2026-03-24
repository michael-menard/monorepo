#!/usr/bin/env bash
#
# plan-audit-batch.sh — Audit all KB plans against current codebase reality
#
# Uses `claude -p` to run /plan-audit for each plan, accumulating results
# into a single .claude/plan-audit-{date}.json file.
#
# Usage:
#   ./scripts/plan-audit-batch.sh                    # Audit all non-terminal plans
#   ./scripts/plan-audit-batch.sh --status draft     # Only draft plans
#   ./scripts/plan-audit-batch.sh --dry-run          # List plans without auditing
#   ./scripts/plan-audit-batch.sh --auto-apply       # Auto-archive ARCHIVE verdicts
#   ./scripts/plan-audit-batch.sh --resume           # Skip already-audited plans
#   ./scripts/plan-audit-batch.sh --slug SLUG        # Audit a single plan
#   ./scripts/plan-audit-batch.sh --model sonnet     # Use a specific model (default: sonnet)
#   ./scripts/plan-audit-batch.sh --limit 5          # Only audit first N plans
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
AUDIT_FILE="$REPO_ROOT/.claude/plan-audit-${DATE}.json"
STATUS_FILTER=""
DRY_RUN=false
AUTO_APPLY=false
RESUME=false
SINGLE_SLUG=""
MODEL="sonnet"
LIMIT=0
MAX_BUDGET="1.00"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)    STATUS_FILTER="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    --auto-apply) AUTO_APPLY=true; shift ;;
    --resume)    RESUME=true; shift ;;
    --slug)      SINGLE_SLUG="$2"; shift 2 ;;
    --model)     MODEL="$2"; shift 2 ;;
    --limit)     LIMIT="$2"; shift 2 ;;
    --budget)    MAX_BUDGET="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--status STATUS] [--dry-run] [--auto-apply] [--resume] [--slug SLUG] [--model MODEL] [--limit N] [--budget USD]"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ─── Step 1: Get plan list from KB ───────────────────────────────────────────

echo "=== Plan Audit Batch — $DATE ==="
echo ""
echo "Fetching plans from KB..."

PLAN_LIST_PROMPT="List all plans from the KB. Call kb_list_plans with limit 100. For each plan that is NOT archived, superseded, or implemented, output EXACTLY one line in this format (no extra text):
PLAN|{planSlug}|{status}|{priority}|{title}

If a --status filter is provided, only include plans matching that status.
Status filter: ${STATUS_FILTER:-none}

Output ONLY the PLAN| lines, nothing else. No markdown, no explanations."

PLAN_LINES=$(claude -p \
  --model "$MODEL" \
  --max-budget-usd 0.50 \
  --allowedTools "mcp__knowledge-base__kb_list_plans" \
  --no-session-persistence \
  "$PLAN_LIST_PROMPT" 2>/dev/null \
  | grep '^PLAN|' || true)

if [[ -z "$PLAN_LINES" ]]; then
  echo "No plans found matching criteria."
  exit 0
fi

# If single slug mode, filter to just that slug
if [[ -n "$SINGLE_SLUG" ]]; then
  PLAN_LINES=$(echo "$PLAN_LINES" | grep "|${SINGLE_SLUG}|" || true)
  if [[ -z "$PLAN_LINES" ]]; then
    echo "Plan '$SINGLE_SLUG' not found or already in terminal state."
    exit 1
  fi
fi

TOTAL=$(echo "$PLAN_LINES" | wc -l | tr -d ' ')
echo "Found $TOTAL plans to audit."
echo ""

# ─── Step 2: Initialize audit file if needed ─────────────────────────────────

if [[ ! -f "$AUDIT_FILE" ]]; then
  cat > "$AUDIT_FILE" <<INIT
{
  "auditDate": "$DATE",
  "totalPlans": $TOTAL,
  "audited": 0,
  "summary": {},
  "entries": []
}
INIT
  echo "Created audit file: $AUDIT_FILE"
else
  echo "Appending to existing audit file: $AUDIT_FILE"
fi

# Load already-audited slugs for --resume
AUDITED_SLUGS=""
if [[ "$RESUME" == true ]] && [[ -f "$AUDIT_FILE" ]]; then
  AUDITED_SLUGS=$(python3 -c "
import json, sys
with open('$AUDIT_FILE') as f:
  data = json.load(f)
for e in data.get('entries', []):
  print(e.get('slug', ''))
" 2>/dev/null || true)
fi

# ─── Step 3: Dry run or audit ────────────────────────────────────────────────

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN — Plans that would be audited:"
  echo ""
  printf "%-4s %-45s %-16s %s\n" "#" "SLUG" "STATUS" "PRIORITY"
  echo "---- --------------------------------------------- ---------------- --------"
  N=0
  while IFS='|' read -r _ slug status priority title; do
    N=$((N + 1))
    SKIP=""
    if echo "$AUDITED_SLUGS" | grep -qx "$slug" 2>/dev/null; then
      SKIP=" (skip: already audited)"
    fi
    printf "%-4d %-45s %-16s %-8s %s%s\n" "$N" "$slug" "$status" "$priority" "$title" "$SKIP"
  done <<< "$PLAN_LINES"
  echo ""
  echo "Total: $N plans. Run without --dry-run to audit."
  exit 0
fi

# ─── Step 4: Audit each plan ─────────────────────────────────────────────────

COUNT=0
SKIPPED=0
RESULTS=()

while IFS='|' read -r _ slug status priority title; do
  # Check resume
  if [[ "$RESUME" == true ]] && echo "$AUDITED_SLUGS" | grep -qx "$slug" 2>/dev/null; then
    SKIPPED=$((SKIPPED + 1))
    echo "[skip] $slug (already audited)"
    continue
  fi

  COUNT=$((COUNT + 1))

  # Check limit
  if [[ "$LIMIT" -gt 0 ]] && [[ "$COUNT" -gt "$LIMIT" ]]; then
    echo ""
    echo "Reached limit of $LIMIT plans. Stopping."
    break
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$COUNT/$TOTAL] Auditing: $slug"
  echo "  Title:    $title"
  echo "  Status:   $status"
  echo "  Priority: $priority"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  AUTO_APPLY_FLAG=""
  if [[ "$AUTO_APPLY" == true ]]; then
    AUTO_APPLY_FLAG="--auto-apply"
  fi

  # Build the prompt for claude -p
  AUDIT_PROMPT="Run /plan-audit $slug $AUTO_APPLY_FLAG

IMPORTANT: After completing the audit analysis, you MUST output the JSON entry in a fenced block like this:

\`\`\`json:audit-entry
{
  \"slug\": \"$slug\",
  \"title\": \"...\",
  ... full entry following the schema in .claude/skills/plan-audit/SKILL.md Step 5 ...
}
\`\`\`

This JSON block is machine-parsed by the batch script. Do not skip it."

  # Run the audit
  AUDIT_OUTPUT=$(claude -p \
    --model "$MODEL" \
    --max-budget-usd "$MAX_BUDGET" \
    --no-session-persistence \
    "$AUDIT_PROMPT" 2>/dev/null || true)

  # Extract the JSON entry from the output
  ENTRY_JSON=$(echo "$AUDIT_OUTPUT" | sed -n '/```json:audit-entry/,/```/p' | sed '1d;$d' || true)

  if [[ -z "$ENTRY_JSON" ]]; then
    # Fallback: try to extract any JSON block with "slug" and "verdict"
    ENTRY_JSON=$(echo "$AUDIT_OUTPUT" | python3 -c "
import sys, re, json
text = sys.stdin.read()
# Find JSON blocks
matches = re.findall(r'\`\`\`json?\s*\n(.*?)\n\`\`\`', text, re.DOTALL)
for m in matches:
    try:
        obj = json.loads(m)
        if 'slug' in obj and 'verdict' in obj:
            print(json.dumps(obj))
            sys.exit(0)
    except:
        pass
# Last resort: build minimal entry
print(json.dumps({
    'slug': '$slug',
    'title': '$title',
    'status': '$status',
    'priority': '$priority',
    'verdict': 'UNKNOWN',
    'verdictRationale': 'Failed to parse structured output from audit agent',
    'rawOutput': text[:2000]
}))
" 2>/dev/null || true)
  fi

  if [[ -n "$ENTRY_JSON" ]]; then
    VERDICT=$(echo "$ENTRY_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('verdict','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")

    # Append entry to audit file
    python3 -c "
import json, sys

entry = json.loads('''$ENTRY_JSON''')

with open('$AUDIT_FILE', 'r') as f:
    data = json.load(f)

# Check for duplicate
existing_slugs = [e['slug'] for e in data['entries']]
if entry['slug'] not in existing_slugs:
    data['entries'].append(entry)
    data['audited'] = len(data['entries'])
    data['totalPlans'] = $TOTAL

    # Update summary
    summary = {}
    for e in data['entries']:
        v = e.get('verdict', 'UNKNOWN')
        summary[v] = summary.get(v, 0) + 1
    data['summary'] = summary

    with open('$AUDIT_FILE', 'w') as f:
        json.dump(data, f, indent=2)
    print(f'  Written to audit file. Verdict: {entry.get(\"verdict\", \"UNKNOWN\")}')
else:
    print(f'  Already in audit file, skipping write.')
" 2>/dev/null

    echo "  ✓ $slug → $VERDICT"
    RESULTS+=("$VERDICT|$slug|$title")
  else
    echo "  ✗ $slug → FAILED (no structured output)"
    RESULTS+=("FAILED|$slug|$title")
  fi

  # Brief pause between plans to avoid rate limits
  sleep 2

done <<< "$PLAN_LINES"

# ─── Step 5: Summary ─────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AUDIT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Audited: $COUNT  |  Skipped: $SKIPPED  |  Total: $TOTAL"
echo ""

if [[ ${#RESULTS[@]} -gt 0 ]]; then
  # Tally verdicts
  declare -a VERDICT_NAMES=()
  declare -a VERDICT_COUNTS=()

  for r in "${RESULTS[@]}"; do
    v="${r%%|*}"
    found=false
    for i in "${!VERDICT_NAMES[@]}"; do
      if [[ "${VERDICT_NAMES[$i]}" == "$v" ]]; then
        VERDICT_COUNTS[$i]=$(( ${VERDICT_COUNTS[$i]} + 1 ))
        found=true
        break
      fi
    done
    if [[ "$found" == false ]]; then
      VERDICT_NAMES+=("$v")
      VERDICT_COUNTS+=("1")
    fi
  done

  printf "%-25s %s\n" "VERDICT" "COUNT"
  echo "------------------------- -----"
  for i in "${!VERDICT_NAMES[@]}"; do
    printf "%-25s %s\n" "${VERDICT_NAMES[$i]}" "${VERDICT_COUNTS[$i]}"
  done
fi

echo ""
echo "Results: $AUDIT_FILE"
echo ""
echo "Next steps:"
echo "  cat $AUDIT_FILE | python3 -m json.tool    # View full results"
echo "  /plan-audit --report                       # View summary in Claude"

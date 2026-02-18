#!/usr/bin/env bash
# sync-work-order.sh
# Prints a status report of all stories based on actual directory locations.
# Does NOT auto-edit WORK-ORDER-BY-BATCH.md (too risky to overwrite by script).
# Instead, shows you exactly what needs updating.
#
# Usage: ./scripts/sync-work-order.sh

set -euo pipefail

PLATFORM_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# --- collect story IDs from each state directory ---

collect() {
  local dir="$1"
  if [ -d "$dir" ]; then
    ls "$dir" 2>/dev/null | grep -E '^[A-Z]+-[0-9]+[a-z]?$' | sort
  fi
}

# Stage emojis (canonical mapping)
# ⏸️  backlog/pending
# 🆕  created
# 📝  elaboration
# ⏳  ready-to-work
# 🚧  in-progress
# 🔴  failed-code-review
# 👀  needs-code-review
# ⚠️  failed-qa
# 🔍  ready-for-qa
# ✅  UAT / completed

echo "=============================================="
echo "  WORK ORDER STATUS REPORT — $(date '+%Y-%m-%d')"
echo "=============================================="
echo ""
echo "Scanning: $PLATFORM_DIR"
echo ""

# UAT (check all sub-epics)
UAT_STORIES=""
for d in \
  "$PLATFORM_DIR/UAT" \
  "$PLATFORM_DIR/wint/UAT" \
  "$PLATFORM_DIR/langgraph-update/UAT"
do
  UAT_STORIES+="$(collect "$d")"$'\n'
done
UAT_STORIES=$(echo "$UAT_STORIES" | sort -u | grep .)

# In-progress
INPROG_STORIES=$(collect "$PLATFORM_DIR/in-progress")

# Needs code review
NCR_STORIES=""
for d in \
  "$PLATFORM_DIR/needs-code-review" \
  "$PLATFORM_DIR/wint/needs-code-review" \
  "$PLATFORM_DIR/langgraph-update/needs-code-review"
do
  NCR_STORIES+="$(collect "$d")"$'\n'
done
NCR_STORIES=$(echo "$NCR_STORIES" | sort -u | grep . || true)

# Failed code review
FCR_STORIES=""
for d in \
  "$PLATFORM_DIR/failed-code-review" \
  "$PLATFORM_DIR/wint/failed-code-review"
do
  FCR_STORIES+="$(collect "$d")"$'\n'
done
FCR_STORIES=$(echo "$FCR_STORIES" | sort -u | grep . || true)

# Failed QA
FQA_STORIES=""
for d in \
  "$PLATFORM_DIR/failed-qa" \
  "$PLATFORM_DIR/wint/failed-qa"
do
  FQA_STORIES+="$(collect "$d")"$'\n'
done
FQA_STORIES=$(echo "$FQA_STORIES" | sort -u | grep . || true)

# Ready for QA (platform-level only — wint/ready-for-qa may have stale dirs from pre-UAT stories)
RFQ_PLATFORM=$(collect "$PLATFORM_DIR/ready-for-qa")
RFQ_WINT=$(collect "$PLATFORM_DIR/wint/ready-for-qa")

# Filter out stale ready-for-qa entries that are already in UAT
RFQ_STORIES=""
for s in $RFQ_PLATFORM $RFQ_WINT; do
  if ! echo "$UAT_STORIES" | grep -q "^${s}$"; then
    RFQ_STORIES+="$s"$'\n'
  fi
done
RFQ_STORIES=$(echo "$RFQ_STORIES" | sort -u | grep . || true)

# Ready to work
RTW_STORIES=""
for d in \
  "$PLATFORM_DIR/ready-to-work" \
  "$PLATFORM_DIR/wint/ready-to-work"
do
  for s in $(collect "$d"); do
    if ! echo "$UAT_STORIES" | grep -q "^${s}$"; then
      RTW_STORIES+="$s"$'\n'
    fi
  done
done
RTW_STORIES=$(echo "$RTW_STORIES" | sort -u | grep . || true)

# Filter in-progress: remove stale (already in UAT)
INPROG_REAL=""
for s in $INPROG_STORIES; do
  if ! echo "$UAT_STORIES" | grep -q "^${s}$"; then
    INPROG_REAL+="$s"$'\n'
  fi
done
INPROG_REAL=$(echo "$INPROG_REAL" | sort -u | grep . || true)

UAT_COUNT=$(echo "$UAT_STORIES" | grep -c . || echo 0)
RFQ_COUNT=$(echo "$RFQ_STORIES" | grep -c . || echo 0)
FQA_COUNT=$(echo "$FQA_STORIES" | grep -c . || echo 0)
NCR_COUNT=$(echo "$NCR_STORIES" | grep -c . || echo 0)
FCR_COUNT=$(echo "$FCR_STORIES" | grep -c . || echo 0)
INPROG_COUNT=$(echo "$INPROG_REAL" | grep -c . || echo 0)
RTW_COUNT=$(echo "$RTW_STORIES" | grep -c . || echo 0)

echo "── ✅ UAT VERIFIED ($UAT_COUNT stories) ──────────────────"
echo "$UAT_STORIES" | tr '\n' ' ' | fold -s -w 72 | sed 's/^/  /'
echo ""

echo "── 🔍 READY FOR QA ($RFQ_COUNT stories) ──────────────────────"
if [ -n "$RFQ_STORIES" ]; then
  echo "$RFQ_STORIES" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "── ⚠️  FAILED QA ($FQA_COUNT stories) ─────────────────────────"
if [ -n "$FQA_STORIES" ]; then
  echo "$FQA_STORIES" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "── 👀 NEEDS CODE REVIEW ($NCR_COUNT stories) ──────────────────"
if [ -n "$NCR_STORIES" ]; then
  echo "$NCR_STORIES" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "── 🔴 FAILED CODE REVIEW ($FCR_COUNT stories) ─────────────────"
if [ -n "$FCR_STORIES" ]; then
  echo "$FCR_STORIES" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "── 🚧 IN PROGRESS ($INPROG_COUNT stories) ────────────────────"
if [ -n "$INPROG_REAL" ]; then
  echo "$INPROG_REAL" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "── ⏳ READY TO WORK ($RTW_COUNT stories) ─────────────────────"
if [ -n "$RTW_STORIES" ]; then
  echo "$RTW_STORIES" | sed 's/^/  /'
else
  echo "  (none)"
fi
echo ""

echo "=============================================="
echo "  STALE DIRECTORY WARNINGS"
echo "=============================================="
echo ""

# Highlight ready-for-qa entries that are actually in UAT (stale)
STALE_RFQ=""
for s in $(collect "$PLATFORM_DIR/ready-for-qa") $(collect "$PLATFORM_DIR/wint/ready-for-qa"); do
  if echo "$UAT_STORIES" | grep -q "^${s}$"; then
    STALE_RFQ+="  $s (in UAT — safe to delete old ready-for-qa directory)\n"
  fi
done
if [ -n "$STALE_RFQ" ]; then
  echo "Stale ready-for-qa directories (story is already in UAT):"
  echo -e "$STALE_RFQ"
fi

# Highlight ready-to-work entries that are in UAT (stale)
STALE_RTW=""
for s in $(collect "$PLATFORM_DIR/ready-to-work") $(collect "$PLATFORM_DIR/wint/ready-to-work"); do
  if echo "$UAT_STORIES" | grep -q "^${s}$"; then
    STALE_RTW+="  $s (in UAT — safe to delete old ready-to-work directory)\n"
  fi
done
if [ -n "$STALE_RTW" ]; then
  echo "Stale ready-to-work directories (story is already in UAT):"
  echo -e "$STALE_RTW"
fi

# Highlight in-progress entries that are in UAT (stale)
STALE_IP=""
for s in $(collect "$PLATFORM_DIR/in-progress"); do
  if echo "$UAT_STORIES" | grep -q "^${s}$"; then
    STALE_IP+="  $s (in UAT — safe to delete old in-progress directory)\n"
  fi
done
if [ -n "$STALE_IP" ]; then
  echo "Stale in-progress directories (story is already in UAT):"
  echo -e "$STALE_IP"
fi

if [ -z "$STALE_RFQ" ] && [ -z "$STALE_RTW" ] && [ -z "$STALE_IP" ]; then
  echo "No stale directories found."
fi

echo ""
echo "=============================================="
echo "  DISCREPANCIES WITH WORK-ORDER"
echo "=============================================="
echo ""
echo "Compare the UAT list above with the 'UAT Verified' list in"
echo "WORK-ORDER-BY-BATCH.md to identify entries that need updating."
echo ""
echo "Stories that need QA before WORK-ORDER can advance:"
if [ -n "$RFQ_STORIES" ]; then
  echo "$RFQ_STORIES" | sed 's/^/  🔍 /'
else
  echo "  (none — all stories have been QA-verified!)"
fi

if [ -n "$FQA_STORIES" ]; then
  echo ""
  echo "Stories that failed QA and need rework:"
  echo "$FQA_STORIES" | sed 's/^/  ⚠️  /'
fi

if [ -n "$NCR_STORIES" ]; then
  echo ""
  echo "Stories awaiting code review:"
  echo "$NCR_STORIES" | sed 's/^/  👀 /'
fi

if [ -n "$FCR_STORIES" ]; then
  echo ""
  echo "Stories that failed code review and need rework:"
  echo "$FCR_STORIES" | sed 's/^/  🔴 /'
fi
echo ""
echo "Run this script any time to get the current ground-truth state."

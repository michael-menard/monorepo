#!/usr/bin/env bash
#
# Stuck story detection and recovery for implement-stories.sh.
#
# Sources into the calling script. Requires FEATURE_DIR to be set.
# Compatible with bash 3.2 (no declare -A, no readarray, no ${var,,}).
#
# Functions provided:
#   get_mtime_epoch FILE             — get file modification time as epoch seconds
#   minutes_since_modified FILE      — minutes since file was last modified
#   has_recent_worktree_commits STORY_ID MINUTES  — check for commits in last N minutes
#   detect_stuck_stories [THRESHOLD_SEC [ALERT_SEC]]
#                                   — scan all stage dirs; emit STORY_ID<TAB>STAGE<TAB>PATTERN<TAB>MINUTES
#   recover_story STORY_ID STAGE PATTERN MINUTES [TAG]
#                                   — apply recovery action; write STUCK-RECOVERY.yaml
#   run_stuck_recovery_sweep [THRESHOLD_SEC [ALERT_SEC]]
#                                   — scan + recover all stuck stories (call after batch wait)
#
# Stuck patterns (emitted by detect_stuck_stories):
#   stale                      — story in stories/ flat layout past threshold with no recent activity
#
# Recovery actions (applied by recover_story):
#   stale                      → write STUCK-RECOVERY.yaml with stale tag (for operator awareness)
#
# KSOT-3050: exhausted-retries, no-evidence-no-commits, missing-review-bouncing patterns
# removed — they depended on legacy stage directory names (failed-code-review, needs-code-review, etc.)
# State recovery for those patterns must go through KB state checks.
#
# AC-12: All validate_phase_gate calls are guarded with:
#   declare -f validate_phase_gate > /dev/null 2>&1 && validate_phase_gate ... || true
#
# Idempotency (AC-9): check for STUCK-RECOVERY.yaml before writing.
# Structured log (AC-10): RECOVERY: {id} pattern={p} action={a}
# Alert (AC-6): STUCK-ALERT.yaml for >8hr stories.
# Activity guard (AC-13): has_recent_worktree_commits checks git log before triggering recovery.
#

# ── Tunables ────────────────────────────────────────────────────────
# Caller can override before sourcing or pass as args to detect/sweep functions.
: "${STUCK_THRESHOLD_SECONDS:=14400}"   # 4 hours (240 min)
: "${STUCK_ALERT_SECONDS:=28800}"       # 8 hours (480 min)
: "${MAX_RECOVERY_ATTEMPTS:=1}"
: "${WORKTREE_BASE:=tree/story}"

# ── Portability: epoch seconds ───────────────────────────────────────
# macOS stat uses -f %m; GNU stat uses -c %Y.
get_mtime_epoch() {
  local file="$1"
  if [[ ! -e "$file" ]]; then
    echo 0
    return
  fi
  # Try macOS stat first, then GNU stat
  local mtime
  mtime=$(stat -f %m "$file" 2>/dev/null) || mtime=$(stat -c %Y "$file" 2>/dev/null) || mtime=0
  echo "$mtime"
}

# Returns how many minutes ago the file was last modified.
minutes_since_modified() {
  local file="$1"
  local now
  now=$(date +%s)
  local mtime
  mtime=$(get_mtime_epoch "$file")
  if [[ "$mtime" -eq 0 ]]; then
    echo 9999
    return
  fi
  local diff=$(( (now - mtime) / 60 ))
  echo "$diff"
}

# AC-13: Check whether the worktree for STORY_ID has git commits in the last MINUTES.
# Returns 0 (has recent commits), 1 (no recent commits or no worktree).
has_recent_worktree_commits() {
  local STORY_ID="$1"
  local MINUTES="${2:-30}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  if [[ ! -d "$WT_PATH" ]]; then
    return 1
  fi

  local since_ts
  since_ts=$(date -u -v-"${MINUTES}M" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || \
    since_ts=$(date -u --date="${MINUTES} minutes ago" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || \
    since_ts=""

  if [[ -z "$since_ts" ]]; then
    # Cannot determine timestamp — assume no recent commits (safe default)
    return 1
  fi

  local count
  count=$(git -C "$WT_PATH" log --oneline --since="$since_ts" 2>/dev/null | wc -l | xargs) || count=0
  [[ "$count" -gt 0 ]]
}

# ── Stuck story detection (AC-1) ────────────────────────────────────
#
# Scans active pipeline stages and emits one line per stuck story:
#   STORY_ID<TAB>STAGE<TAB>PATTERN<TAB>MINUTES
#
# Args:
#   $1 = threshold_seconds (default: STUCK_THRESHOLD_SECONDS)
#   $2 = alert_seconds     (default: STUCK_ALERT_SECONDS)
#
detect_stuck_stories() {
  local threshold_sec="${1:-$STUCK_THRESHOLD_SECONDS}"
  local alert_sec="${2:-$STUCK_ALERT_SECONDS}"
  local threshold_min=$(( threshold_sec / 60 ))

  # KSOT-3050: Flat layout only — scan stories/ dir. Legacy stage dir scanning removed.
  local search_dirs=""
  if [[ -d "${FEATURE_DIR}/stories" ]]; then
    search_dirs="${FEATURE_DIR}/stories"
  fi

  for stage_dir in $search_dirs; do

    # Iterate story directories (bash 3.2 safe — no readarray)
    for story_dir in "${stage_dir}"/*/; do
      [[ -d "$story_dir" ]] || continue

      local story_id
      story_id=$(basename "$story_dir")
      # Only real story IDs (PREFIX-NNNN)
      echo "$story_id" | grep -qE '^[A-Z]+-[0-9]+$' || continue

      local impl_dir="${story_dir}/_implementation"
      local evidence_file="${impl_dir}/EVIDENCE.yaml"
      local recovery_file="${impl_dir}/STUCK-RECOVERY.yaml"

      # Determine representative file for age measurement.
      # Use the most recently modified artifact we can find.
      local age_file=""
      for candidate in "${story_dir}/story.yaml" "${story_dir}/${story_id}.md" \
                        "${impl_dir}/EVIDENCE.yaml" "${impl_dir}/ELAB.yaml" \
                        "${impl_dir}/REVIEW.yaml" "${impl_dir}/CHECKPOINT.yaml"; do
        if [[ -f "$candidate" ]]; then
          age_file="$candidate"
        fi
      done

      if [[ -z "$age_file" ]]; then
        age_file="$story_dir"
      fi

      local minutes_ago
      minutes_ago=$(minutes_since_modified "$age_file")

      # Not old enough to be considered stuck
      if [[ "$minutes_ago" -lt "$threshold_min" ]]; then
        continue
      fi

      # ── Pattern matching ────────────────────────────────────────
      # KSOT-3050: Stage-specific patterns (exhausted-retries, no-evidence-no-commits,
      # missing-review-bouncing) removed — they depended on legacy stage directory names.
      # With flat layout, stage state comes from KB. Only stale detection remains here.

      local pattern=""

      # Pattern: stale (stories/ flat layout — all active stories past threshold)
      pattern="stale"

      printf '%s\t%s\t%s\t%s\n' "$story_id" "$stage" "$pattern" "$minutes_ago"
    done
  done
}

# ── Story recovery (AC-2) ────────────────────────────────────────────
#
# Applies a pattern-matched recovery action and writes STUCK-RECOVERY.yaml.
# Idempotent: skips if STUCK-RECOVERY.yaml already exists for non-exhausted patterns.
#
# Args: STORY_ID STAGE PATTERN MINUTES [TAG]
#
recover_story() {
  local STORY_ID="$1"
  local STAGE="$2"
  local PATTERN="$3"
  local MINUTES="$4"
  local TAG="${5:-[recovery]}"

  # Defensive input validation (security: prevent path traversal)
  if ! echo "$STORY_ID" | grep -qE '^[A-Z]{2,10}-[0-9]{3,5}$'; then
    echo "$TAG RECOVERY SKIP: invalid story ID format: $STORY_ID"
    return 1
  fi
  # KSOT-3050: Only 'stories' flat layout is valid. Legacy stage dirs removed.
  case "$STAGE" in
    stories) ;;
    *)
      echo "$TAG RECOVERY SKIP: invalid stage: $STAGE (expected 'stories' flat layout)"
      return 1
      ;;
  esac

  # Resolve story directory
  local STORY_DIR="${FEATURE_DIR}/${STAGE}/${STORY_ID}"
  if [[ ! -d "$STORY_DIR" ]]; then
    echo "$TAG RECOVERY SKIP: $STORY_ID (directory not found at $STAGE)"
    return 0
  fi

  local IMPL_DIR="${STORY_DIR}/_implementation"
  local RECOVERY_FILE="${IMPL_DIR}/STUCK-RECOVERY.yaml"
  local TS
  TS=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

  # AC-9: Idempotency — skip if already recovered (unless exhausted-retries which re-applies)
  if [[ -f "$RECOVERY_FILE" && "$PATTERN" != "exhausted-retries" ]]; then
    echo "$TAG RECOVERY SKIP: $STORY_ID pattern=$PATTERN (STUCK-RECOVERY.yaml exists — idempotent skip)"
    return 0
  fi

  mkdir -p "$IMPL_DIR"

  # ── Alert for >8hr stories (AC-6) ───────────────────────────────
  local alert_min=$(( STUCK_ALERT_SECONDS / 60 ))
  if [[ "$MINUTES" -ge "$alert_min" ]]; then
    cat > "${IMPL_DIR}/STUCK-ALERT.yaml" <<ALERTYAML
schema: 1
story_id: "${STORY_ID}"
timestamp: "${TS}"
stage: "${STAGE}"
pattern: "${PATTERN}"
minutes_stuck: ${MINUTES}
alert: "Story has been stuck for ${MINUTES} minutes (threshold: ${alert_min}m). Manual intervention may be needed."
ALERTYAML
    echo "$TAG RECOVERY ALERT: $STORY_ID stuck ${MINUTES}m (>${alert_min}m) — STUCK-ALERT.yaml written"
  fi

  local action=""

  # KSOT-3050: exhausted-retries, no-evidence-no-commits, missing-review-bouncing
  # recovery cases removed — those patterns required legacy stage dir names.
  # With flat layout, only stale detection (writing STUCK-RECOVERY.yaml) remains.
  case "$PATTERN" in

    # Stale: write alert (already done above) — no directory move
    stale)
      action="stale-alert-written"

      # AC-9: Write recovery file
      cat > "$RECOVERY_FILE" <<RECOVERYAML
schema: 1
story_id: "${STORY_ID}"
timestamp: "${TS}"
pattern: "${PATTERN}"
action: "${action}"
stage: "${STAGE}"
minutes_stuck: ${MINUTES}
note: "Story is stale. No automatic move — operator review recommended."
generated_by: stuck-recovery
RECOVERYAML

      # AC-10: Structured log
      echo "$TAG RECOVERY: $STORY_ID pattern=$PATTERN action=$action"
      ;;

    *)
      echo "$TAG RECOVERY SKIP: $STORY_ID (unknown pattern: $PATTERN)"
      return 0
      ;;
  esac
}

# ── Batch sweep (AC-7) ───────────────────────────────────────────────
#
# Detect all stuck stories and apply recovery. Called after the main batch 'wait'.
# Respects MAX_RECOVERY_ATTEMPTS: applies at most 1 recovery per story per run.
#
# Args:
#   $1 = threshold_seconds (default: STUCK_THRESHOLD_SECONDS)
#   $2 = alert_seconds     (default: STUCK_ALERT_SECONDS)
#
run_stuck_recovery_sweep() {
  local threshold_sec="${1:-$STUCK_THRESHOLD_SECONDS}"
  local alert_sec="${2:-$STUCK_ALERT_SECONDS}"

  echo ""
  echo "STUCK SWEEP: scanning for stuck stories (threshold=${threshold_sec}s alert=${alert_sec}s)..."

  local found=0
  local recovered=0

  # Read detect output line by line (bash 3.2 safe)
  while IFS='	' read -r story_id stage pattern minutes; do
    [[ -z "$story_id" ]] && continue
    found=$(( found + 1 ))
    echo "STUCK FOUND:  $story_id stage=$stage pattern=$pattern minutes=${minutes}m"
    recover_story "$story_id" "$stage" "$pattern" "$minutes"
    recovered=$(( recovered + 1 ))
  done < <(detect_stuck_stories "$threshold_sec" "$alert_sec")

  if [[ $found -eq 0 ]]; then
    echo "STUCK SWEEP: no stuck stories found."
  else
    echo "STUCK SWEEP: found=$found recovered=$recovered"
  fi
  echo ""
}

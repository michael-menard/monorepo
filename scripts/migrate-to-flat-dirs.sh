#!/usr/bin/env bash
#
# KSOT-3010: Migrate stories from stage-based directories to flat layout.
#
# Before:  plans/<plan>/<stage>/<STORY-ID>/
# After:   plans/<plan>/stories/<STORY-ID>/
#
# Idempotent — safe to run multiple times. Stories already in
# stories/<STORY-ID>/ are skipped. Original stage dirs are kept for 2 weeks
# (manual cleanup).
#
# Usage:
#   ./scripts/migrate-to-flat-dirs.sh [plan-dir]         # Migrate a specific plan
#   ./scripts/migrate-to-flat-dirs.sh --all               # Migrate all plans
#   ./scripts/migrate-to-flat-dirs.sh [plan-dir] --dry-run # Preview only
#

set -eo pipefail

DRY_RUN=false
ALL_PLANS=false
TARGET_PLAN=""

for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --all)       ALL_PLANS=true ;;
    *)           TARGET_PLAN="$arg" ;;
  esac
done

if [[ -z "$TARGET_PLAN" ]] && ! $ALL_PLANS; then
  echo "Usage: $0 <plan-dir> [--dry-run]"
  echo "       $0 --all [--dry-run]"
  exit 1
fi

STAGE_DIRS=(elaboration backlog created ready-to-work in-progress needs-code-review failed-code-review ready-for-qa failed-qa UAT done)

migrate_plan() {
  local PLAN_DIR="$1"
  local moved=0
  local skipped=0
  local stories_dir="${PLAN_DIR}/stories"

  echo "Migrating: $PLAN_DIR"

  for stage in "${STAGE_DIRS[@]}"; do
    local stage_dir="${PLAN_DIR}/${stage}"
    [[ -d "$stage_dir" ]] || continue

    # Find story directories (matching PREFIX-NNNN pattern)
    while IFS= read -r -d '' story_path; do
      local sid
      sid=$(basename "$story_path")

      # Skip non-story dirs
      if ! echo "$sid" | grep -qE '^[A-Z]+-[0-9]+$'; then
        continue
      fi

      local target="${stories_dir}/${sid}"

      if [[ -d "$target" ]]; then
        echo "  SKIP: $sid (already in stories/)"
        ((skipped++))
        continue
      fi

      if $DRY_RUN; then
        echo "  DRY: $stage/$sid → stories/$sid"
      else
        mkdir -p "$stories_dir"
        cp -a "$story_path" "$target"
        echo "  COPY: $stage/$sid → stories/$sid"

        # KB story_dir update deferred — too slow for bulk migration.
        # Run a separate KB batch update after migration completes.
      fi
      ((moved++))
    done < <(find "$stage_dir" -maxdepth 1 -mindepth 1 -type d -print0 2>/dev/null)
  done

  echo "  Done: $moved copied, $skipped skipped"
  echo ""
}

if $ALL_PLANS; then
  # Find all plan directories that have stage subdirs
  while IFS= read -r plan_dir; do
    plan_dir=$(dirname "$plan_dir")
    migrate_plan "$plan_dir"
  done < <(find plans -name "stories.index.md" -print 2>/dev/null | sort -u)

  # Also check for plans that have stage dirs but no index file
  for stage in "${STAGE_DIRS[@]}"; do
    while IFS= read -r stage_dir; do
      plan_dir=$(dirname "$stage_dir")
      # Skip if already processed (has stories.index.md)
      [[ -f "${plan_dir}/stories.index.md" ]] && continue
      migrate_plan "$plan_dir"
    done < <(find plans -maxdepth 5 -type d -name "$stage" -print 2>/dev/null | sort -u)
  done
else
  if [[ ! -d "$TARGET_PLAN" ]]; then
    echo "Error: Plan directory not found: $TARGET_PLAN"
    exit 1
  fi
  migrate_plan "$TARGET_PLAN"
fi

echo "Migration complete."
if $DRY_RUN; then
  echo "(Dry run — no files were moved)"
else
  echo "Original stage directories kept for manual cleanup."
  echo "After verification, remove stage dirs with:"
  echo "  rm -rf plans/<plan>/{elaboration,backlog,created,ready-to-work,in-progress,needs-code-review,failed-code-review,ready-for-qa,failed-qa,UAT,done}"
fi

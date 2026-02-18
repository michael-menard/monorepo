#!/usr/bin/env python3
"""
Auto-syncs work order status columns from three sources:
  1. Directory structure (ready-to-work / in-progress / ready-for-qa / UAT)
  2. stories.index.md inline status markers
  3. PROOF-*.md files (presence signals QA passed → treat as completed)

Usage:
  python3 sync-work-order.py <epic-dir> [--interval=20]

Examples:
  # Platform (has work order → updates file)
  python3 scripts/sync-work-order.py plans/future/platform

  # Bug-fix (no work order → prints status to stdout)
  python3 scripts/sync-work-order.py plans/future/bug-fix

  # Custom interval
  python3 scripts/sync-work-order.py plans/future/platform --interval=30

Auto-discovers:
  - Index file:  *stories.index.md or stories.index.md
  - Work order:  WORK-ORDER*.md (optional — prints status if not found)
  - Stage dirs:  {ready-to-work, in-progress, ready-for-qa, UAT}/
"""
import os, re, time, datetime, sys, glob, argparse, json, subprocess

# Priority order (higher = more advanced stage; gaps allow future insertions)
STAGE_PRIORITY = {
    'pending': 0,
    'created': 10,
    'elaboration': 20,
    'ready-to-work': 30,
    'in-progress': 40,
    'failed-code-review': 45,
    'needs-code-review': 50,
    'failed-qa': 55,
    'ready-for-qa': 60,
    'UAT': 70,
    'completed': 70,
}

STAGE_TO_EMOJI = {
    'pending': '⏸️',
    'created': '🆕',
    'elaboration': '📝',
    'ready-to-work': '⏳',
    'in-progress': '🚧',
    'failed-code-review': '🔴',
    'needs-code-review': '👀',
    'failed-qa': '⚠️',
    'ready-for-qa': '🔍',
    'UAT': '✅',
    'completed': '✅',
}

STAGE_TO_CHECK = {
    'pending': '[ ]',
    'created': '[ ]',
    'elaboration': '[ ]',
    'ready-to-work': '[ ]',
    'in-progress': '[~]',
    'failed-code-review': '[~]',
    'needs-code-review': '[~]',
    'failed-qa': '[~]',
    'ready-for-qa': '[x]',
    'UAT': '[x]',
    'completed': '[x]',
}

STORY_RE = re.compile(r'\b([A-Z]{4}-\d{2,4})\b')

# Patterns to recognize in index file title column
INDEX_STATUS_PATTERNS = {
    '**completed**': 'completed',
    '**uat**': 'UAT',
    '**in-qa**': 'ready-for-qa',
    '**ready-for-qa**': 'ready-for-qa',
    '**in-progress**': 'in-progress',
    '**ready-to-work**': 'ready-to-work',
    '**elaborated**': 'ready-to-work',
    '**in-elaboration**': 'elaboration',
    '[In Elaboration]': 'elaboration',
    '**created**': 'created',
    '**needs-code-review**': 'needs-code-review',
    '**needs-review**': 'needs-code-review',
    '**ready-for-code-review**': 'needs-code-review',
    '**failed-code-review**': 'failed-code-review',
    '**failed-review**': 'failed-code-review',
    '**code-review-failed**': 'failed-code-review',
    '**failed-qa**': 'failed-qa',
    '**needs-work**': 'failed-qa',
}

ALL_STATUS_EMOJIS = ['⏸️', '🆕', '📝', '⏳', '🚧', '🔴', '👀', '⚠️', '🔍', '✅']

STAGE_DIRS = [
    'created',
    'elaboration',
    'ready-to-work',
    'in-progress',
    'needs-code-review',
    'failed-code-review',
    'failed-qa',
    'ready-for-qa',
    'UAT',
]


def discover_files(epic_dir):
    """Auto-discover index and work order files in the epic directory."""
    index_file = None
    work_order = None

    # Find index file: prefer *stories.index.md, fall back to stories.index.md
    candidates = glob.glob(os.path.join(epic_dir, '*stories.index.md'))
    if candidates:
        index_file = candidates[0]
    else:
        fallback = os.path.join(epic_dir, 'stories.index.md')
        if os.path.isfile(fallback):
            index_file = fallback

    # Find work order file
    candidates = glob.glob(os.path.join(epic_dir, 'WORK-ORDER*.md'))
    if candidates:
        work_order = candidates[0]

    return index_file, work_order


def collect_scan_dirs(epic_dir):
    """Return epic_dir plus any immediate subdirectories that contain stage dirs (sub-epics).

    This picks up sub-epic directories like wint/, langgraph-update/, etc. that have
    their own UAT/, ready-for-qa/, in-progress/, ready-to-work/ stage directories.
    """
    dirs = [epic_dir]
    try:
        for entry in os.listdir(epic_dir):
            sub = os.path.join(epic_dir, entry)
            if os.path.isdir(sub) and not entry.startswith('.'):
                if any(os.path.isdir(os.path.join(sub, stage)) for stage in STAGE_DIRS):
                    dirs.append(sub)
    except PermissionError:
        pass
    return dirs


def scan_directories(epic_dir):
    """Scan stage directories → {story_id: stage}, including sub-epic directories."""
    status_map = {}
    for scan_dir in collect_scan_dirs(epic_dir):
        for stage in STAGE_DIRS:
            stage_path = os.path.join(scan_dir, stage)
            if not os.path.isdir(stage_path):
                continue
            for entry in os.listdir(stage_path):
                full = os.path.join(stage_path, entry)
                if os.path.isdir(full) and STORY_RE.match(entry):
                    if entry not in status_map or STAGE_PRIORITY[stage] > STAGE_PRIORITY[status_map[entry]]:
                        status_map[entry] = stage
    return status_map


def scan_index_file(index_file):
    """Parse stories index file → {story_id: stage}."""
    status_map = {}
    if not index_file or not os.path.isfile(index_file):
        return status_map

    with open(index_file, 'r') as f:
        for line in f:
            if '|' not in line:
                continue
            match = STORY_RE.search(line)
            if not match:
                continue
            story_id = match.group(1)
            lower_line = line.lower()

            for pattern, stage in INDEX_STATUS_PATTERNS.items():
                if pattern.lower() in lower_line:
                    status_map[story_id] = stage
                    break

    return status_map


def scan_proof_files(epic_dir):
    """Scan all stage directories for PROOF-*.md files → {story_id: 'completed'}.

    Also scans sub-epic directories (e.g. wint/, langgraph-update/) that have
    their own stage directories.
    """
    status_map = {}
    for scan_dir in collect_scan_dirs(epic_dir):
        for stage in STAGE_DIRS:
            stage_path = os.path.join(scan_dir, stage)
            if not os.path.isdir(stage_path):
                continue
            for entry in os.listdir(stage_path):
                story_dir = os.path.join(stage_path, entry)
                if not os.path.isdir(story_dir) or not STORY_RE.match(entry):
                    continue
                proof_files = glob.glob(os.path.join(story_dir, f'PROOF-{entry}.md'))
                if proof_files:
                    status_map[entry] = 'completed'
    return status_map


def merge_statuses(dir_map, index_map, proof_map):
    """Merge all three sources, taking the highest-priority status."""
    merged = {}
    all_stories = set(dir_map.keys()) | set(index_map.keys()) | set(proof_map.keys())
    for story in all_stories:
        candidates = []
        for source in [dir_map, index_map, proof_map]:
            stage = source.get(story)
            if stage:
                candidates.append(stage)
        if candidates:
            merged[story] = max(candidates, key=lambda s: STAGE_PRIORITY.get(s, 0))
    return merged


def replace_status_emoji(cell, new_emoji):
    """Replace a status emoji in a table cell, preserving spacing."""
    for emoji in ALL_STATUS_EMOJIS:
        if emoji in cell:
            return cell.replace(emoji, new_emoji, 1)
    return cell


def replace_checkbox(cell, new_check):
    """Replace checkbox marker in a table cell."""
    for old in ['[ ]', '[x]', '[~]', '[ X ]', '[X]']:
        if old in cell:
            return cell.replace(old, new_check, 1)
    return cell


STALE_NOTE_PHRASES = re.compile(
    r'\*{0,2}(Ready for QA|Ready for Code Review|Needs Code Review|'
    r'Failed Code Review|Failed QA|Needs Work|In Progress|In Elaboration|'
    r'Ready to Start|Blocked|Completed|UAT verified|UAT|In QA|Created)\*{0,2}'
    r'(\s*[-–—]\s*)?',
    re.IGNORECASE
)


def clean_notes_cell(cell, stage):
    """Strip stale status phrases (including bold markers) from the Notes column."""
    cleaned = STALE_NOTE_PHRASES.sub('', cell)
    # Remove leftover empty bold markers (** or ****)
    cleaned = re.sub(r'\*{2,4}', '', cleaned)
    # Collapse whitespace
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    # Strip leading/trailing dashes left after removal
    cleaned = re.sub(r'^[-–—]\s*', '', cleaned).strip()
    cleaned = re.sub(r'\s*[-–—]$', '', cleaned).strip()
    # If nothing useful remains, leave it blank
    if not cleaned or cleaned == '-':
        cleaned = ''
    # Restore padding
    return f' {cleaned} ' if cleaned else '  '


def unblock_ready_stories(work_order, status_map):
    """Promote ⏸️ → ⏳ when all dependencies are completed/UAT.

    Parses dependency columns in the work order to find story IDs,
    then checks if all referenced stories are done in the status map.
    Returns list of (story_id, 'ready-to-work') promotions.
    """
    if not work_order or not os.path.isfile(work_order):
        return []

    done_stories = {s for s, stage in status_map.items()
                    if stage in ('completed', 'UAT')}

    promotions = []

    with open(work_order, 'r') as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        if '|' not in line:
            continue

        parts = line.split('|')
        if len(parts) < 6:
            continue

        # Only act on rows that currently show ⏸️ (blocked)
        status_cell = parts[5] if len(parts) > 5 else ''
        if '⏸️' not in status_cell:
            continue

        # Extract this row's story ID from column 3
        story_col = parts[3].strip() if len(parts) > 3 else ''
        story_match = STORY_RE.search(story_col)
        if not story_match:
            continue
        story_id = story_match.group(1)

        # Skip if already has a status from another source
        if story_id in status_map and STAGE_PRIORITY.get(status_map[story_id], 0) > STAGE_PRIORITY['pending']:
            continue

        # Find dependency column — look for columns containing story IDs or #refs
        # Dependencies are typically in column 6 or 7 (after Status)
        dep_story_ids = set()
        dep_num_refs = set()
        for col_idx in range(5, len(parts)):
            col = parts[col_idx]
            # Extract story ID references (e.g., WINT-0010)
            for m in STORY_RE.finditer(col):
                dep_id = m.group(1)
                if dep_id != story_id:  # Don't count self
                    dep_story_ids.add(dep_id)
            # Extract #N references (e.g., #19, #13)
            for m in re.finditer(r'#(\d+)', col):
                dep_num_refs.add(m.group(1))

        # Skip rows with no parseable dependencies (can't determine if unblocked)
        if not dep_story_ids and not dep_num_refs:
            continue

        # Resolve #N refs to story IDs by scanning the work order for matching rows
        # (The # column is parts[2])
        if dep_num_refs:
            for other_line in lines:
                if '|' not in other_line:
                    continue
                other_parts = other_line.split('|')
                if len(other_parts) < 4:
                    continue
                num_cell = other_parts[2].strip()
                if num_cell in dep_num_refs:
                    other_story = STORY_RE.search(other_parts[3].strip())
                    if other_story:
                        dep_story_ids.add(other_story.group(1))

        # Check: are ALL dependency story IDs done?
        if dep_story_ids and dep_story_ids.issubset(done_stories):
            promotions.append(story_id)
            status_map[story_id] = 'ready-to-work'

    return promotions


def update_work_order(work_order, status_map):
    """Update work order file with current statuses. Returns list of changes."""
    if not work_order or not os.path.isfile(work_order):
        return [], []

    with open(work_order, 'r') as f:
        lines = f.readlines()

    changes = []
    removed = []
    lines_to_remove = set()

    for i, line in enumerate(lines):
        if '|' not in line:
            continue

        match = STORY_RE.search(line)
        if not match:
            continue

        story_id = match.group(1)
        if story_id not in status_map:
            continue

        stage = status_map[story_id]
        new_emoji = STAGE_TO_EMOJI[stage]
        new_check = STAGE_TO_CHECK[stage]

        # Filter out completed/UAT rows — remove from work order
        if stage in ('completed', 'UAT'):
            lines_to_remove.add(i)
            removed.append(story_id)
            continue

        parts = line.split('|')
        if len(parts) < 7:
            continue

        old_line = line

        # Update checkbox (column index 1)
        parts[1] = replace_checkbox(parts[1], new_check)

        # Update status emoji (column index 5)
        parts[5] = replace_status_emoji(parts[5], new_emoji)

        # Clean stale status phrases from Notes (column index 6)
        if len(parts) > 6:
            parts[6] = clean_notes_cell(parts[6], stage)

        new_line = '|'.join(parts)
        if new_line != old_line:
            lines[i] = new_line
            old_emoji = '?'
            for e in ALL_STATUS_EMOJIS:
                if e in old_line.split('|')[5] if len(old_line.split('|')) > 5 else '':
                    old_emoji = e
                    break
            changes.append((story_id, old_emoji, new_emoji, stage))

    if lines_to_remove or changes:
        filtered = [l for i, l in enumerate(lines) if i not in lines_to_remove]
        with open(work_order, 'w') as f:
            f.writelines(filtered)

    return changes, removed


def update_progress_summary(work_order, status_map):
    """Update the Progress Tracking summary counts in the work order."""
    if not work_order or not os.path.isfile(work_order):
        return False

    with open(work_order, 'r') as f:
        content = f.read()

    # Only update if the file has a summary section
    if '**Current Status Summary:**' not in content:
        return False

    by_stage = {}
    for story, stage in status_map.items():
        by_stage.setdefault(stage, []).append(story)

    uat = sorted(by_stage.get('UAT', []) + by_stage.get('completed', []))
    qa = sorted(by_stage.get('ready-for-qa', []))
    failed_qa = sorted(by_stage.get('failed-qa', []))
    needs_review = sorted(by_stage.get('needs-code-review', []))
    failed_review = sorted(by_stage.get('failed-code-review', []))
    prog = sorted(by_stage.get('in-progress', []))
    ready = sorted(by_stage.get('ready-to-work', []))
    elab = sorted(by_stage.get('elaboration', []))
    created = sorted(by_stage.get('created', []))

    total_active = (len(uat) + len(qa) + len(failed_qa) + len(needs_review) +
                    len(failed_review) + len(prog) + len(ready) + len(elab) + len(created))

    new_summary_lines = [
        "**Current Status Summary:**",
        f"- ✅ UAT Verified: {len(uat)} stories ({', '.join(uat)})" if uat else "- ✅ UAT Verified: 0 stories",
        f"- 🔍 Ready for QA: {len(qa)} stories ({', '.join(qa)})" if qa else "- 🔍 Ready for QA: 0 stories",
        f"- 🚧 In Progress: {len(prog)} stories ({', '.join(prog)})" if prog else "- 🚧 In Progress: 0 stories",
    ]
    if failed_qa:
        new_summary_lines.append(f"- ⚠️ Failed QA: {len(failed_qa)} stories ({', '.join(failed_qa)})")
    if needs_review:
        new_summary_lines.append(f"- 👀 Needs Code Review: {len(needs_review)} stories ({', '.join(needs_review)})")
    if failed_review:
        new_summary_lines.append(f"- 🔴 Failed Code Review: {len(failed_review)} stories ({', '.join(failed_review)})")
    if elab:
        new_summary_lines.append(f"- 📝 In Elaboration: {len(elab)} stories ({', '.join(elab)})")
    if ready:
        new_summary_lines.append(f"- ⏳ Ready to Start: {len(ready)} stories ({', '.join(ready)})")
    if created:
        new_summary_lines.append(f"- 🆕 Created: {len(created)} stories ({', '.join(created)})")

    new_summary_lines.append("- ⏸️ Blocked: remaining stories (waiting on dependencies)")
    new_summary_lines.append("")
    new_summary_lines.append(f"**Active Stories: {total_active} tracked**")

    new_summary = '\n'.join(new_summary_lines)

    # Replace summary block — match from "**Current Status Summary:**" to "**Active Stories:..." or "**Batch..."
    pattern = re.compile(
        r'\*\*Current Status Summary:\*\*\n.*?\n\*\*(?:Active Stories|Batch \d+).*?\*\*',
        re.DOTALL
    )

    if pattern.search(content):
        new_content = pattern.sub(new_summary, content)
        if new_content != content:
            with open(work_order, 'w') as f:
                f.write(new_content)
            return True
    return False


##############################################################################
# Batch Validation
##############################################################################

def load_batch_config(epic_dir):
    """Load BATCH-TESTS.json from the epic directory."""
    config_path = os.path.join(epic_dir, 'BATCH-TESTS.json')
    if not os.path.isfile(config_path):
        return None
    with open(config_path, 'r') as f:
        return json.load(f)


def load_batch_state(epic_dir):
    """Load batch validation state (which batches have been tested)."""
    state_path = os.path.join(epic_dir, '.batch-validation-state.json')
    if os.path.isfile(state_path):
        with open(state_path, 'r') as f:
            return json.load(f)
    return {'validated': {}}


def save_batch_state(epic_dir, state):
    """Save batch validation state."""
    state_path = os.path.join(epic_dir, '.batch-validation-state.json')
    with open(state_path, 'w') as f:
        json.dump(state, f, indent=2)


def is_batch_complete(batch_stories, status_map):
    """Check if all stories in a batch are completed/UAT."""
    for story in batch_stories:
        stage = status_map.get(story)
        if not stage or STAGE_PRIORITY.get(stage, 0) < STAGE_PRIORITY['UAT']:
            return False
    return True


def run_test(name, command, project_root):
    """Run a single test command, return (name, passed, output)."""
    try:
        result = subprocess.run(
            command, shell=True, cwd=project_root,
            capture_output=True, text=True, timeout=300
        )
        passed = result.returncode == 0
        output = result.stdout[-500:] if result.stdout else ''
        if not passed:
            output = (result.stderr[-500:] if result.stderr else '') or output
        return name, passed, output
    except subprocess.TimeoutExpired:
        return name, False, 'TIMEOUT (5 min)'
    except Exception as e:
        return name, False, str(e)


def run_batch_validation(batch_num, batch_config, project_root):
    """Run full validation + batch smoke tests. Returns results dict."""
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    batch_name = batch_config.get('name', f'Batch {batch_num}')
    results = {
        'batch': batch_num,
        'name': batch_name,
        'timestamp': ts,
        'full_validation': [],
        'smoke_tests': [],
        'all_passed': True,
    }

    print(f"\n{'='*60}")
    print(f"  BATCH {batch_num} COMPLETE — Running Validation")
    print(f"  {batch_name}")
    print(f"{'='*60}\n")

    # Full project validation
    full_tests = batch_config.get('_full_validation', [])
    if full_tests:
        print(f"  Full Project Validation:")
        for test in full_tests:
            name, passed, output = run_test(test['name'], test['command'], project_root)
            status = 'PASS' if passed else 'FAIL'
            icon = '  ✅' if passed else '  ❌'
            print(f"  {icon} {name}: {status}")
            if not passed:
                print(f"      {output[:200]}")
                results['all_passed'] = False
            results['full_validation'].append({'name': name, 'passed': passed, 'output': output})
        print()

    # Batch-specific smoke tests
    smoke_tests = batch_config.get('smoke_tests', [])
    if smoke_tests:
        print(f"  Batch Smoke Tests:")
        for test in smoke_tests:
            name, passed, output = run_test(test['name'], test['command'], project_root)
            status = 'PASS' if passed else 'FAIL'
            icon = '  ✅' if passed else '  ❌'
            print(f"  {icon} {name}: {status}")
            if not passed:
                print(f"      {output[:200]}")
                results['all_passed'] = False
            results['smoke_tests'].append({'name': name, 'passed': passed, 'output': output})
        print()

    # Summary
    total = len(results['full_validation']) + len(results['smoke_tests'])
    passed = sum(1 for t in results['full_validation'] + results['smoke_tests'] if t['passed'])
    verdict = 'ALL PASSED' if results['all_passed'] else f'FAILED ({total - passed}/{total} failed)'
    icon = '🎉' if results['all_passed'] else '⚠️'

    print(f"  {icon} Batch {batch_num} Validation: {verdict}")
    print(f"{'='*60}\n")

    return results


def save_batch_report(epic_dir, batch_num, results):
    """Save batch validation results to a markdown report."""
    report_path = os.path.join(epic_dir, f'BATCH-{batch_num}-VALIDATION.md')
    icon = '✅' if results['all_passed'] else '❌'

    lines = [
        f"# Batch {batch_num} Validation Report — {results['name']}",
        f"",
        f"**Date:** {results['timestamp']}",
        f"**Result:** {icon} {'ALL PASSED' if results['all_passed'] else 'FAILED'}",
        f"",
        f"---",
        f"",
    ]

    if results['full_validation']:
        lines.append("## Full Project Validation\n")
        lines.append("| Test | Result |")
        lines.append("|------|--------|")
        for t in results['full_validation']:
            r = '✅ PASS' if t['passed'] else '❌ FAIL'
            lines.append(f"| {t['name']} | {r} |")
        lines.append("")

    if results['smoke_tests']:
        lines.append("## Batch Smoke Tests\n")
        lines.append("| Test | Result |")
        lines.append("|------|--------|")
        for t in results['smoke_tests']:
            r = '✅ PASS' if t['passed'] else '❌ FAIL'
            lines.append(f"| {t['name']} | {r} |")
        lines.append("")

    # Include failure details
    failures = [t for t in results['full_validation'] + results['smoke_tests'] if not t['passed']]
    if failures:
        lines.append("## Failure Details\n")
        for t in failures:
            lines.append(f"### {t['name']}\n")
            lines.append(f"```\n{t['output']}\n```\n")

    with open(report_path, 'w') as f:
        f.write('\n'.join(lines))

    return report_path


def check_and_run_batch_tests(epic_dir, status_map, batch_config, project_root):
    """Check for newly completed batches and run their validation tests."""
    if not batch_config:
        return

    state = load_batch_state(epic_dir)
    full_validation = batch_config.get('full_validation', [])

    for batch_num_str, batch in batch_config.get('batches', {}).items():
        batch_num = str(batch_num_str)

        # Skip already validated batches
        if batch_num in state['validated']:
            continue

        # Check if this batch is complete
        if not is_batch_complete(batch.get('stories', []), status_map):
            continue

        # Batch just completed — run validation
        batch['_full_validation'] = full_validation
        results = run_batch_validation(batch_num, batch, project_root)
        report_path = save_batch_report(epic_dir, batch_num, results)
        print(f"  Report saved: {os.path.basename(report_path)}")

        # Record in state
        state['validated'][batch_num] = {
            'timestamp': results['timestamp'],
            'all_passed': results['all_passed'],
        }
        save_batch_state(epic_dir, state)

    sys.stdout.flush()


def scan_all_index_stories(index_file):
    """Extract story IDs from the pre-transition section of the index file.

    Only returns stories from waves before the '🎉 TRANSITION POINT' marker,
    since post-transition stories are intentionally not in the work order.
    """
    stories = set()
    if not index_file or not os.path.isfile(index_file):
        return stories
    with open(index_file, 'r') as f:
        for line in f:
            # Stop at the transition point — everything after is future work
            if 'TRANSITION POINT' in line:
                break
            if '|' not in line:
                continue
            # Skip struck-through / DUPLICATE lines
            if '~~' in line and 'DUPLICATE' in line:
                continue
            # Only extract story IDs from the Story column (column index 3)
            # to avoid false positives from dependency/blocks columns
            parts = line.split('|')
            if len(parts) >= 4:
                story_col = parts[3].strip()
                m = STORY_RE.search(story_col)
                if m:
                    stories.add(m.group(1))
    return stories


def scan_work_order_stories(work_order):
    """Extract ALL story IDs currently in the work order file."""
    stories = set()
    if not work_order or not os.path.isfile(work_order):
        return stories
    with open(work_order, 'r') as f:
        for line in f:
            if '|' not in line:
                continue
            for m in STORY_RE.finditer(line):
                stories.add(m.group(1))
    return stories


def check_untracked_stories(index_file, work_order, already_warned, status_map):
    """Find stories in the index but not in the work order. Returns new untracked set."""
    index_stories = scan_all_index_stories(index_file)
    wo_stories = scan_work_order_stories(work_order)
    untracked = index_stories - wo_stories
    # Filter out GATE stories and completed/UAT stories
    untracked = {s for s in untracked
                 if not s.startswith('GATE-')
                 and status_map.get(s) not in ('completed', 'UAT')}
    new_untracked = untracked - already_warned
    return new_untracked, untracked


def print_status_table(status_map, epic_name):
    """Print a status summary to stdout (used when no work order file exists)."""
    by_stage = {}
    for story, stage in status_map.items():
        by_stage.setdefault(stage, []).append(story)

    print(f"  {epic_name} Status:")
    for stage_name, emoji in [
        ('completed', '✅'),
        ('UAT', '✅'),
        ('ready-for-qa', '🔍'),
        ('failed-qa', '⚠️'),
        ('needs-code-review', '👀'),
        ('failed-code-review', '🔴'),
        ('in-progress', '🚧'),
        ('ready-to-work', '⏳'),
        ('elaboration', '📝'),
        ('created', '🆕'),
    ]:
        stories = sorted(by_stage.get(stage_name, []))
        if stories:
            print(f"    {emoji} {stage_name}: {', '.join(stories)}")


def main():
    parser = argparse.ArgumentParser(description='Sync work order statuses from epic directory')
    parser.add_argument('epic_dir', help='Path to the epic directory (e.g., plans/future/platform)')
    parser.add_argument('--interval', type=int, default=20, help='Refresh interval in seconds (default: 20)')
    parser.add_argument('--no-tests', action='store_true', help='Disable batch validation tests')
    args = parser.parse_args()

    # Resolve epic directory path
    epic_dir = os.path.abspath(args.epic_dir)
    if not os.path.isdir(epic_dir):
        print(f"Error: {epic_dir} is not a directory")
        sys.exit(1)

    epic_name = os.path.basename(epic_dir)
    index_file, work_order = discover_files(epic_dir)
    batch_config = None if args.no_tests else load_batch_config(epic_dir)
    project_root = os.path.abspath(os.path.join(epic_dir, '..', '..', '..'))

    ts = datetime.datetime.now().strftime('%H:%M:%S')
    print(f"[{ts}] Work Order Status Sync started")
    print(f"  Epic:    {epic_name} ({epic_dir})")
    print(f"  Sources:")

    stage_dirs_found = [s for s in STAGE_DIRS if os.path.isdir(os.path.join(epic_dir, s))]
    print(f"    dirs:  {{{', '.join(stage_dirs_found)}}}/")

    if index_file:
        print(f"    index: {os.path.basename(index_file)}")
    else:
        print(f"    index: (none found)")

    print(f"    proof: PROOF-*.md files in stage directories")

    if batch_config:
        num_batches = len(batch_config.get('batches', {}))
        state = load_batch_state(epic_dir)
        validated = len(state.get('validated', {}))
        print(f"  Tests:   BATCH-TESTS.json ({num_batches} batches, {validated} already validated)")
    else:
        reason = "disabled (--no-tests)" if args.no_tests else "no BATCH-TESTS.json found"
        print(f"  Tests:   {reason}")

    if work_order:
        print(f"  Target:  {os.path.basename(work_order)}")
    else:
        print(f"  Target:  (no work order — status printed to stdout)")

    print(f"  Interval: {args.interval}s | Ctrl+C to stop")
    print()

    warned_untracked = set()
    cycle = 0
    while True:
        cycle += 1
        ts = datetime.datetime.now().strftime('%H:%M:%S')

        dir_map = scan_directories(epic_dir)
        idx_map = scan_index_file(index_file)
        proof_map = scan_proof_files(epic_dir)
        merged = merge_statuses(dir_map, idx_map, proof_map)

        if work_order:
            # Promote blocked stories whose deps are all done
            promoted = unblock_ready_stories(work_order, merged)

            changes, removed = update_work_order(work_order, merged)
            summary_updated = update_progress_summary(work_order, merged)

            has_updates = changes or removed or promoted
            if has_updates:
                parts = []
                if changes:
                    parts.append(f"{len(changes)} update(s)")
                if removed:
                    parts.append(f"{len(removed)} done row(s) removed")
                if promoted:
                    parts.append(f"{len(promoted)} unblocked")
                print(f"[{ts}] Cycle {cycle} — {', '.join(parts)}:")
                for story, old_e, new_e, stage in changes:
                    print(f"  {story}: {old_e} → {new_e} ({stage})")
                if removed:
                    print(f"  ✅ Removed: {', '.join(sorted(removed))}")
                if promoted:
                    print(f"  🔓 Unblocked: {', '.join(sorted(promoted))}")
                if summary_updated:
                    print(f"  + Progress summary refreshed")
            else:
                print(f"[{ts}] Cycle {cycle} — no changes ({len(merged)} stories tracked)")
        else:
            # No work order file — just print status
            print(f"[{ts}] Cycle {cycle} — {len(merged)} stories tracked")
            print_status_table(merged, epic_name)

        # Check for new stories in the index that aren't in the work order
        if work_order and index_file:
            new_untracked, all_untracked = check_untracked_stories(
                index_file, work_order, warned_untracked, merged
            )
            if new_untracked:
                print(f"  ⚠️  New untracked stories (in index but not in work order):")
                for s in sorted(new_untracked):
                    stage = merged.get(s, 'pending')
                    emoji = STAGE_TO_EMOJI.get(stage, '⏸️')
                    print(f"      {emoji} {s} ({stage})")
                warned_untracked = all_untracked

        # Check for newly completed batches and run validation tests
        if batch_config:
            check_and_run_batch_tests(epic_dir, merged, batch_config, project_root)

        sys.stdout.flush()
        time.sleep(args.interval)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")

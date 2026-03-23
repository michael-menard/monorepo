#!/usr/bin/env bash
#
# Spinner Library — visual feedback for long-running operations.
#
# Usage:
#   source "$(dirname "$0")/lib/spinner.sh"
#
#   spin_start "Resolving plan..."
#   some_long_command
#   spin_stop "Plan resolved" # or spin_fail "Plan not found"
#
#   # Or wrap a command directly:
#   spin_run "Fetching KB stories..." some_command --with args
#
# All output goes to stderr so stdout remains clean for captures.
# Bash 3.2 safe (no associative arrays).
#

SPIN_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPIN_PID=""
SPIN_MSG=""

# Start a spinner in the background.
# Args: $1 = message to display
spin_start() {
  SPIN_MSG="$1"
  # Kill any existing spinner
  spin_kill 2>/dev/null

  (
    local i=0
    while true; do
      printf "\r  %s %s\033[K" "${SPIN_FRAMES[i++ % ${#SPIN_FRAMES[@]}]}" "$SPIN_MSG" >&2
      sleep 0.1
    done
  ) &
  SPIN_PID=$!
  # Suppress job control messages
  disown "$SPIN_PID" 2>/dev/null || true
}

# Stop the spinner with a success message.
# Args: $1 = completion message (optional, defaults to SPIN_MSG)
spin_stop() {
  local msg="${1:-$SPIN_MSG}"
  spin_kill
  printf "\r  ✓ %s\033[K\n" "$msg" >&2
}

# Stop the spinner with a failure message.
# Args: $1 = failure message (optional, defaults to SPIN_MSG)
spin_fail() {
  local msg="${1:-$SPIN_MSG}"
  spin_kill
  printf "\r  ✗ %s\033[K\n" "$msg" >&2
}

# Kill the spinner background process.
spin_kill() {
  if [[ -n "$SPIN_PID" ]]; then
    kill "$SPIN_PID" 2>/dev/null
    wait "$SPIN_PID" 2>/dev/null || true
    SPIN_PID=""
  fi
}

# Run a command with a spinner. Captures exit code.
# Args: $1 = message, $2.. = command and args
# Returns: exit code of the command
# Note: stdout of the command is suppressed (redirected to /dev/null).
#       Use spin_start/spin_stop manually if you need to capture stdout.
spin_run() {
  local msg="$1"
  shift
  spin_start "$msg"
  local rc=0
  "$@" >/dev/null 2>&1 || rc=$?
  if [[ $rc -eq 0 ]]; then
    spin_stop
  else
    spin_fail "$msg (failed)"
  fi
  return $rc
}

# No EXIT trap here — sourcing scripts manage their own traps.
# spin_kill is called by spin_stop/spin_fail. If the script exits
# mid-spinner, the background process dies with the parent shell.

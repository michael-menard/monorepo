<!-- Powered by BMAD™ Core -->

# Develop Story Task

## Purpose

Smart wrapper for implement-story that accepts either story numbers or file paths and automatically resolves them before delegating to the implement-story workflow.

## Usage

```bash
# With story number
*develop story=1.2
*develop story=1.15 mode=parallel review=deep

# With file path
*develop path=docs/stories/1.2.dashboard-scaffolding.md
*develop path=docs/stories/1.15.auth-state-sync.md mode=parallel

# Multiple stories
*develop stories=[1.1,1.2,1.3] mode=parallel

# Entire epic
*develop epic=3 mode=parallel review=deep
```

## Parameters

- **story** - Single story number (e.g., `1.2`, `1.15`)
- **path** - Direct file path (e.g., `docs/stories/1.2.dashboard.md`)
- **stories** - Multiple story numbers (e.g., `[1.1,1.2,1.3]`)
- **epic** - Epic number (e.g., `3`)
- **mode** - Execution mode (`single` or `parallel`)
- **review** - QA review type (`deep`, `quick`, or `skip`)

## Workflow

### Step 1: Input Resolution

Determine what type of input was provided and resolve to story file path(s):

```bash
# If path is provided directly, use it
if [ -n "$PATH_ARG" ]; then
  STORY_FILE="$PATH_ARG"

  # Validate file exists
  if [ ! -f "$STORY_FILE" ]; then
    echo "❌ Story file not found: $STORY_FILE"
    exit 1
  fi

  echo "✅ Using direct path: $STORY_FILE"

# If story number is provided, resolve it
elif [ -n "$STORY_NUM" ]; then
  echo "🔍 Resolving story number: $STORY_NUM"

  # Load story location from config
  STORY_LOCATION=$(yq '.devStoryLocation' .bmad-core/core-config.yaml)

  # Search for story file matching the number
  MATCHING_FILES=$(find "$STORY_LOCATION" -name "${STORY_NUM}.*.md" -type f)
  FILE_COUNT=$(echo "$MATCHING_FILES" | wc -l | tr -d ' ')

  if [ "$FILE_COUNT" -eq 0 ]; then
    echo "❌ No story file found matching number: $STORY_NUM"
    echo "💡 Check that the story exists in $STORY_LOCATION"
    exit 1
  elif [ "$FILE_COUNT" -gt 1 ]; then
    echo "⚠️  Multiple story files found matching number: $STORY_NUM"
    echo "$MATCHING_FILES"
    echo "💡 Please specify the exact file path"
    exit 1
  fi

  STORY_FILE="$MATCHING_FILES"
  echo "✅ Resolved to: $STORY_FILE"

# If stories array is provided, resolve each one
elif [ -n "$STORIES_ARR" ]; then
  echo "🔍 Resolving multiple story numbers..."

  STORY_LOCATION=$(yq '.devStoryLocation' .bmad-core/core-config.yaml)
  RESOLVED_STORIES=()

  for story_num in "${STORIES_ARR[@]}"; do
    MATCHING=$(find "$STORY_LOCATION" -name "${story_num}.*.md" -type f)
    FILE_COUNT=$(echo "$MATCHING" | wc -l | tr -d ' ')

    if [ "$FILE_COUNT" -eq 0 ]; then
      echo "❌ No story file found for: $story_num"
      exit 1
    elif [ "$FILE_COUNT" -gt 1 ]; then
      echo "⚠️  Multiple files found for: $story_num"
      exit 1
    fi

    RESOLVED_STORIES+=("$story_num")
    echo "  ✅ $story_num -> $MATCHING"
  done

  echo "✅ Resolved ${#RESOLVED_STORIES[@]} stories"

# If epic is provided, pass through directly (implement-story handles discovery)
elif [ -n "$EPIC_NUM" ]; then
  echo "✅ Epic $EPIC_NUM will be handled by implement-story"

else
  echo "❌ No input provided"
  echo "💡 Usage: *develop story=1.2 OR *develop path=docs/stories/1.2.md OR *develop epic=3"
  exit 1
fi
```

### Step 2: Delegate to Implement Story

Call the implement-story task with resolved parameters:

```bash
# Build the implement command
if [ -n "$EPIC_NUM" ]; then
  # Epic implementation
  echo "🚀 Starting epic implementation for Epic $EPIC_NUM..."
  *implement epic="$EPIC_NUM" mode="${MODE:-parallel}" review="${REVIEW:-deep}"

elif [ -n "$STORIES_ARR" ]; then
  # Multiple stories
  echo "🚀 Starting parallel implementation of ${#RESOLVED_STORIES[@]} stories..."
  *implement stories="[${RESOLVED_STORIES[*]}]" mode="${MODE:-parallel}" review="${REVIEW:-deep}"

else
  # Single story
  # Extract story number from resolved file path
  STORY_NUMBER=$(basename "$STORY_FILE" | grep -oE '^[0-9]+\.[0-9]+(\.[0-9]+)?')

  echo "🚀 Starting implementation for Story $STORY_NUMBER..."
  *implement story="$STORY_NUMBER" mode="${MODE:-single}" review="${REVIEW:-deep}"
fi
```

### Step 3: Summary

```bash
echo ""
echo "✅ Develop task completed!"
echo "📋 Implementation delegated to implement-story workflow"
```

## Benefits

✅ **Flexible Input** - Accepts story numbers or file paths
✅ **Auto-Resolution** - Finds story files automatically
✅ **Validation** - Checks files exist before proceeding
✅ **Pass-Through** - Preserves all options for implement-story
✅ **Epic Support** - Handles entire epic implementations
✅ **Multi-Story** - Supports parallel story execution

## Error Handling

- **Story not found**: Clear error message with suggestions
- **Multiple matches**: Lists all matches and asks for clarification
- **Invalid path**: Validates file exists before proceeding
- **Missing config**: Falls back to default `docs/stories/` location

## Examples

### Simple Story
```bash
*develop story=1.2
# Resolves: docs/stories/1.2.dashboard-scaffolding.md
# Calls: *implement story=1.2 mode=single review=deep
```

### Complex Story with Options
```bash
*develop story=1.15 mode=parallel review=deep
# Resolves: docs/stories/1.15.auth-state-sync.md
# Calls: *implement story=1.15 mode=parallel review=deep
```

### Direct Path
```bash
*develop path=docs/stories/1.2.dashboard-scaffolding.md
# Calls: *implement story=1.2 mode=single review=deep
```

### Multiple Stories
```bash
*develop stories=[1.1,1.2,1.3] mode=parallel
# Resolves each story number
# Calls: *implement stories=[1.1,1.2,1.3] mode=parallel review=deep
```

### Entire Epic
```bash
*develop epic=3 mode=parallel review=deep
# Calls: *implement epic=3 mode=parallel review=deep
```

## Related Tasks

- `implement-story.md` - The underlying implementation workflow
- `validate-next-story.md` - Story validation
- `apply-qa-fixes.md` - QA issue resolution

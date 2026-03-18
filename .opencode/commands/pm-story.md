---
description: Generate new stories, follow-ups, or splits - PM story management
---

# /pm-story - Product Manager Story Operations

Unified command for PM story generation and transformation.

## Usage

```
/pm-story <action> [args]
```

## Actions

| Action              | Usage                                         | Purpose                 |
| ------------------- | --------------------------------------------- | ----------------------- |
| `generate`          | `/pm-story generate {FEATURE_DIR} [STORY_ID]`  | Create story from feature |
| `generate --elab`   | `/pm-story generate {PATH} {STORY_ID} --elab` | Generate + elaborate    |
| `generate --ad-hoc` | `/pm-story generate --ad-hoc {FEATURE_DIR}`    | Create emergent story   |
| `followup`          | `/pm-story followup {FEATURE_DIR} {STORY_ID}`  | Create follow-up        |
| `split`             | `/pm-story split {FEATURE_DIR} {STORY_ID}`     | Split oversized story   |
| `bug`               | `/pm-story bug {FEATURE_DIR} {TITLE}`         | Create bug fix story    |

## Story ID Format: `{PREFIX}-XXYZ`

| Position | Meaning      | Range            |
| -------- | ------------ | ---------------- |
| XX       | Story number | 00-99            |
| Y        | Split        | 0-9 (0=original) |
| Z        | Follow-up    | 0-9 (0=original) |

## Examples

```
/pm-story generate plans/future/wishlist
/pm-story generate plans/future/wishlist WISH-0500
/pm-story generate plans/future/wishlist WISH-0100 --elab
/pm-story followup plans/future/wishlist WISH-0100
/pm-story split plans/future/wishlist WISH-0100
/pm-story generate --ad-hoc plans/future/wishlist
```

## Pipeline Flags

| Flag                  | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `--elab`              | After generation, chain to `/elab-story` |
| `--elab --autonomous` | Generate + elaborate autonomously        |

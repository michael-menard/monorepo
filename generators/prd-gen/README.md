# @tools/prd-gen

A tiny, dependency-free CLI to scaffold **PRDs + task-configs** in a Turborepo.

## Install (in your monorepo)

```
# add the package as a workspace (recommended layout)
/packages/prd-gen
```

Add to the root `package.json`:
```json
{
  "scripts": {
    "gen:prd": "node packages/prd-gen/bin/prd-gen.js"
  }
}
```

## Usage

```
# from repo root
pnpm gen:prd new --pkg apps/web --area ui --owner "@design-systems" --name "gallery-refactor"
```

### Flags
- `--pkg` (required): package/app path relative to repo root (e.g. `apps/web`)
- `--name` (required): kebab or plain text name; date prefix is auto-added
- `--area` (default: "web"): area label for Taskmaster
- `--type` (default: "feature"): type label
- `--risk` (default: "medium")
- `--owner` (default: "@owner")
- `--dry` preview only
- `--open` open files in $EDITOR if set

Generates:
```
{pkg}/docs/prds/{YYYY-MM-DD}-{slug}.md
{pkg}/docs/prds/{slug}.task-config.md
```

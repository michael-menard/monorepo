# PRD Generator (`prd-gen`)

A lightweight CLI tool for generating **Product Requirement Documents (PRDs)** and **Taskmaster task-configs** inside your monorepo.  
Keeps PRDs consistent, colocated with code, and ready for Taskmaster planning.

---

## 📂 Location in the Monorepo

This tool lives at:

```
/generators/prd-gen
```

---

## ⚙️ Setup

Add the generator as a script in your **monorepo root `package.json`**:

```json
"scripts": {
  "gen:prd": "node generators/prd-gen/bin/prd-gen.js"
}
```

(Optional) Add to your `turbo.json` so it can be run via Turborepo:

```json
{
  "pipeline": {
    "gen:prd": {
      "cache": false
    }
  }
}
```

(Optional) Add a Turbo task (no cache) using the included `TURBO_SNIPPET.json`.

---

## 🚀 Usage

From repo root:

```bash
pnpm gen:prd new --pkg apps/web --area ui --owner "@design-systems" --name "gallery-refactor"
```

### Flags

```
--pkg   path to app/package (required)
--name  human or-kebab name (required)
--area  label (default: web)
--type  label (default: feature)
--risk  label (default: medium)
--owner e.g. "@owner"
--dry   preview only
--open  opens in $EDITOR
```

---

## ⚙️ Commands

### `new`
Scaffold a new PRD + task-config pair.

```bash
pnpm gen:prd new --pkg <package-path> --name <feature-name> [options]
```

### `help`
Show usage information.

```bash
pnpm gen:prd help
```

---

## 🔧 Options

| Flag        | Required | Default   | Description |
|-------------|----------|-----------|-------------|
| `--pkg`     | ✅       | —         | Path to the package/app relative to repo root (e.g. `apps/web`, `packages/ui`). Determines where PRDs will be created under `docs/prds/`. |
| `--name`    | ✅       | —         | Feature or PRD name. Accepts words or kebab-case. A date prefix will be auto-added to the PRD filename. |
| `--area`    | ❌       | `web`     | Area label used for Taskmaster tagging (e.g. `ui`, `api`, `platform`). |
| `--type`    | ❌       | `feature` | Type label (e.g. `feature`, `refactor`, `bug`, `chore`, `doc`). |
| `--risk`    | ❌       | `medium`  | Risk level: `low`, `medium`, `high`. |
| `--owner`   | ❌       | `@owner`  | Owner/assignee (GitHub handle or team tag). |
| `--dry`     | ❌       | `false`   | Preview what would be generated without writing files. |
| `--open`    | ❌       | `false`   | Open generated files in `$EDITOR` (must be set in your environment). |

---

## 📝 Output

Running the example command above will generate:

```
apps/web/docs/prds/2025-09-06-gallery-refactor.md
apps/web/docs/prds/gallery-refactor.task-config.md
```

- **PRD (`.md`)** – A prefilled template with sections for Goals, Constraints, Acceptance Criteria, Phases A–E, Risks.  
- **Task-config (`.task-config.md`)** – Rules for Taskmaster: slice contract, phase-to-task mapping, labels, branching.

---

## 🔄 Workflow Integration

1. **Generate a PRD**  
   ```bash
   pnpm gen:prd new --pkg apps/web --name gallery-refactor
   ```

2. **Fill out the PRD** with goals, acceptance criteria, and standards.

3. **Adjust the task-config** if the defaults need tweaking (slice contract, labels, branching rules).

4. **Run Taskmaster to plan**  
   ```bash
   task-master plan apps/web/docs/prds/2025-09-06-gallery-refactor.md \
     --write tasks.json --link --labels
   ```

5. **Commit both files** (`.md` + `.task-config.md`) alongside your code.

---

## 🎨 Customizing Templates

The generator uses Handlebars-style templates located in:

```
/generators/prd-gen/templates/
  prd.md.hbs
  task-config.md.hbs
```

### How to modify:
- **`prd.md.hbs`** – Controls the default PRD structure (Goals, Constraints, Acceptance Criteria, Phases A–E, Risks).  
- **`task-config.md.hbs`** – Defines the default slice contract, labels, and branching rules for Taskmaster.  

### Adding new variables:
Available variables include:
- `{{id}}` → auto-generated PRD ID (date + slug)  
- `{{title}}` → human-readable title  
- `{{slug}}` → kebab-case version of the name  
- `{{owner}}` → PRD owner  
- `{{area}}` → Area label  
- `{{type}}` → Type label  
- `{{risk}}` → Risk level  
- `{{package}}` → Package path  

Modify templates as needed, then re-run the generator to see changes.

---

## ✅ Best Practices

- **Colocate PRDs** with the package they affect (`apps/*/docs/prds/`, `packages/*/docs/prds/`).  
- **Use descriptive names**: `YYYY-MM-DD-feature-name.md`.  
- **Always include acceptance criteria by Phase (A–E)** for automatic task derivation.  
- **Archive old PRDs** under `docs/prds/archive/`.  
- **Run `pnpm gen:prd` before sprint planning** to scaffold new work.  

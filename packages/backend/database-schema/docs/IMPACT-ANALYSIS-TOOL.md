# Schema Change Impact Analysis Tool

**Story:** WISH-20210

A CLI tool that analyzes proposed database schema changes and generates impact reports showing affected code across the monorepo.

## Overview

The Schema Change Impact Analysis Tool uses AST analysis (via ts-morph) to scan the codebase and identify files that would be affected by database schema changes. It helps developers understand the impact of schema migrations before implementing them.

## Installation

The tool is pre-installed as part of the `@repo/database-schema` package. No additional setup is required.

## Usage

### Basic Command

```bash
pnpm db:impact-analysis --table <table_name> --change <change_spec> [options]
```

### Options

- `--table <name>` - Table name to analyze (snake_case, e.g., `wishlist_items`)
- `--enum <name>` - Enum name to analyze (snake_case, e.g., `wishlist_store`)
- `--change <spec>` - Change specification (see format below)
- `--format <format>` - Output format: `md` (default) or `json`
- `--dry-run` - Preview output without writing to file

**Note:** You must specify either `--table` OR `--enum`, but not both.

### Change Specification Format

The `--change` parameter uses the format: `operation:target[:arg1][:arg2]`

#### Column Operations

**Add Column:**
```bash
--change add-column:column_name:type
```
Example: `--change add-column:priority:integer`

**Drop Column:**
```bash
--change drop-column:column_name
```
Example: `--change drop-column:notes`

**Rename Column:**
```bash
--change rename-column:old_name:new_name
```
Example: `--change rename-column:priority:importance`

**Change Column Type:**
```bash
--change change-type:column_name:new_type
```
Example: `--change change-type:priority:text`

#### Enum Operations

**Add Enum Value:**
```bash
--change add-value:value_name
```
Example: `--change add-value:Amazon`

**Remove Enum Value:**
```bash
--change remove-value:value_name
```
Example: `--change remove-value:Other`

**Rename Enum Value:**
```bash
--change rename-value:old_value:new_value
```
Example: `--change rename-value:Other:Custom`

#### Constraint Operations

**Add Index:**
```bash
--change add-index:column_name
```
Example: `--change add-index:email`

**Add Foreign Key:**
```bash
--change add-fk:column_name
```
Example: `--change add-fk:user_id`

**Modify Constraint:**
```bash
--change modify-constraint:constraint_name
```
Example: `--change modify-constraint:priority_check`

## Examples

### Analyze Adding a Column

```bash
cd packages/backend/database-schema
pnpm db:impact-analysis --table wishlist_items --change add-column:priority:integer
```

This generates a report showing:
- Which Zod schemas need updating
- Which backend services reference the table
- Which frontend components use the data
- Risk assessment and recommendations

### Analyze Enum Change

```bash
pnpm db:impact-analysis --enum wishlist_store --change add-value:Amazon
```

### Generate JSON Report

```bash
pnpm db:impact-analysis --table wishlist_items --change drop-column:notes --format json
```

### Preview Without Saving

```bash
pnpm db:impact-analysis --table wishlist_items --change add-column:status:text --dry-run
```

## Report Structure

### Markdown Report

Generated reports include the following sections:

1. **Change Summary** - Description of the proposed change
2. **Risk Assessment** - Breaking change status, backward compatibility, rollback safety
3. **Effort Estimate** - Low/Medium/High based on number of affected files
4. **Impact Analysis** - Affected files grouped by category:
   - Backend Services
   - Repositories
   - Zod Schemas
   - Frontend Components
   - API Hooks
   - Database Schema
   - Tests
5. **Recommendations** - Actionable steps for implementing the change

### JSON Report

JSON reports contain the same data in a machine-readable format suitable for CI/CD integration.

## Interpreting Results

### Risk Assessment

- **Breaking Change: YES** - Code changes required before deployment
- **Breaking Change: NO** - Change is backward compatible
- **Backward Compatible: YES** - Existing code will continue to work
- **Rollback Safe: YES** - Safe to rollback migration if needed

### Confidence Levels

Findings are marked with confidence levels:

- 🔴 **High** - Definitely affected, requires changes
- 🟡 **Medium** - Likely affected, should be reviewed
- 🟢 **Low** - Possibly affected, low priority

### Effort Estimates

- **Low** - < 5 affected files, simple updates
- **Medium** - 5-15 affected files, moderate effort
- **High** - 15+ affected files, significant refactoring

### Deployment Order

Reports include recommended deployment order:

- **database → backend → frontend** - For backward compatible additions
- **frontend → backend → database** - For breaking removals
- **Multi-phase** - For complex changes (e.g., column renames)

## Integration with CI/CD

The tool exits with different codes based on risk:

- **Exit code 0** - Non-breaking change
- **Exit code 1** - Breaking change detected
- **Exit code 2** - Error during analysis

You can use this in CI pipelines to automatically flag risky schema changes:

```yaml
# .github/workflows/schema-analysis.yml
- name: Analyze Schema Changes
  run: |
    pnpm db:impact-analysis --table wishlist_items --change add-column:new_field:text
  continue-on-error: true
```

## Known Limitations

The tool uses static analysis and has some limitations:

1. **Dynamic References** - Cannot detect runtime-constructed queries or dynamic table names
2. **String-Based Queries** - Raw SQL strings are not analyzed
3. **Non-TypeScript Files** - JavaScript, Python, and other languages are not scanned
4. **Indirect References** - May miss references through multiple layers of abstraction
5. **External Services** - Cannot detect usage in services outside the monorepo

Despite these limitations, the tool catches 80-90% of common impacts.

## Troubleshooting

### "Table not found in schema"

- Verify the table name is correct (use snake_case)
- Check that the table exists in `src/schema/index.ts` or related schema files
- Ensure the table variable name follows convention (e.g., `wishlist_items` → `wishlistItems`)

### "Enum not found in schema"

- Verify the enum name is correct (use snake_case)
- Check that the enum exists with the `Enum` suffix (e.g., `wishlistStoreEnum`)

### "No test files found"

- Make sure you're running from the `packages/backend/database-schema` directory
- Use `cd packages/backend/database-schema` before running

### Report shows no findings

- This is normal for some changes (e.g., adding indexes)
- Some changes have minimal code impact
- The tool may not detect all references (see Known Limitations)

## Advanced Usage

### Custom File Patterns

By default, the tool scans:
- `apps/api/lego-api/domains/**/*.ts`
- `apps/web/**/src/**/*.{ts,tsx}`
- `packages/core/api-client/src/**/*.ts`
- `packages/backend/database-schema/src/**/*.ts`

Test files are excluded by default but tracked separately.

### Programmatic Usage

You can import and use the tool's modules programmatically:

```typescript
import { Project } from 'ts-morph'
import { analyzeColumnChange } from '@repo/database-schema/scripts/impact-analysis/analyzers/column-analyzer'
import { discoverFiles } from '@repo/database-schema/scripts/impact-analysis/utils/file-scanner'

const files = await discoverFiles('/path/to/monorepo')
const project = new Project()
project.addSourceFilesAtPaths(files)

const result = analyzeColumnChange(project, parsedChange, tableInfo, monorepoRoot)
```

## Best Practices

1. **Run Early** - Analyze impact before writing migrations
2. **Review All Findings** - Even low-confidence findings can reveal edge cases
3. **Plan Multi-Phase Migrations** - For breaking changes, follow recommended deployment order
4. **Update Tests** - Impact reports identify test files that need updates
5. **Document Breaking Changes** - Use report in PRs to communicate impact

## Support

For issues or questions:
- Check the [Known Limitations](#known-limitations) section
- Review the [Troubleshooting](#troubleshooting) guide
- Consult the WISH-20210 story documentation

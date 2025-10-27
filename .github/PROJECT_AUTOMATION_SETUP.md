# GitHub Project Automation Setup

This document explains how to set up and use the automated GitHub Project workflow for the Lego MOC Database project.

## Workflow Overview

The automation handles moving issues through the following columns:

1. **Backlog** - New issues start here
2. **Ready to Work** - Issues that have been groomed and are ready to be picked up
3. **In Progress** - Issues being actively worked on
4. **QA** - Issues in quality assurance testing
5. **Done** - Completed and verified issues

## Automation Rules

| Trigger                      | Action                         | Result                                |
| ---------------------------- | ------------------------------ | ------------------------------------- |
| New issue created            | Automatically added to project | Placed in **Backlog**                 |
| `groomed` label added        | Issue moves forward            | Placed in **Ready to Work**           |
| Issue assigned to someone    | Issue moves forward            | Placed in **In Progress**             |
| PR merged (references issue) | Issue moves forward            | Placed in **QA** (adds `in-qa` label) |
| `qa-passed` label added      | Issue closes                   | Placed in **Done**                    |

## Setup Instructions

### 1. Create GitHub Project

1. Go to your repository on GitHub
2. Click the "Projects" tab
3. Click "New project"
4. Choose "Board" template
5. Name it "Lego MOC Database"
6. Create the following columns (in order):
   - Backlog
   - Ready to Work
   - In Progress
   - QA
   - Done

### 2. Configure Automation Settings

#### Option A: Use GitHub Project's Built-in Automation (Recommended for column moves)

1. Open your project
2. Click on each column's menu (⋯)
3. Set up automation:

   **Backlog:**
   - Set automation: "Item added to project"

   **Ready to Work:**
   - Set automation: "Item labeled: groomed"

   **In Progress:**
   - Set automation: "Item assigned"

   **QA:**
   - Set automation: "Item labeled: in-qa"

   **Done:**
   - Set automation: "Item closed"
   - Set automation: "Item labeled: qa-passed"

#### Option B: Use GitHub Actions (Already configured)

The workflow file `.github/workflows/project-automation.yml` is already set up.

### 3. Configure Repository Variables and Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following:

   **Variables:**
   - `PROJECT_URL` - Your project URL (format: `https://github.com/users/michael-menard/projects/YOUR_PROJECT_NUMBER`)

   **Secrets:**
   - `PROJECT_TOKEN` - Personal Access Token (PAT) with project permissions

#### Creating a Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set token name: "Project Automation"
4. Set expiration: 90 days or custom
5. Select repository: `Monorepo` (or specific repo)
6. Permissions:
   - Repository permissions:
     - Issues: Read and write
     - Pull requests: Read and write
     - Metadata: Read-only
   - Organization permissions (if applicable):
     - Projects: Read and write
7. Generate token and copy it
8. Add as `PROJECT_TOKEN` secret in repository settings

### 4. Required Labels

Create these labels in your repository (Settings → Labels):

- `groomed` - Issue has been reviewed and is ready to work on
- `in-qa` - Issue is currently in quality assurance testing
- `qa-passed` - Issue has passed QA and is ready to close

**To create labels via CLI:**

```bash
gh label create groomed --color "0E8A16" --description "Issue is groomed and ready to work"
gh label create in-qa --color "FBCA04" --description "Issue is in QA testing"
gh label create qa-passed --color "0E8A16" --description "Issue passed QA"
```

## Usage

### For Developers:

1. **Create a new issue** - It automatically goes to Backlog
2. **Add `groomed` label** - Moves to Ready to Work
3. **Assign yourself** - Moves to In Progress
4. **Create PR with issue reference** - Use `Fixes #123` or `Closes #123` in PR body
5. **Merge PR** - Issue automatically moves to QA with `in-qa` label
6. **QA tests and approves** - Add `qa-passed` label to close and move to Done

### For QA/Testers:

When an issue is labeled with `in-qa`:

1. Review the changes in staging/production
2. Test according to acceptance criteria
3. If passes: Add `qa-passed` label (issue auto-closes and moves to Done)
4. If fails: Remove `in-qa` label, comment with findings, reassign to developer

## Example Workflow

```
1. Create issue: "Add user authentication"
   → Automatically in Backlog

2. Team reviews issue, adds `groomed` label
   → Moves to Ready to Work

3. Developer assigns issue to themselves
   → Moves to In Progress

4. Developer creates PR with "Fixes #123"
   → PR is reviewed and merged
   → Issue moves to QA, gets `in-qa` label

5. QA tests the feature, adds `qa-passed` label
   → Issue closes and moves to Done
```

## Troubleshooting

### Workflow not triggering?

- Check that `PROJECT_TOKEN` secret is set correctly
- Verify `PROJECT_URL` variable matches your actual project URL
- Ensure the PAT has not expired
- Check Actions tab for workflow run errors

### Issues not moving between columns?

- If using built-in automation, verify column automation settings
- If using GitHub Actions, check the Actions tab for errors
- Verify labels exist and are spelled correctly

### Finding your Project URL:

1. Go to your project
2. Copy the URL from the browser
3. Format: `https://github.com/users/USERNAME/projects/NUMBER`

## Manual Operations

You can always manually move issues between columns by dragging them in the project board view.

## Notes

- The workflow runs automatically on issue and PR events
- Multiple automations can work together (built-in + GitHub Actions)
- Issues can be in multiple projects simultaneously
- Closed issues remain in the project for historical tracking

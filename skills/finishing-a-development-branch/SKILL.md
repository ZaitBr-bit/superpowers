---
name: finishing-a-development-branch
description: Use when implementation is complete, validation passes, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify validation → Present options → Execute choice.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Validation

**Before presenting options, verify the requested validation passes:**

```bash
# Run the project's lightweight validation
lint / typecheck / build / focused smoke check
```

**If validation fails:**
```
Validation failing (<N> issues). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until validation passes.
```

Stop. Don't proceed to Step 2.

**If validation passes:** Continue to Step 2.

### Step 2: Detect Environment

**Determine workspace state before presenting options:**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Keep / Discard / Stage-manual | No automatic cleanup |
| `GIT_DIR != GIT_COMMON`, named branch | Keep / Discard / Stage-manual | No automatic cleanup |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Keep / Discard / Stage-manual | No automatic cleanup |



### Step 3: Present Options

Implementation complete. Changes are uncommitted in the working directory.

Options:

1. Keep as-is (I'll handle git operations later)
2. Discard this work
   This will permanently discard all uncommitted changes.
3. Stage changes manually
   Suggested steps:
   a. Review the diff: git diff
   b. Stage files: git add [files]
   c. Commit: git commit -m "your message"
   d. Push/create PR manually

Which option? (1/2/3)

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Keep as-is

Report: "Keeping changes in working directory. Branch preserved."

No git commands executed.

#### Option 2: Discard

**Confirm first:**
```
This will permanently discard all uncommitted changes.
Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git reset --hard
```

Report: "All uncommitted changes have been discarded."

#### Option 3: Stage-manual

Report:
```
You can stage and commit the changes manually. Suggested steps:
1. Review the diff: git diff
2. Stage files: git add [files] (or git add . to stage all)
3. Commit: git commit -m "your message"
4. Push and create PR: git push && gh pr create (or use your platform)
```

No automatic git commands executed.



## Quick Reference

| Option | Action |
|--------|--------|
| 1. Keep as-is | Preserve changes in working directory |
| 2. Discard | `git reset --hard` to discard all changes |
| 3. Stage-manual | User stages/commits manually (guidance provided) |

## Common Mistakes

**Skipping validation**
- **Problem:** Discard broken code inadvertently
- **Fix:** Always verify validation before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" is ambiguous
- **Fix:** Present exactly the three structured options

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing validation
- Attempt to merge, push, or create PR automatically
- Delete work without confirmation
- Run `git reset --hard` without explicit typed "discard" confirmation
- Instruct user to commit (agent must not commit in read-only mode)

**Always:**
- Verify validation before offering options
- Detect environment before presenting menu
- Present exactly three options: Keep, Discard, Stage-manual
- Get typed confirmation for Discard (Option 2)
- Leave all other git operations to the user

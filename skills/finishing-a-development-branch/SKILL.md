---
name: finishing-a-development-branch
description: Use when implementation and validation are complete to report the uncommitted handoff and await explicit git instructions
---

# Finishing Development

## Core Rule

Verify the work and leave it uncommitted in the currently open branch. Never
commit, stage, create or switch branches, create worktrees, push, merge,
rebase, open a PR, or discard changes unless the user explicitly requests that
exact operation.

**Announce at start:** "I'm using the finishing-a-development-branch skill to
validate and hand off the current working tree."

## Step 1: Verify

Run the project's appropriate focused checks, then lint, typecheck, or build
when relevant. If validation fails, report the failures and stop.

## Step 2: Inspect Read-Only State

```bash
git status --short --branch
git diff --stat
```

Do not stage files while inspecting them.

## Step 3: Hand Off

Report:

- validation commands and results;
- files changed;
- current branch;
- that changes remain uncommitted.

Default outcome: keep every change as-is in the current working directory.
Do not present automatic merge, PR, branch, commit, discard, or cleanup
actions. If the user subsequently requests a git operation, execute only that
explicitly authorized operation after resolving its exact target.

---
name: using-git-worktrees
description: Use only when the user explicitly requests a new branch, worktree, or isolated workspace
---

# Using Git Worktrees

## Non-Negotiable Authorization

Development stays in the currently open branch and working directory by
default. Never create or switch branches, create a worktree, or commit changes
unless the user explicitly requests that exact git operation.

Requesting implementation, executing a plan, isolation, or "feature work" is
not authorization to create a branch or worktree. If isolation would materially
help but was not requested, explain why and ask before changing git state.

**Announce at start:** "I'm using the using-git-worktrees skill because you
explicitly requested an isolated branch or worktree."

## Step 1: Confirm Scope

Before mutation, confirm the request identifies:

- whether to create a branch, a worktree, or both;
- the branch name, or permission for you to propose one;
- the worktree location, when applicable.

If any target is ambiguous, ask. Do not infer authorization from a plan or
another skill.

## Step 2: Inspect Current State

Use read-only commands:

```bash
git status --short --branch
git rev-parse --show-toplevel
git branch --show-current
git worktree list
```

Preserve all existing changes. If the requested operation could conflict with
dirty files or an existing path/branch, report that before proceeding.

## Step 3: Execute Only the Requested Operation

Create or switch only what the user authorized. Worktree creation does not
authorize commits, pushes, merges, or additional branches.

When the harness provides a native worktree action such as `EnterWorktree` or
`WorktreeCreate`, prefer it over a shell command. Otherwise use the standard
git operation with the exact approved branch and path.

## Step 4: Verify

Report the resulting directory and current branch using read-only commands.
Continue development there only if that was part of the explicit request.

## Red Flags

Never:

- create a branch or worktree as an automatic setup step;
- switch away from the currently open branch without explicit permission;
- treat a request to implement as permission to alter git topology;
- commit, push, merge, rebase, or discard changes without explicit permission.

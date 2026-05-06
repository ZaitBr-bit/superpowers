---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

## Overview

Work happens directly in the current directory. Worktree creation is disabled in read-only mode.

**Core principle:** Detect current workspace state for information. Proceed in-place without creating isolated workspaces.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 1 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

In read-only mode, worktree creation is disabled. Proceed directly to Step 1 (Project Setup) in the current directory.


## Step 1: Project Setup (in-place)

Execute project setup directly in the current directory (read-only mode):

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Step 2: Verify Clean Baseline (in current directory)

Run lightweight readiness checks to ensure the current directory starts clean:

```bash
# Examples - use project-appropriate command when available
lint
typecheck
build
focused smoke check
```

**If readiness checks fail:** Report failures, ask whether to proceed or investigate.

**If readiness checks pass:** Report ready.

### Report

```
Working directory ready at $(pwd)
Readiness checks passed (<N> checks, 0 issues)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Proceed in current directory |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Readiness checks fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Read-Only Behavior

In read-only mode, worktree creation is disabled. All work proceeds directly in the current directory:

```
Current directory: $(pwd)
Branch: $(git branch --show-current)
Running setup and verification in-place.
```

No isolated workspace is created. The user retains full control over git operations (branching, committing, merging).



## Red Flags

**Never:**
- Create a worktree in read-only mode
- Use `git worktree add` or any worktree creation command
- Skip baseline readiness verification
- Proceed with failing readiness checks without asking

**Always:**
- Run Step 0 detection first (to know current isolation state)
- Work in the current directory without creating branches or commits
- Auto-detect and run project setup
- Verify clean readiness baseline

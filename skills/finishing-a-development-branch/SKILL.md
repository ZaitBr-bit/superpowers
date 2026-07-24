---
name: finishing-a-development-branch
description: Use when implementation is complete, validation passes, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

**Core principle:** Verify validation → Present options → Execute choice.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## Step 1: Verify Tests

# Run the project's lightweight validation
lint / typecheck / build / focused smoke check

**If tests fail**, report the failures and stop — the menu comes after a green suite:

**If validation fails:**
```
Validation failing (<N> issues). Must fix before completing:

[Show failures]
```

**If tests pass:** continue to Step 2.

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
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
2. Other option
	User describe

Which option? (1/2)

Present the menu exactly as written — concise, with every option coming
from the list above. Discarding the work happens only in response to your
human partner explicitly asking for it (see "If your human partner asks to
discard the work" below). Wait for their answer; the integration decision
is theirs.

### Step 4: Execute Choice

#### Option 1: Keep as-is

Report: "Keeping changes in working directory. Branch preserved."

No git commands executed.

#### Option 2: Other
Let user describre what to do










# Codex Tool Mapping

## Subagent dispatch requires multi-agent support

Add to Codex config (`~/.codex/config.toml`):

```toml
[features]
multi_agent = true
```

This enables subagent tools used by parallel and subagent-driven workflows.
Keep implementers available until any required task review passes.

## Git authorization

Use read-only commands to inspect the environment:

```bash
git status --short --branch
git rev-parse --show-toplevel
git branch --show-current
git worktree list
```

Development remains in the current branch and directory. Never commit,
create/switch branches, create worktrees, push, merge, rebase, or open a PR
unless the user explicitly requests that exact operation. A detached HEAD or
sandbox limitation is reported; it is not permission to create a branch.

When an authorized operation is blocked, preserve the working tree and explain
the relevant native control:

- **Create branch** - available only after the user requests a branch.
- **Hand off to local** - transfers work to the user's local checkout.

You may provide suggested branch names, commit messages, and PR descriptions
without executing their operations.

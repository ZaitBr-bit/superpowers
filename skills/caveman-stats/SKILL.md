---
name: caveman-stats
description: >
  Show real token usage and estimated savings for the current session.
  Reads directly from the Claude Code session log — no AI estimation.
  Triggers on /caveman-stats. Output is injected by the mode-tracker hook;
  the model itself does not compute the numbers.
---

This skill is delivered by `hooks/caveman-stats.js` (called by `hooks/caveman-mode-tracker.js` on `/caveman-stats`). The model does not need to do anything when this skill fires — the hook returns `decision: "block"` with the formatted stats as the reason. The user sees the numbers immediately.

## Commands

| Command | What it does |
|---------|-------------|
| `/caveman-stats` | Current session: output tokens, cache reads, estimated savings |
| `/caveman-stats --share` | One-line summary suitable for sharing |
| `/caveman-stats --all` | Lifetime aggregate across all sessions |
| `/caveman-stats --since 7d` | Aggregate for the last 7 days (also accepts `24h`, etc.) |

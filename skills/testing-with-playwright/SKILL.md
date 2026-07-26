---
name: testing-with-playwright
description: Use when a task or plan requires validating browser/UI behavior (end-to-end flows, UI interactions, DOM/visual assertions) with Playwright
---

# Testing With Playwright

## Overview

**Core principle:** plan the complete test scenario before touching any tool, then execute it as one batched unit. Never call Playwright MCP tools (`browser_navigate`, `browser_click`, `browser_snapshot`, ...) one at a time from the controller — each call returns a large accessibility tree, and per-step round-trips multiply that cost across a session.

## Detect the Execution Path

Check the target project for a Playwright test runner before planning anything:
- `package.json` devDependencies contains `playwright` or `@playwright/test`, or a `playwright.config.*` file exists → **Path A (CLI)**.
- `pytest-playwright` in `requirements*.txt` / `pyproject.toml`, or an equivalent test-runner binding → **Path A (CLI)**.
- None of the above → **Path B (MCP fallback)**, after offering to set up Path A.

## Path A: CLI (preferred)

1. Use Playwright MCP only to explore the page and find selectors while writing the spec — not to run the validation.
2. Write (or extend) a real spec file containing every step and assertion the scenario needs. No placeholders — a reviewer or a fresh agent must be able to run it unchanged.
3. Run it with one shell command: `npx playwright test <file> --reporter=line` (or the project's existing test command). Read only the compact pass/fail output.

## Path B: MCP fallback

Project has no Playwright test runner:

1. **Offer** to add Playwright as a dev dependency with minimal config — this is a state-changing action, so ask before doing it. If accepted, set it up and switch to Path A.
2. If declined or infeasible, write the full scenario as an ordered list of steps and the expected assertion at each decision point — during planning, not during execution.
3. At execution time, dispatch **one subagent** that runs the entire scenario through Playwright MCP tools internally and returns only a compact pass/fail summary plus an evidence path (final snapshot). The controller never calls MCP browser tools directly for repeatable validation — only for one-off exploration.

## Token-Efficiency Rules

Applies to both paths:
- Reuse the same browser/page context for the whole scenario; close it when done.
- Independent scenarios (unrelated UI flows) run as parallel subagents — **REQUIRED SUB-SKILL:** Use superpowers:dispatching-parallel-agents — never serially.

Path B (MCP) only:
- One subagent per whole scenario — never one dispatch per step.
- Prefer `browser_snapshot` over screenshots; take it only at decision points, not after every action.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just click through it live to check" | That's per-step MCP calls from the controller — the exact cost this skill exists to avoid. Batch it. |
| "No test runner, so MCP one-by-one is the only option" | Offer to set up Playwright as a dev dependency first; only fall back to MCP-only after that's declined or infeasible. |
| "I'll figure out the scenario as I click" | Plan the full scenario first — writing-plans requires the concrete steps up front, not discovery during execution. |
| "One subagent per click keeps things simple" | One subagent per scenario. Per-step dispatch multiplies overhead, not clarity. |

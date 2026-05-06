---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, validation, docs they might need to check, how to validate it. Give them the whole plan as bite-sized tasks. DRY. YAGNI.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good validation design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `superpowers:using-git-worktrees` skill at execution time.
**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working software with clear, lightweight validation on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Implement the smallest useful change" - step
- "Run a minimal reproduction or focused validation" - step
- "Adjust the code until the validation is clean" - step
- "Run lint, typecheck, build, or a manual check" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Validate: `scripts/exact/path/to/check.py`

- [ ] **Step 1: Implement the smallest useful change**

```python
def function(input):
    return expected
```

- [ ] **Step 2: Run a minimal reproduction or focused validation**

Run: `python scripts/path/check.py`
Expected: Confirm the current behavior or surface the issue clearly

- [ ] **Step 3: Refine the implementation until validation is clean**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run lint, typecheck, build, or manual check**

Run: `python -m compileall .`
Expected: Clean output with exit code 0

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Add validation for the above" (without concrete validation steps)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, validation-first

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, offer execution choice:

**In VS Code — MANDATORY:** The execution choice MUST be asked via `vscode_askQuestions`, never inline in the chat. Never post the question as text and stop to wait — always use the tool.

**Decision logic — MANDATORY:**
1. If the user has **already provided** an execution preference in the current context, **do not ask again**. Reuse that choice.
2. If no explicit preference exists, ask via `vscode_askQuestions`.
3. After a choice is known (new or reused), **continue immediately in the same turn** by invoking the selected execution skill and starting Task 1. Do not stop with messages like "if you want, I can continue".
4. Any follow-up question needed during execution must also use `vscode_askQuestions` (never inline chat questions).

Example `vscode_askQuestions` call:
```
header: "Execution approach"
question: "Plan complete and saved to docs/superpowers/plans/<filename>.md. Which execution approach do you prefer?"
options:
  - label: "Subagent-Driven (recommended)"
    description: "Dispatch a fresh subagent per task, review between tasks, fast iteration"
    recommended: true
  - label: "Inline Execution"
    description: "Execute tasks in this session using executing-plans, batch execution with checkpoints"
```

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + two-stage review

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Batch execution with checkpoints for review

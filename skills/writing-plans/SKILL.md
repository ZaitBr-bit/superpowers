---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write implementation plans for an engineer who has not seen this codebase or this spec. Assume they write idiomatic code in the project's language once they know the exact interface and the exact validation, and that they will make a reasonable choice wherever the plan leaves one open. What they cannot know is what you decided: which files, which names and signatures, which values from the spec, which validation proves each task. Document those. Give them the whole plan as bite-sized tasks. DRY. YAGNI.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Execution stays in the currently open branch and directory.
Mention a new branch or worktree only when the user explicitly requested one.
Plans contain no commit, branch, or worktree steps unless the user explicitly
requested that exact operation.

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

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and a distinct
risk decision. When drawing task boundaries: fold setup,
configuration, scaffolding, and documentation steps into the task whose
deliverable needs them; split only where a reviewer could meaningfully
reject one task while approving its neighbor. Each task ends with an
independently testable deliverable.

## Task Risk

Assign each task `low`, `medium`, or `high` using
[the shared risk criteria](../subagent-driven-development/references/risk-classification.md).
Low risk requires every listed condition; medium is the default when
uncertain. The execution controller reassesses risk from the actual diff and
may promote it before completion.

## Browser/UI Validation Tasks

When a task's Validate step exercises browser/UI behavior, plan the concrete
Playwright scenario now — the spec file with every step and assertion, or the
full ordered list of steps and assertions — instead of leaving discovery for
execution time. **REQUIRED SUB-SKILL:** Use superpowers:testing-with-playwright
to pick the execution path (CLI vs. batched MCP subagent). The scenario is a
validation step under "What a Step Contains" below: exact values, no gaps.

## GitLab CI/CD YAML Tasks

When a task creates or changes GitLab CI/CD YAML, its Validate step is
`glab ci lint <file>` with the exact command and the expected output
`CI/CD YAML is valid!`. If the file is an include-only template, plan the lint
on a temporary copy with the includer's `stages:` prepended (see
superpowers:verification-before-completion). List what the lint cannot
confirm (variable-dependent `rules:`, image tool versions, artifact endpoints)
as a post-merge check in the task, not as a silent assumption.

## Step Granularity

**Each step is one action with a checkable result:**
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

**Spec:** [path to the spec/design doc this plan implements — the plan
argues from the spec, so the spec travels with it; executors read both]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

## Review Focus

[The five input classes or failure modes the spec implies but no task's
validation exercises that are most likely to bite a person using this
software — one line each, naming the input or condition and the behavior
a reasonable person would expect, most likely first. The spec is a vision
document: it says what the software must do, not everything it will
meet, and its silence on an input is not permission for that input to
break the program. Write the list here, once, with the spec in front of
you. Then, for each line, add the validation that pins it to the task
that owns the code, in that task's own step style.]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Risk:** low | medium | high - [observable reason]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Validate: `scripts/exact/path/to/check.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Implement `function(input: InputType) -> ResultType` in `exact/path/to/file.py`**

One line on the approach when the signature and the validation leave a
choice (which library call, which data structure); a code block only for an
algorithm they do not determine.

- [ ] **Step 2: Run a minimal reproduction or focused validation**

Run: `python scripts/path/check.py`
Expected: [the exact output that means the change works, with the spec's values]

- [ ] **Step 3: Adjust the code until the validation in Step 2 is clean**

- [ ] **Step 4: Run lint, typecheck, build, or manual check**

Run: `python -m compileall .`
Expected: Clean output with exit code 0
````

## What a Step Contains

A step is done when the implementer can write exactly one reasonable thing
from it. That is the whole requirement: unambiguous, not complete. Each kind
of step carries what makes it unambiguous and nothing more:

- **A validation step:** the command or check to run, what it asserts (as
  code when it is a test), with the spec's exact values in it, and the
  output that means it passed.
- **A code step:** the exact signature (name, parameters, return type), the
  file it lives in, and the specific values the spec pins. The implementer
  writes the body. A body appears only for an algorithm the signature and
  validation do not determine, or for exact copy the spec fixes.
- **A reference to another task:** that task's Interfaces block says what
  to use; the plan does not repeat that task's code.

A plan is the set of decisions the implementer cannot make alone. A plan
longer than the code it describes has written the code instead. Lines that
decide nothing ("TBD", "handle edge cases", "add appropriate validation",
"add validation for the above", a type or function no task defines) are the
opposite failure, and the self-review catches both.

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Step scan:** Every step must let the implementer write exactly one reasonable thing, and no step may carry more than that: a line that decides nothing is a gap, a function body the signature and validation already determine is a transcript. Fix both.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Review Focus:** For each input class or failure mode the spec implies, is there a task whose validation exercises it? The five uncovered ones most likely to bite a person go in the Review Focus section, and each line there gets its validation added to the owning task. An empty section means you checked and found none, not that you skipped the check.

**5. Proportion:** Compare the plan's length to the spec's. A plan several times longer than the spec it implements is a transcript of the program, not a plan. If code blocks are most of the document, replace bodies with signatures and validation assertions, and check that each step is still unambiguous.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving and self-reviewing the plan, link it for your human partner
to read. If they have already explicitly supplied an execution method, ask
them to review the plan and confirm it captures what they want; wait for that
review before implementation, then use the preserved method. Otherwise, ask
them to review the plan and choose an execution method before implementation.

**In VS Code — MANDATORY:** The handoff question MUST be asked via `vscode_askQuestions`, never inline in the chat. Never post the question as text and stop to wait — always use the tool.

**Decision logic — MANDATORY:**
1. If the user has **already provided** an execution preference in the current context, **do not ask for it again**. Reuse that choice and ask only for the plan review.
2. If no explicit preference exists, compute the recommended default:
   - 1-2 mechanical tasks with clear requirements and limited file scope:
     recommend Native. A subagent would cost more context than it saves.
   - 3+ tasks, integration work, or tasks needing isolated context: recommend
     Subagent-driven.
3. Ask via `vscode_askQuestions`, placing the computed recommendation first.
4. After the review is confirmed and a method is known (new or reused), **continue immediately in the same turn** by invoking the selected execution skill and starting Task 1. Do not stop with messages like "if you want, I can continue".
5. Any follow-up question needed during execution must also use `vscode_askQuestions` (never inline chat questions).

**When no execution method has already been supplied:**

**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend <one of the two>, because <one sentence from the plan: how much the tasks depend on each other's interfaces, how many there are, what a shipped mistake would cost>. Does the plan capture what you want, and which approach should we use?"**

Example `vscode_askQuestions` call:
```
header: "Execution approach"
question: "Plan complete and saved to docs/superpowers/plans/<filename>.md. Please review the plan. Does it capture what you want, and which execution approach do you prefer?"
options:
  - label: "[Computed recommendation]"
    description: "[Why this plan's size and coupling fit this execution mode]"
    recommended: true
  - label: "[Other execution mode]"
    description: "[Its trade-off for this plan]"
```

**When an execution method has already been supplied:**

**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Please review the plan. Does it capture what you want?"**

**If Subagent-driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + risk-based task review + mandatory final review

**Operational mapping (VS Code agent):**
- "Subagent-driven" means: invoke `runSubagent` immediately in the same turn with Task 1 scope.
- Do not stop after announcing choice; first subagent invocation must already be in-flight before ending turn.

**If Native chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans

**Failure recovery rule:**
- If the review was confirmed and a method chosen but no execution started, next response MUST auto-resume by starting Task 1 immediately (without re-asking execution preference).

---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each medium- or high-risk task in subagent-driven development
- After completing major feature
- Before merge to main

Low-risk tasks may omit the independent per-task reviewer only when they meet
the documented risk gate; they remain covered by the mandatory final
whole-branch review.

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Write the git diff to an artifact:**
```bash
mkdir -p .superpowers/reviews
DIFF_FILE=".superpowers/reviews/review-$(git rev-parse --short HEAD).diff"
git diff --no-color > "$DIFF_FILE"
```

Pass the path, not the diff text. The diff stays out of the controller context.

**2. Dispatch code reviewer subagent:**

Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{DIFF_FILE}` - Path to the git diff artifact

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

[Write git diff to DIFF_FILE]

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  DIFF_FILE: [.superpowers/reviews/review-<sha>.diff]

[Subagent returns]:
  VERDICT: WITH FIXES
  Important, src/index.ts:41, missing progress indicators
  Minor, src/index.ts:19, reporting interval is a magic number

You: [Fix progress indicators]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window you need to keep driving the work. Dispatch a reviewer subagent: the diff and the evaluation live in its context, and only the findings come back to you. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |

## Red Flags

**Never:**
- Skip a required review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code, behavior, or lightweight validation that proves it works
- Request clarification

## Review Focus

Center the review on whether the change:
- Matches the requested behavior
- Handles errors clearly and safely
- Uses naming that makes the intent obvious
- Has an architecture that fits the surrounding code
- Keeps the risk of regressions low
- Includes any lightweight validation needed to support the change

See template at: [code-reviewer.md](code-reviewer.md)

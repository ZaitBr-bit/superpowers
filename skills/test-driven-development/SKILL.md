---
name: test-driven-development
description: Use when implementing any feature or bugfix and you want a development-first workflow with lightweight validation
---

# Development-First Validation

## Overview

Start with the smallest useful implementation, then validate it lightly and refine as needed.

**Core principle:** If the behavior is clear and the change stays small, validation can stay simple and targeted.

**Keep the work focused on behavior, clarity, and minimal change.**

## When to Use

**Usually:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**When to pause and align with your human partner:**
- Throwaway prototypes
- Generated code
- Configuration files
- Changes with unclear behavior or high risk

If the path is unclear, clarify the desired behavior first, then implement the smallest safe step.

## The Validation Rule

Prefer implementation-first development. Validate the result with the lightest check that gives confidence.
When writing or changing any test, read [writing-good-tests.md](writing-good-tests.md) for the rules that keep tests honest:
- Name the production change that would make the test fail — before writing it
- Assert on real behavior, never on mock behavior
- Keep test-only code in test utilities, out of production classes
- Understand a dependency's side effects before mocking it

## Development Loop

1. Implement the smallest useful change.
2. Inspect the code path and confirm the behavior is coherent.
3. Run the lightest available validation: lint, typecheck, build, or a focused manual check.
4. Refactor for clarity if the change can be made simpler.
5. Stop once the behavior is understandable and the code is easy to review.

For browser/UI behavior, the lightest available validation is a batched
Playwright run, not step-by-step manual clicking through MCP tools.
**REQUIRED SUB-SKILL:** Use superpowers:testing-with-playwright.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests written after pass immediately — which proves nothing. They may test the wrong thing, test the implementation instead of the behavior, or miss the edge case you forgot. You never watched it fail, so you never proved it can catch the bug. Test-first forces that failure. |
| "Tests after achieve same goals (spirit not ritual)" | Tests-after answer "what does this do?"; tests-first answer "what should this do?" Tests written after are biased by the code you already wrote — you verify the cases you remembered, not the ones you'd have discovered. Coverage without proof the tests work. |
| "Already manually tested" | Manual testing is ad-hoc: no record of what you covered, no way to re-run it when the code changes, easy to forget cases under pressure. "Worked when I tried it" ≠ comprehensive. Automated tests run the same way every time. |
| "Deleting X hours is wasteful" | Sunk cost fallacy — that time is already spent either way. The real choice: rewrite with TDD (high confidence) vs. keep it and bolt tests on after (low confidence, likely bugs). Keeping code you can't trust is the waste. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD IS the pragmatic path: catches bugs before commit, prevents regressions, lets you refactor without fear. "Pragmatic" shortcuts mean debugging in production — slower, not faster. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

## Good Work

- One change, one clear purpose
- Code that reads directly
- Minimal branching and duplication
- Validation that matches the risk of the change

## What to Prefer

- Prefer small functions and straightforward control flow
- Prefer explicit names over clever shortcuts
- Prefer targeted validation over broad ceremony
- Prefer removing complexity before adding more structure

## When Stuck

| Problem | Better move |
|---------|-------------|
| Behavior is unclear | Write down the expected outcome in plain language |
| Change feels risky | Make it smaller and validate the narrow path first |
| Code is hard to reason about | Simplify the interface or split responsibilities |
| Validation is noisy | Use the narrowest useful check available |

## Red Flags - Pause and Reassess

- Implementation is drifting beyond the requested behavior
- The change is growing without a clear reason
- Validation is too broad for the size of the change
- Names, flow, or structure are harder to explain than the feature itself
- You cannot describe what the code is supposed to do in one sentence

If one of these shows up, slow down, simplify, and realign with the intended behavior.

## Verification Checklist

Before marking work complete:

- [ ] The behavior is clear and matches the request
- [ ] The implementation is minimal and focused
- [ ] Lightweight validation ran when useful
- [ ] No obvious correctness, style, or clarity issues remain
- [ ] The change is ready for review

## Final Rule

```
Understand the behavior, implement the smallest useful change, then validate lightly.
```

Keep it simple. Keep it clear. Keep moving.

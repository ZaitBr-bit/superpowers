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

## Development Loop

1. Implement the smallest useful change.
2. Inspect the code path and confirm the behavior is coherent.
3. Run the lightest available validation: lint, typecheck, build, or a focused manual check.
4. Refactor for clarity if the change can be made simpler.
5. Stop once the behavior is understandable and the code is easy to review.

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

# Spec Document Reviewer Prompt Template

Use this template when dispatching a spec document reviewer subagent.

**Purpose:** Verify the spec is complete, consistent, and ready for implementation planning.

**Dispatch after:** Spec document is written to docs/superpowers/specs/

```
Subagent (general-purpose):
  description: "Review spec document"
  model: [MODEL — REQUIRED: choose per ../using-superpowers/references/subagent-models.md]
  [EFFORT_FIELD]: medium [REQUIRED: Claude uses effort; Codex uses reasoning_effort]
  [MAX_TURNS_FIELD]: 4 [Claude only: use maxTurns; omit in Codex]
  prompt: |
    You are a spec document reviewer. Verify this spec is complete and ready for planning.

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Completeness | TODOs, placeholders, "TBD", incomplete sections |
    | Consistency | Internal contradictions, conflicting requirements |
    | Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
    | Scope | Focused enough for a single plan — not covering multiple independent subsystems |
    | YAGNI | Unrequested features, over-engineering |

    ## Calibration

    **Only flag issues that would cause real problems during implementation planning.**
    A missing section, a contradiction, or a requirement so ambiguous it could be
    interpreted two different ways — those are issues. Minor wording improvements,
    stylistic preferences, and "sections less detailed than others" are not.

    Approve unless there are serious gaps that would lead to a flawed plan.

    ## Output Format

    If approved with no blocking issue, return exactly:
    `PASS`

    Otherwise return only:
    `FAIL`
    - [Section X]: [specific issue] — [why it blocks planning]

    ## Inputs

    **Spec to review:** [SPEC_FILE_PATH]
```

**Reviewer returns:** `PASS`, or `FAIL` plus blocking issues only

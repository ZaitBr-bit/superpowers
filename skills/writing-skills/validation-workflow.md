# Skill Validation Workflow

Read this when creating or changing behavior-shaping guidance, or when the
skill's effectiveness must be demonstrated.

## Iron Law

```
NO BEHAVIOR-SHAPING SKILL CHANGE WITHOUT BASELINE EVIDENCE
```

Do not write the guidance first and then invent a baseline. Capture how an
agent behaves without the proposed guidance, including exact failures and
rationalizations.

## Match Validation to Skill Type

| Skill type | Validate with | Success |
|---|---|---|
| Discipline/rules | pressure scenarios and combined pressures | rule followed under pressure |
| Technique | application, variation, and missing-information scenarios | technique applied correctly |
| Pattern | recognition, application, and counterexamples | correct when/when-not judgment |
| Reference | retrieval, application, and gap scenarios | information found and used correctly |

## Evidence Loop

1. Run a no-guidance control in fresh context.
2. Record the concrete failure and verbatim rationalization.
3. Write the smallest guidance that addresses that failure.
4. Run the same scenario with the guidance.
5. Add counters only for newly observed loopholes.
6. Repeat until results converge.

For wording changes, micro-test before full scenarios:

- one fresh-context sample per call;
- realistic surrounding prompt, not isolated wording;
- a no-guidance control;
- at least five repetitions per variant;
- manual review of every flagged match;
- treat high variance as failure to bind behavior.

For full pressure scenarios and subagent methodology, read
[testing-skills-with-subagents.md](testing-skills-with-subagents.md).

## Choose the Right Guidance Form

| Baseline failure | Use |
|---|---|
| knowingly skips a rule | prohibition, red flags, observed-rationalization table |
| produces the wrong shape | positive output recipe or contract |
| omits a required element | required structural field |
| behavior depends on a condition | condition keyed to an observable predicate |

Avoid nuance and exemption clauses. If an exception is real, express it as a
separate observable condition.

## Discipline-Skill Hardening

- State the foundational principle early.
- Close only loopholes observed in baseline testing.
- Build the rationalization table from evidence, not imagination.
- Add a short red-flags list agents can recognize mid-task.
- Update the skill description with symptoms that precede violations.

Do not apply prohibition-heavy wording to an output-shaping problem; it often
amplifies the unwanted behavior.

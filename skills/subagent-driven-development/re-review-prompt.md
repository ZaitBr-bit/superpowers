# Scoped Re-Review Prompt Template

Use this template when dispatching a re-review after a fix round. The
re-reviewer verifies the findings were addressed and checks the fix diff for
new breakage. It is not a fresh review — the full review already happened.

**Purpose:** Verify each finding from the previous review was addressed, and
that the fix itself broke nothing.

```
Subagent (general-purpose):
  description: "Re-review Task N fix round R"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  [EFFORT_FIELD]: medium [REQUIRED: Claude uses effort; Codex uses reasoning_effort]
  [MAX_TURNS_FIELD]: 4 [Claude only: use maxTurns; omit in Codex]
  prompt: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer has attempted to fix them. Your job is to
    verdict each finding and inspect the fix diff — nothing else.

    ## Input Handling

    Read the task brief, findings, implementer report, and diff file listed
    in Inputs. The diff file contains the current working-tree status and
    tracked/untracked diff. Do not re-run git commands. If the diff file is
    missing, report that the re-review cannot proceed.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## You Do Not Dispatch Subagents

    Do all of this review yourself. Never spawn a subagent to review part
    of the diff, and never spawn another reviewer for a second opinion.
    This process already provides every review seat the work gets; a
    reviewer you spawn duplicates one of them at full cost, and its
    verdict counts for nothing. If the diff feels too large for one
    pass, review it in passes yourself and say so in your report.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: if you notice an issue entirely
    outside the fix diff, report it under Out-of-Scope Observations — it
    does not block this task and does not extend the loop. A broad
    whole-branch review happens after all tasks are complete.

    ## Tests

    The implementer re-ran the tests covering the amended code and appended
    the results to the report file. Treat the report as unverified claims:
    confirm the fix report names the covering tests and shows their output,
    and verify the claims against the diff. Do not re-run the suite to
    confirm their report. Run a test only when reading the code raises a
    specific doubt that no existing run answers — and then a focused test,
    never a package-wide suite.

    ## Output Format

    If all findings are addressed and there is no new Critical/Important
    breakage, return exactly:
    `PASS`

    Otherwise return only:
    - each open finding — `NOT ADDRESSED`, with file:line evidence
    - new breakage — severity, file:line, defect
    - out-of-scope observations only when present

    No addressed-finding recap, empty sections, preamble, or closing summary.

    ## Inputs

    **Task brief:** [BRIEF_FILE]
    **Findings:** [FINDINGS]
    **Implementer report:** [REPORT_FILE]
    **Diff file:** [DIFF_FILE]
```

**Placeholders:**
- `[MODEL]` — REQUIRED: reviewer model per SKILL.md Model Selection; scoped
  re-reviews of small fix diffs take a cheap-to-mid tier
- `[BRIEF_FILE]` — the task brief file (same file the implementer worked from)
- `[FINDINGS]` — the Critical/Important findings and spec gaps from the
  previous review, copied verbatim, one per bullet
- `[REPORT_FILE]` — the implementer's report file (fix reports appended)
- `[DIFF_FILE]` — the path `scripts/review-package PLAN_FILE` printed

**Re-reviewer returns:** `PASS`, or remaining findings and new breakage only

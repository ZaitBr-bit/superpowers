---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

**The deliverable is a file.** Every review produces a markdown report in the
current workspace under `docs/superpowers/reviews/`. The chat gets the verdict
and the path; the findings live in the report.

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

**1b. When a Jira issue key is supplied — gather demand context and scope the diff:**

Both scripts live in this skill's `scripts/` directory and print a single path to stdout.
Pass those paths onward, never their contents.

```bash
SKILL=<this skill's base directory>
JIRA_FILE=$(node "$SKILL/scripts/jira-context.mjs" CISS-180745)
DIFF_FILE=$(bash "$SKILL/scripts/resolve-diff.sh" CISS-180745)
```

`resolve-diff.sh` accepts three optional flags, mutually exclusive:
- `--branch <ref>` — search the issue's commits on that ref instead of `HEAD`
- `--commit <sha>` — review exactly that commit. For a merge commit it takes the
  diff against the first parent, because `git show` on a merge yields the
  combined diff, which is usually near-empty and would silently produce an empty
  review
- `--diff-file <path>` — use a physical diff file as-is, for pre-merge review

`jira-context.mjs` reads its credentials from `.env` in this skill's directory
(see `.env.example`). Never pass the token through the conversation.

Derive the changed-file list for the reviewer prompt from the diff itself — the
result fills `{FILES_CHANGED}`:

```bash
grep '^diff --git' "$DIFF_FILE" | awk '{print $3}' | sed 's|^a/||' | sort -u
```

Then dispatch as in step 2, setting `{PLAN_OR_REQUIREMENTS}` to `$JIRA_FILE` —
a path, exactly as the template's "plan file path" usage intends.

Either script exiting non-zero aborts the review. Do not dispatch a reviewer
with an empty diff, or without the demand context that was requested.

**1c. Decide the report path — the review report is a file, not a chat message:**

Every review writes its findings to a markdown report **in the current
workspace**, never in the skill directory and never only in the conversation:

```bash
mkdir -p docs/superpowers/reviews
REVIEW_REPORT_FILE="docs/superpowers/reviews/<YYYY-MM-DD>-<slug>.md"
```

- `<YYYY-MM-DD>` — today's date.
- `<slug>` — the Jira key plus a short kebab-case topic (`CISS-180745-validacao-titulo`),
  or the feature/branch name when there is no Jira key.
- **One report per demand.** When a single diff covers several Jira issues,
  dispatch one reviewer per issue with its own `{REVIEW_REPORT_FILE}`, so each report
  is judged against its own requirements.
- Write the report in the language of the repository's requirements and code
  comments — for a Brazilian Portuguese codebase, the report is in PT-BR.

The report is left uncommitted in the working tree. Do not commit it unless the
user explicitly asks.

**2. Dispatch code reviewer subagent:**

Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do (a plan file path, or the Jira context file from step 1b)
- `{DIFF_FILE}` - Path to the git diff artifact
- `{FILES_CHANGED}` - Comma-separated list of changed files
- `{REVIEW_REPORT_FILE}` - Path from step 1c where the reviewer writes its findings
- `{REVIEW_REPORT_LANGUAGE}` - Language the report must be written in

**3. Report the path, not the findings:**

The reviewer writes the full report and returns a verdict line, the report
path, and a title-only index of the Critical/Important findings. Your chat
reply is a pointer, not a transcript:

- Give the verdict, the counts by severity, and the clickable report path.
- Blocking findings may get one title line each — the reviewer's index line,
  not its body.
- Never paste the defect bodies, impact text, fixes, or the report contents
  into the chat — that is what the `.md` is for.
- When several reviewers ran, list one line per report.

The index exists so a dispatcher can route fixes and write a ledger without
opening the report. Downstream steps that need the full findings — a fix
subagent, a scoped re-review — get the **report path**, and read it
themselves. Never read the report into your own session to re-type it.

**4. Act on feedback:**
- Read the report file when you are about to fix
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

[Write git diff to DIFF_FILE, decide REVIEW_REPORT_FILE]

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  DIFF_FILE: [.superpowers/reviews/review-<sha>.diff]
  REVIEW_REPORT_FILE: docs/superpowers/reviews/2026-08-19-verify-index.md

[Subagent writes the report and returns]:
  VERDICT: WITH FIXES — 0 Critical, 1 Important, 1 Minor
  Report: docs/superpowers/reviews/2026-08-19-verify-index.md

You: VERDICT WITH FIXES — nothing blocking. 1 Important, 1 Minor.
     Report: docs/superpowers/reviews/2026-08-19-verify-index.md

[Fix progress indicators]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window you need to keep driving the work. Dispatch a reviewer subagent: the diff and the evaluation live in its context, the findings land in the report file, and only the verdict and the path come back to you. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |
| "There are only two findings — I'll just write them in the chat" | The report is always a file. Chat scrolls away and the next session cannot read it; the `.md` in the workspace survives, diffs, and can be handed to whoever fixes the code. Two findings is still a report. |
| "I'll write the report later, after the fixes" | Write it when the reviewer returns. A report written after the fixes records what you remember, not what was found. |
| "The user asked for the findings, so they want them in the chat" | They want the findings — the file is where findings live. Reply with the verdict, the counts, and the path. |

## Red Flags

**Never:**
- Skip a required review because "it's simple"
- Write findings only in the chat instead of the workspace `.md`
- Put the report anywhere but the current workspace
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

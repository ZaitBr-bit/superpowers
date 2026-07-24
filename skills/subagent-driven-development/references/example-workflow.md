# Subagent-Driven Development Example

Read this only when the main workflow is unclear or a concrete walkthrough is
needed.

```text
Controller: using Subagent-Driven Development.

[Verify current directory and branch without changing them]
[Resolve plan-scoped workspace and ledger]
[Create task todos]

Task 1:
[Classify low risk: one-file mechanical change with focused validation]
[Generate task brief]
[Dispatch implementer with brief, context, report path, explicit model/effort]
Implementer: DONE; 5/5 passing; changed files; report path
[Reassess actual diff: low-risk conditions still hold]
[Ledger: low-risk gate passed; Task 1 complete; final review pending]

Task 2:
[Classify medium risk: coordinated internal interface change]
[Generate brief and dispatch implementer]
Implementer: DONE; 8/8 passing; changed files; report path
[Generate review package]
[Dispatch task reviewer]
Reviewer:
SPEC: FAIL
QUALITY: FAIL
- Important, src/recovery.js:41, progress reporting missing

[Resume implementer with finding]
Implementer: DONE; 10/10 passing; fix report appended
[Generate a fresh working-tree review package]
[Dispatch scoped re-review]
Re-reviewer: PASS
[Ledger: fix round and Task 2 complete]

[After all tasks, dispatch mandatory final whole-branch reviewer, explicitly
including Task 1's low-risk completion]
Final reviewer: PASS
[Delete only this plan's workspace]
[Use finishing-a-development-branch]
[Leave all changes uncommitted on the current branch]
```

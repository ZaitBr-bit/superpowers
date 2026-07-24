# Task Review Risk Classification

Classify every task before dispatch and reassess it from the actual diff and
implementer report before completion. Medium is the default whenever the
evidence does not clearly satisfy every low-risk condition.

## Low risk

A task is low risk only when all of these are true:

- The change is localized to one or two files and has a small, mechanical diff.
- Requirements and expected behavior are complete and unambiguous.
- It does not change a public API or CLI contract, persisted data, schemas,
  dependencies, build/release/deployment behavior, security, authentication,
  permissions, secrets, cryptography, concurrency, shared mutable state, or
  cross-platform behavior.
- Focused automated validation exists, covers the change, passes with clean
  output, and is recorded in the implementer report.
- The implementer reports no unresolved assumption, concern, or scope change.

Low-risk tasks use implementer self-review plus focused validation evidence.
They do not dispatch an independent task reviewer, but remain in scope for the
mandatory final whole-branch review.

## Medium risk

Use medium risk for anything that is neither clearly low nor high, including
multi-file coordination, internal interface changes, non-trivial debugging,
configuration behavior, and ordinary integrations. Dispatch an independent
task reviewer on the standard model tier.

## High risk

A task is high risk if any part affects:

- authentication, authorization, permissions, secrets, or cryptography;
- migrations, persisted formats, destructive operations, or data-loss risk;
- concurrency, distributed behavior, or shared mutable state;
- public API or CLI compatibility;
- build, release, deployment, rollback, or production configuration;
- cross-cutting architecture or a large, difficult-to-reverse diff.

Also classify a task as high when failure has broad or irreversible impact.
Dispatch an independent task reviewer on the most capable available tier and
name the triggering risk as the reviewer's attention lens.

## Mandatory promotion

Promote a low-risk task to at least medium and dispatch a reviewer when the
actual work exceeds the planned file or behavior scope, focused validation is
missing or not clean, the report is `DONE_WITH_CONCERNS`, an assumption remains
unresolved, or any excluded low-risk area appears in the diff. Never downgrade
solely to avoid a review.

Record both decisions in the ledger:

- `Task <N>: risk <low|medium|high> - <observable reason>`
- `Task <N>: risk promoted <old> -> <new> - <observable reason>`

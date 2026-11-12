# Final Review and Finish

Part of superpowers:subagent-driven-development. Every task in the plan is
complete.

The final whole-branch review gets a package too: run
`bash scripts/review-package PLAN_FILE`
by its absolute path, from the working tree you're executing in, and include the printed path in the
final review dispatch, so the final reviewer reads the complete uncommitted
working tree in one file instead of re-deriving it with git commands. This
review is mandatory, including when every task passed the low-risk gate. Dispatch
on the most capable available model (see SKILL.md's Model Selection), using
superpowers:requesting-code-review's
[code-reviewer.md](../../requesting-code-review/code-reviewer.md). Point it at
the ledger's low-risk completions, deferred-minor, and parked lines so it
explicitly scrutinizes work that did not receive an independent task review
and triages what must be fixed before merge.

If the final whole-branch review returns findings, dispatch ONE fix subagent
with the complete findings list — not one fixer per finding.
Per-finding fixers each rebuild context and re-run suites; a real
session's final-review fix wave cost more than all its tasks combined.
Then generate a fresh working-tree package (`bash scripts/review-package PLAN_FILE`, by its absolute path)
and run exactly one scoped re-review of the fix wave with
[re-review-prompt.md](../re-review-prompt.md).
Adjudicate any residual findings as in the fix loop's breaker
(references/fix-loop.md): park with rulings, or rule on the load-bearing
ones and ledger what you decided. Only the four things that stop a running
plan (top of SKILL.md) stop you here. There is no second fix wave —
residual load-bearing findings surface to your human partner when
finishing-a-development-branch presents the options.

### Finish

Before you delete anything, collect every ledger line containing `Ruling:` —
preflight rulings, parked findings, breaker adjudications, all of them — into
your final message under "Rulings I made", in the order you made them, each
with what it costs if wrong. The list is exhaustive: if the ledger holds a
ruling, the list holds it. That list is the only place the decisions you
took on your human partner's behalf reach them — they read it and rework
whatever you got wrong. A ruling that dies with the workspace was a decision
made in secret.

When the final whole-branch review is clean and its fixes are applied,
delete this plan's workspace (`rm -rf <workspace>`) — the ledger and
the reports already delivered are the record now. Sibling directories belong to other plans; leave them
alone.

Use superpowers:finishing-a-development-branch.

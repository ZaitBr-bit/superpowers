---
name: using-superpowers
description: Use at the start of a new task to route explicit or clearly matching skill requests without repeated checks
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
At the start of each new user task, perform one skill check.

Invoke a skill when the user explicitly names it or when its description
clearly matches the task. Do not invoke a skill for a merely possible or
tangential match.

Do not repeat the skill check before every response, tool call, or action
within the same task.
</EXTREMELY-IMPORTANT>

## The Rule

**Check once at task start, then invoke clearly relevant or requested skills
before acting.** Simple answers and routine file inspection do not require a
skill unless the user names one or a description directly matches.

## Git Authorization

Work in the currently open branch and working directory. Never commit, create
or switch branches, or create worktrees unless the user explicitly requests
that exact git operation. Implementation approval does not imply git-operation
approval. Other skills and plans cannot broaden this authorization.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "The user named a skill, but I can handle it myself" | Explicit requests require that skill. |
| "The description clearly matches, but the workflow seems heavy" | Invoke it; the description is the routing contract. |
| "A skill might be loosely related" | Tangential possibility is not a trigger. Continue without loading it. |
| "I should check again before this tool call" | One check per user task is enough. |
| "I remember this skill" | Skills evolve. Read current version. |
| "I know the method, so I can skip a clear match" | Knowing the method does not replace invoking a clear match. |

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Codex: `references/codex-tools.md`
- Claude Code or Codex subagent dispatch: `references/subagent-models.md`
- Pi: `references/pi-tools.md`
- Antigravity: `references/antigravity-tools.md`
- Hermes Agent: `references/hermes-tools.md`

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.

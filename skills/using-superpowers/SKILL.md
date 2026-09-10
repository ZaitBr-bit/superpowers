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

## Jira Context

When a task supplies a Jira issue key (e.g. `CISS-183012`) as a parameter, or the user
asks for a ticket's information, fetch it before proceeding — don't ask the user to
paste the description and don't guess from memory. This applies to any skill, not only
`requesting-code-review`, which already has this wired for review context.

**Prefer the Atlassian MCP tools** (tool names starting with
`mcp__claude_ai_Atlassian_Rovo__`):

1. Call `getAccessibleAtlassianResources` once per session and keep the `cloudId` for
   the Jira site that owns the issue (match by hostname when a link names one; when
   only one resource comes back, use it).
2. Call `getJiraIssue` with that `cloudId`, `issueIdOrKey` set to the key (e.g.
   `CISS-183012`), and `fields: ["summary", "description", "issuetype", "status",
   "priority", "assignee", "reporter", "fixVersions", "labels", "resolution",
   "subtasks"]` — the tool's default field set omits `fixVersions` and `subtasks`,
   both required below.
3. For child issues (subtasks or Epic children), call `searchJiraIssuesUsingJql` with
   the same `cloudId` and `jql: 'parent = "CISS-183012" ORDER BY key ASC'`.

**If the MCP tools are not available in this session, or any call above fails**
(resource not found, 401/403/404, tool errors out): STOP. Do not silently fall back
and do not fabricate ticket content. Tell the user exactly what failed — tool
unavailable, or which call errored and how — and ask whether to use the script
fallback below or handle it another way (e.g. they paste the description). Only run
the fallback after the user says to.

**Fallback (only after the user chooses it):**

    node <path-to>/skills/requesting-code-review/scripts/jira-context.mjs CISS-XXXXXX

Script: [jira-context.mjs](../requesting-code-review/scripts/jira-context.mjs). It reads
credentials from `skills/requesting-code-review/.env` and prints the absolute path to a
generated markdown file with the issue and its children. If it fails (missing `.env`,
401/403/404), report the exact error to the user — never fabricate ticket content or
silently skip the fetch.

## GitLab Context

When a task supplies a GitLab merge request or issue reference (a URL, or a
`<project>!<iid>` / `<project>#<iid>` shorthand), fetch it before proceeding — don't
ask the user to paste the description and don't guess from memory.

**Prefer the GitLab MCP tools** (tool names starting with `mcp__gitlab__`):

- Merge request: call `get_merge_request` with `id` (the project path, e.g.
  `group/project`) and `merge_request_iid`. For the code changes, call
  `get_merge_request_diffs` with the same `id`/`merge_request_iid`. This MCP
  server has no tool to read a merge request's discussion notes/comments — if
  those are needed, ask the user to paste them or check the GitLab UI.
- Issue: call `get_issue` with `id` and `issue_iid`. For discussion/comments on
  an issue, call `get_workitem_notes` with `project_id` (or `group_id`) and
  `work_item_iid` set to the issue's IID — `get_workitem_notes` and
  `create_workitem_note` operate on GitLab work items (issues, tasks, epics),
  not merge requests.

**If the MCP tools are not available in this session, or any call above fails**
(project not found, insufficient scope, tool errors out): STOP. Do not fabricate
content. Tell the user exactly what failed and ask them how to proceed — there is no
script fallback for GitLab in this repo, so the choice is to authorize/fix the MCP or
paste the merge request/issue description themselves.

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

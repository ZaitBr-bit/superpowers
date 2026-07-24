# Claude Code and Codex Subagent Models

Use the least expensive model that can reliably complete the task. Never omit
the model merely to inherit the parent session's model.

Always use medium reasoning effort:

- Claude Code dispatch: `model: haiku|sonnet|opus` and `effort: medium`
- Codex dispatch: `model: gpt-5.6-terra|gpt-5.6-sol` and
  `reasoning_effort: medium`

For Claude Code, also cap agent turns:

- lookup or scoped re-review: `maxTurns: 4`
- ordinary review: `maxTurns: 6`
- implementation: `maxTurns: 12`

Codex dispatch does not currently expose an equivalent per-agent turn cap.
Use a narrow completion contract and stop or close the agent after it returns.

## Routing

| Workload | Claude Code | Codex |
|---|---|---|
| Simple lookup, file discovery, complete-code transcription, or tiny isolated fix | `haiku` | `gpt-5.6-luna` if the runtime explicitly exposes it; otherwise `gpt-5.6-terra` |
| Multi-file implementation, debugging, ordinary review, or prose requirements | `sonnet` | `gpt-5.6-terra` |
| Architecture, ambiguous high-risk changes, security-sensitive judgment, or final whole-branch review | `opus` | `gpt-5.6-sol` |

Prefer these capability ladders when escalating:

- Claude Code: Haiku -> Sonnet -> Opus
- Codex: GPT-5.6 Luna -> GPT-5.6 Terra -> GPT-5.6 Sol

`gpt-5.6-luna` is the official model name; there is no `gpt-5.6-lua`.
Only select Luna when the current Codex runtime advertises it as a valid
subagent override. Current Codex runtimes may expose only Sol and Terra.

Use `gpt-5.5` only as a compatibility fallback when the GPT-5.6 family is not
available. It is a previous-generation model, not the next cheaper tier after
Luna.

Do not use the cheapest tier for a task whose ambiguity will create repeated
tool loops. Start reviewers and implementers working from prose at the
Sonnet/Terra tier. Small, scoped re-reviews may use Haiku/Luna.

## Stable prompt prefix

Put the reusable role, rules, rubric, and output contract first. Put task names,
paths, SHAs, findings, and other changing values at the end. Keep the static
prefix byte-for-byte stable across dispatches when possible so provider prompt
caching can reuse it. Caching lowers cost; short output contracts and turn caps
reduce actual generated tokens.

Official references:

- [Claude Code subagent model and effort fields](https://code.claude.com/docs/en/subagents)
- [Claude Code effort levels](https://code.claude.com/docs/en/model-config)
- [OpenAI GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

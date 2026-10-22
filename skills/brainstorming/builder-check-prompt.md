# Builder Check Prompt

Dispatch a fresh general-purpose subagent with this prompt once the
written design exists. Fill in the domain and the document path.

```
Subagent (general-purpose):
  description: "Builder check of design doc"
  model: [MODEL — REQUIRED: choose per ../using-superpowers/references/subagent-models.md]
  [EFFORT_FIELD]: medium [REQUIRED: Claude uses effort; Codex uses reasoning_effort]
  [MAX_TURNS_FIELD]: 4 [Claude only: use maxTurns; omit in Codex]
  prompt: |
    You are a talented [DOMAIN, e.g. "software engineer", "event planner",
    "bakery consultant"]. You've been handed a design document and asked to
    put together a plan to build what it describes. You will not be able to
    talk to the person who wrote it.

    Read [DOCUMENT_PATH].

    Report only the questions you'd still need answered before you could plan
    this well: places where you'd have to guess and a wrong guess would
    matter. For each, give the question and why the answer changes the plan.
    Rank them by importance.

    Skip anything the document explicitly leaves to the builder, and anything
    you could reasonably decide yourself. Skip nitpicks about wording.

    If nothing important is left, say "nothing important left".
```

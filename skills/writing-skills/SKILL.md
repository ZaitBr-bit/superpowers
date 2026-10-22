---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

**Writing skills is evidence-driven development applied to process documentation.**

**Personal skills live in your runtime's skills directory** (`~/.claude/skills/` on Claude Code) — see [codex-tools.md](../using-superpowers/references/codex-tools.md) or [gemini-tools.md](../using-superpowers/references/gemini-tools.md) for the path on those runtimes. Codex, Copilot CLI, and Gemini CLI all also recognize `~/.agents/skills/` as a cross-runtime alias.

You run pressure scenarios (with subagents) to establish baseline behavior, write the skill (documentation), validate improved compliance, and refine to close loopholes.

**Core principle:** If you didn't validate baseline behavior without the skill, you don't know if the skill teaches the right thing.

**REQUIRED BACKGROUND:** You MUST understand superpowers:test-driven-development before using this skill. That skill defines lightweight validation and iterative refinement. This skill adapts those principles to documentation.

**Official guidance:** For Anthropic's official skill authoring best practices, see references/anthropic-best-practices.md. This document provides additional patterns and guidelines that complement the evidence-focused approach in this skill.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future agents find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides

**Skills are NOT:** Narratives about how you solved a problem once

## Validation Mapping for Skills

| Validation Concept | Skill Creation |
|-------------|----------------|
| **Validation scenario** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Baseline reveals gap** | Agent violates rule without skill |
| **Validation improves outcome** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
| **Validate baseline first** | Run baseline scenario BEFORE writing skill |
| **Capture evidence** | Document exact rationalizations agent uses |
| **Minimal change** | Write skill addressing those specific violations |
| **Re-validate** | Verify agent now complies |
| **Refactor cycle** | Find new rationalizations → plug → re-verify |

The entire skill creation process follows baseline → implementation → refinement.

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious to you
- You'd reference this again across projects
- Pattern applies broadly (not project-specific)
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions (put in your instructions file)
- Mechanical constraints (if it's enforceable with regex/validation, automate it—save documentation for judgment calls)

## Skill Types

### Technique
Concrete method with steps to follow (condition-based-waiting, root-cause-tracing)

### Pattern
Way of thinking about problems (flatten-with-flags, test-invariants)

### Reference
API docs, syntax guides, tool documentation (office docs)

## Directory Structure


```
skills/
  skill-name/
    SKILL.md              # Main reference (required)
    supporting-file.*     # Only if needed
```

**Flat namespace** - all skills in one searchable namespace

**Separate files for:**
1. **Heavy reference** (100+ lines) - API docs, comprehensive syntax
2. **Reusable tools** - Scripts, utilities, templates

**Keep inline:**
- Principles and concepts
- Code patterns (< 50 lines)
- Everything else

## Writing SKILL.md

A skill's `description` says only when to use it: triggering conditions and
symptoms, starting with "Use when...". It never summarizes the skill's
workflow, because an agent that reads a workflow summary follows it instead
of reading the skill.

When you write or change a skill's frontmatter, name or description, or
need to cut its size, read [references/discovery.md](references/discovery.md):
the SKILL.md template, description and keyword guidance, naming, token
budgets, and cross-referencing other skills.

## Flowcharts

When you add or change a flowchart in a skill, read
[references/flowcharts.md](references/flowcharts.md) first: when a flowchart
earns its place, the graphviz conventions, and how to render one.

## Code Examples

**One excellent example beats many mediocre ones**

Choose most relevant language:
- Testing techniques → TypeScript/JavaScript
- System debugging → Shell/Python
- Data processing → Python

**Good example:**
- Complete and runnable
- Well-commented explaining WHY
- From real scenario
- Shows pattern clearly
- Ready to adapt (not generic template)

**Don't:**
- Implement in 5+ languages
- Create fill-in-the-blank templates
- Write contrived examples

You're good at porting - one great example is enough.

## File Organization

### Self-Contained Skill
```
defense-in-depth/
  SKILL.md    # Everything inline
```
When: All content fits, no heavy reference needed

### Skill with Reusable Tool
```
condition-based-waiting/
  SKILL.md    # Overview + patterns
  example.ts  # Working helpers to adapt
```
When: Tool is reusable code, not just narrative

### Skill with Heavy Reference
```
pptx/
  SKILL.md       # Overview + workflows
  pptxgenjs.md   # 600 lines API reference
  ooxml.md       # 500 lines XML structure
  scripts/       # Executable tools
```
When: Reference material too large for inline

Invoke bundled scripts through their interpreter in the prose (`bash scripts/tool.sh`, `node scripts/tool.js`), never by bare path: some harness plugin packagers strip executable bits, and a bare `scripts/tool.sh` fails there with `Permission denied`.

## Validation and Behavior Shaping

For new skills, behavior-changing edits, pressure tests, wording micro-tests,
and rationalization hardening, read
[validation-workflow.md](validation-workflow.md). Pure file moves or factual
reference corrections do not require loading that guide.

## Anti-Patterns

### ❌ Narrative Example
"In session 2025-10-03, we found empty projectDir caused..."
**Why bad:** Too specific, not reusable

### ❌ Multi-Language Dilution
example-js.js, example-py.py, example-go.go
**Why bad:** Mediocre quality, maintenance burden

### ❌ Code in Flowcharts
```dot
step1 [label="import fs"];
step2 [label="read file"];
```
**Why bad:** Can't copy-paste, hard to read

### ❌ Generic Labels
helper1, helper2, step3, pattern4
**Why bad:** Labels should have semantic meaning

## STOP: Before Moving to Next Skill

**After writing ANY skill, you MUST STOP and complete the deployment process.**

**Do NOT:**
- Create multiple skills in batch without testing each
- Move to next skill before current one is verified
- Skip testing because "batching is more efficient"

**The deployment checklist below is MANDATORY for EACH skill.**

Deploying unvalidated skills = deploying unclear guidance. It's a violation of quality standards.

## Deployment Checklist

Before declaring a skill ready, read and complete
[deployment-checklist.md](deployment-checklist.md). Do not load it during
early exploration or drafting.

## Discovery Workflow

How future agents find your skill:

1. **Encounters problem** ("tests are flaky")
2. **Searches skills** (greps descriptions, browses categories)
3. **Finds SKILL** (description matches)
4. **Scans overview** (is this relevant?)
5. **Reads patterns** (quick reference table)
6. **Loads example** (only when implementing)

**Optimize for this flow** - put searchable terms early and often.

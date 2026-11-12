# Bulletproofing Skills Against Rationalization

Part of superpowers:writing-skills. Use it when the baseline failure is a
discipline failure: the agent knows the rule and skips it under pressure.

## Bulletproofing Skills Against Rationalization

Skills that enforce discipline (like validating before claiming done) need to resist rationalization. Agents are smart and will find loopholes when under pressure.

**Scope:** this toolkit is for discipline failures — an agent that knows the rule and skips it under pressure. For wrong-shaped output or omitted elements, prohibition-based bulletproofing backfires; use the forms in "Choose the Right Guidance Form" in [../validation-workflow.md](../validation-workflow.md) instead.

**Psychology note:** Understanding WHY persuasion techniques work helps you apply them systematically. See persuasion-principles.md in this directory for research foundation (Cialdini, 2021; Meincke et al., 2025) on authority, commitment, scarcity, social proof, and unity principles.

### Close Every Loophole Explicitly

Don't just state the rule - forbid specific workarounds:

<Bad>
```markdown
Claim done before validating? Run the validation first.
```
</Bad>

<Good>
```markdown
Claim done before validating? Run the validation first. Start over the claim.

**No exceptions:**
- Don't reuse an earlier run as the result
- Don't validate a different command than the one the task names
- Don't skim the output
- Run means run, then read
```
</Good>

### Address "Spirit vs Letter" Arguments

Add foundational principle early:

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

This cuts off entire class of "I'm following the spirit" rationalizations.

### Build Rationalization Table

Capture rationalizations from baseline testing (see Testing section below). Every excuse agents make goes in the table:

```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to validate" | Simple code breaks. The validation takes 30 seconds. |
| "I'll validate at the end" | Late failures cost a whole task of rework. |
| "It compiled, so it works" | Compiling proves syntax, not behavior. |
```

### Create Red Flags List

Make it easy for agents to self-check when rationalizing:

```markdown
## Red Flags - STOP and Start Over

- Done claimed before the validation ran
- "I already checked it manually"
- "An earlier run counts"
- "It's about spirit not ritual"
- "This is different because..."

**All of these mean: Run the validation and read the output before claiming done.**
```

### Update SDO for Violation Symptoms

Add to description: symptoms of when you're ABOUT to violate the rule:

```yaml
description: use when about to claim a task is complete, before reporting it
```

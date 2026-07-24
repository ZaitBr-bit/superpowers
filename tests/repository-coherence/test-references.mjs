import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, "../..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const textExtensions = new Set([
  "",
  ".cmd",
  ".dot",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".toml",
  ".ts",
  ".yaml",
  ".yml",
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function fail(message) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exitCode = 1;
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const textByFile = new Map(
  textFiles.map((file) => [file, fs.readFileSync(file, "utf8")]),
);

const removedFeatureName = "cave" + "man";
for (const [file, text] of textByFile) {
  if (text.toLowerCase().includes(removedFeatureName)) {
    fail(`removed feature reference remains in ${path.relative(root, file)}`);
  }
}

const markdownLinkPattern = /(?<!!)\[[^\]]*]\(([^)]+)\)/g;
for (const [file, text] of textByFile) {
  if (path.extname(file) !== ".md" || !file.startsWith(path.join(root, "skills"))) {
    continue;
  }
  if (path.basename(file) === "anthropic-best-practices.md") continue;

  for (const match of text.matchAll(markdownLinkPattern)) {
    let target = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (
      !target ||
      /^(?:https?:\/\/|mailto:|#|\/|~|\$)/.test(target) ||
      /[<>{}[\]*]/.test(target)
    ) {
      continue;
    }
    target = decodeURIComponent(target);
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      fail(
        `broken skill link: ${path.relative(root, file)} -> ${match[1]}`,
      );
    }
  }
}

const requiredPaths = [
  [".cursor-plugin/plugin.json", "hooks"],
  [".codex-plugin/plugin.json", "interface.composerIcon"],
  [".codex-plugin/plugin.json", "interface.logo"],
];

for (const [manifestPath, propertyPath] of requiredPaths) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, manifestPath), "utf8"),
  );
  const value = propertyPath
    .split(".")
    .reduce((current, key) => current?.[key], manifest);
  if (typeof value !== "string") {
    fail(`${manifestPath} is missing ${propertyPath}`);
    continue;
  }
  if (!fs.existsSync(path.resolve(root, value))) {
    fail(`${manifestPath} points ${propertyPath} to missing path ${value}`);
  }
}

const hooksManifest = fs.readFileSync(path.join(root, "hooks/hooks.json"), "utf8");
for (const match of hooksManifest.matchAll(/hooks[\\/][A-Za-z0-9_.-]+/g)) {
  const referencedPath = match[0].replaceAll("\\", "/");
  if (!fs.existsSync(path.join(root, referencedPath))) {
    fail(`hooks/hooks.json points to missing path ${referencedPath}`);
  }
}

const geminiInstructions = fs.readFileSync(path.join(root, "GEMINI.md"), "utf8");
for (const line of geminiInstructions.split(/\r?\n/)) {
  if (!line.startsWith("@./")) continue;
  const referencedPath = line.slice(1);
  if (!fs.existsSync(path.resolve(root, referencedPath))) {
    fail(`GEMINI.md points to missing path ${referencedPath}`);
  }
}

const dispatchTemplates = new Map([
  ["skills/brainstorming/spec-document-reviewer-prompt.md", 4],
  ["skills/requesting-code-review/code-reviewer.md", 6],
  ["skills/subagent-driven-development/implementer-prompt.md", 12],
  ["skills/subagent-driven-development/re-review-prompt.md", 4],
  ["skills/subagent-driven-development/task-reviewer-prompt.md", 6],
  ["skills/writing-plans/plan-document-reviewer-prompt.md", 4],
]);
for (const [relative, maxTurns] of dispatchTemplates) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  if (!text.includes("model: [MODEL")) {
    fail(`${relative} does not require an explicit subagent model`);
  }
  if (!text.includes("[EFFORT_FIELD]: medium")) {
    fail(`${relative} does not require medium subagent effort`);
  }
  if (!text.includes(`[MAX_TURNS_FIELD]: ${maxTurns}`)) {
    fail(`${relative} does not set the expected Claude maxTurns cap`);
  }
  if (!text.includes("## Inputs") || text.indexOf("## Inputs") < text.indexOf("## Output Format")) {
    fail(`${relative} does not keep dynamic inputs after its stable output contract`);
  }
}

for (const relative of [
  "skills/brainstorming/spec-document-reviewer-prompt.md",
  "skills/requesting-code-review/code-reviewer.md",
  "skills/subagent-driven-development/re-review-prompt.md",
  "skills/subagent-driven-development/task-reviewer-prompt.md",
  "skills/writing-plans/plan-document-reviewer-prompt.md",
]) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  if (!text.includes("`PASS`")) {
    fail(`${relative} does not use the compact PASS contract`);
  }
  for (const verboseSection of ["### Strengths", "### Recommendations"]) {
    if (text.includes(verboseSection)) {
      fail(`${relative} retains verbose reviewer output: ${verboseSection}`);
    }
  }
}

const codeReviewer = fs.readFileSync(
  path.join(root, "skills/requesting-code-review/code-reviewer.md"),
  "utf8",
);
if (!codeReviewer.includes("[DIFF_FILE]") || codeReviewer.includes("[DIFF]")) {
  fail("code reviewer must consume a diff artifact path, not inline diff text");
}

const usingSuperpowers = fs.readFileSync(
  path.join(root, "skills/using-superpowers/SKILL.md"),
  "utf8",
);
for (const expensiveTrigger of ["1% chance", "BEFORE any response or action"]) {
  if (usingSuperpowers.includes(expensiveTrigger)) {
    fail(`using-superpowers retains repeated trigger language: ${expensiveTrigger}`);
  }
}
for (const requiredPolicy of [
  "currently open branch and working directory",
  "Never commit, create",
  "unless the user explicitly requests",
  "Other skills and plans cannot broaden this authorization",
]) {
  if (!usingSuperpowers.includes(requiredPolicy)) {
    fail(`using-superpowers is missing git authorization policy: ${requiredPolicy}`);
  }
}

const sddSkill = fs.readFileSync(
  path.join(root, "skills/subagent-driven-development/SKILL.md"),
  "utf8",
);
if (!sddSkill.includes("1-2 mechanical")) {
  fail("SDD does not route tiny plans to inline execution");
}
if (!sddSkill.includes("risk-classification.md")) {
  fail("SDD does not reference the shared risk classification");
}
if (sddSkill.includes("Never skip the task review")) {
  fail("SDD still requires an independent review for every task");
}
const normalizedSddSkill = sddSkill.toLowerCase().replace(/\s+/g, " ");
for (const requiredPolicy of [
  "low-risk tasks do not dispatch a task reviewer",
  "medium-risk task reviews start at the standard tier",
  "high-risk task reviews use the most capable tier",
  "final whole-branch review is mandatory",
]) {
  if (!normalizedSddSkill.includes(requiredPolicy)) {
    fail(`SDD is missing risk-review policy: ${requiredPolicy}`);
  }
}
for (const requiredPolicy of [
  "currently open branch is the development branch",
  "Do not stage or commit task changes",
  "scripts/review-package PLAN_FILE",
  "tracked and untracked changes",
]) {
  if (!normalizedSddSkill.includes(requiredPolicy.toLowerCase())) {
    fail(`SDD is missing current-branch policy: ${requiredPolicy}`);
  }
}
for (const stalePolicy of [
  "using-git-worktrees to create one",
  "never start implementation on a main/master branch",
  "scripts/review-package plan_file base head",
]) {
  if (normalizedSddSkill.includes(stalePolicy)) {
    fail(`SDD retains obsolete git workflow: ${stalePolicy}`);
  }
}

const worktreeSkill = fs.readFileSync(
  path.join(root, "skills/using-git-worktrees/SKILL.md"),
  "utf8",
);
for (const requiredPolicy of [
  "Use only when the user explicitly requests",
  "Never create or switch branches",
  "automatic setup step",
]) {
  if (!worktreeSkill.includes(requiredPolicy)) {
    fail(`using-git-worktrees is missing authorization rule: ${requiredPolicy}`);
  }
}

const finishingSkill = fs.readFileSync(
  path.join(root, "skills/finishing-a-development-branch/SKILL.md"),
  "utf8",
);
for (const requiredPolicy of [
  "leave it uncommitted in the currently open branch",
  "unless the user explicitly requests that",
  "Default outcome: keep every change as-is",
]) {
  if (!finishingSkill.includes(requiredPolicy)) {
    fail(`finishing skill is missing non-mutating handoff rule: ${requiredPolicy}`);
  }
}

const implementerPrompt = fs.readFileSync(
  path.join(root, "skills/subagent-driven-development/implementer-prompt.md"),
  "utf8",
);
if (
  !implementerPrompt.includes("Do not stage or commit changes") ||
  implementerPrompt.includes("Commits created")
) {
  fail("SDD implementer prompt does not prohibit automatic commits");
}

const reviewPackage = fs.readFileSync(
  path.join(root, "skills/subagent-driven-development/scripts/review-package"),
  "utf8",
);
for (const requiredBehavior of [
  "git diff -U10 HEAD",
  "git ls-files --others --exclude-standard -z",
  "git diff --no-index",
]) {
  if (!reviewPackage.includes(requiredBehavior)) {
    fail(`review-package misses uncommitted diff behavior: ${requiredBehavior}`);
  }
}

for (const relative of ["AGENTS.md", "CLAUDE.md"]) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  for (const requiredPolicy of [
    "currently open branch and working directory",
    "Never commit or",
    "unless the user explicitly requests that",
    "does not authorize any git mutation",
  ]) {
    if (!text.includes(requiredPolicy)) {
      fail(`${relative} is missing git authorization policy: ${requiredPolicy}`);
    }
  }
}
for (const staleBehavior of ["git log --oneline", "git rev-list --count"]) {
  if (reviewPackage.includes(staleBehavior)) {
    fail(`review-package still depends on task commits: ${staleBehavior}`);
  }
}

const riskClassification = fs.readFileSync(
  path.join(
    root,
    "skills/subagent-driven-development/references/risk-classification.md",
  ),
  "utf8",
);
for (const requiredPolicy of [
  "Medium is the default",
  "Low risk",
  "Medium risk",
  "High risk",
  "Mandatory promotion",
  "final whole-branch review",
]) {
  if (!riskClassification.includes(requiredPolicy)) {
    fail(`risk classification is missing policy: ${requiredPolicy}`);
  }
}

const writingPlans = fs.readFileSync(
  path.join(root, "skills/writing-plans/SKILL.md"),
  "utf8",
);
if (!writingPlans.includes("**Risk:** low | medium | high")) {
  fail("writing-plans task template does not require risk classification");
}

const requestingReview = fs.readFileSync(
  path.join(root, "skills/requesting-code-review/SKILL.md"),
  "utf8",
);
if (!requestingReview.includes("medium- or high-risk task")) {
  fail("requesting-code-review does not apply the risk-based task gate");
}

for (const relative of ["README.md", "skills/writing-plans/SKILL.md"]) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  if (text.includes("two-stage review")) {
    fail(`${relative} still documents unconditional two-stage review`);
  }
}

for (const [relative, maxBytes] of [
  ["skills/subagent-driven-development/SKILL.md", 21000],
  ["skills/writing-skills/SKILL.md", 16000],
]) {
  const skillText = fs.readFileSync(path.join(root, relative), "utf8");
  const lines = skillText.split(/\r?\n/).length;
  if (lines > 500) {
    fail(`${relative} exceeds the 500-line progressive-disclosure limit`);
  }
  if (Buffer.byteLength(skillText, "utf8") > maxBytes) {
    fail(`${relative} exceeds its progressive-disclosure byte budget`);
  }
}

const corpus = [...textByFile.values()].join("\n");
for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (
    !relative.startsWith("skills/") ||
    path.basename(file) === "SKILL.md" ||
    relative.includes("/examples/")
  ) {
    continue;
  }
  const name = path.basename(file);
  const ownText = textByFile.get(file) ?? "";
  const externalCorpus = corpus.replace(ownText, "");
  if (!externalCorpus.includes(name)) {
    fail(`unreferenced supplemental skill file: ${relative}`);
  }
}

if (!process.exitCode) {
  process.stdout.write("Repository reference coherence checks passed\n");
}

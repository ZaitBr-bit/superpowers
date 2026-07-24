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

const dispatchTemplates = [
  "skills/brainstorming/spec-document-reviewer-prompt.md",
  "skills/requesting-code-review/code-reviewer.md",
  "skills/subagent-driven-development/implementer-prompt.md",
  "skills/subagent-driven-development/re-review-prompt.md",
  "skills/subagent-driven-development/task-reviewer-prompt.md",
  "skills/writing-plans/plan-document-reviewer-prompt.md",
];
for (const relative of dispatchTemplates) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  if (!text.includes("model: [MODEL")) {
    fail(`${relative} does not require an explicit subagent model`);
  }
  if (!text.includes("[EFFORT_FIELD]: medium")) {
    fail(`${relative} does not require medium subagent effort`);
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

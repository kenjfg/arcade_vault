// PostToolUse hook: formats React/Markdown files with Prettier and lints React files with ESLint.
// Exit 2 sends stderr back to Claude so it can fix remaining issues.
import { spawnSync } from "node:child_process";
import path from "node:path";

const FORMAT_EXTS = new Set([".tsx", ".jsx", ".md", ".mdx"]);
const LINT_EXTS = new Set([".tsx", ".jsx"]);

let input = "";
for await (const chunk of process.stdin) input += chunk;

const filePath = JSON.parse(input || "{}").tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const file = path.resolve(filePath);
const ext = path.extname(file).toLowerCase();
const relative = path.relative(projectDir, file);

if (!FORMAT_EXTS.has(ext) || relative.startsWith("..") || path.isAbsolute(relative)) {
  process.exit(0);
}

const run = (bin, args) =>
  spawnSync(process.execPath, [path.join(projectDir, "node_modules", bin), ...args, file], {
    cwd: projectDir,
    encoding: "utf8",
  });

const prettier = run("prettier/bin/prettier.cjs", ["--write", "--log-level", "warn"]);
if (prettier.status !== 0) {
  console.error(`Prettier failed on ${relative}:\n${prettier.stderr || prettier.stdout}`);
  process.exit(2);
}

if (LINT_EXTS.has(ext)) {
  const eslint = run("eslint/bin/eslint.js", ["--fix"]);
  if (eslint.status !== 0) {
    console.error(`ESLint found issues in ${relative}:\n${eslint.stdout}${eslint.stderr}`);
    process.exit(2);
  }
}

// @ts-check
/**
 * Repo digest for Survey — the drift check that compares a sealed blueprint
 * (Pass 4) against the code that was actually built.
 *
 * The model never reads the repo. This script does, and hands the model a
 * small, capped summary: commit, file list, dependencies, schema, and exported
 * names. The file list is also what the evidence guard checks against, so a
 * path the model cites that isn't listed here does not count as evidence.
 *
 *   node scripts/digest.mjs <repoPath> [--max 12000] > digest.md
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_MAX_CHARS = 12_000;

/** Directories that are never source. */
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".output",
  ".nitro",
  ".tanstack",
  ".vercel",
  ".next",
  "dist",
  "build",
  "coverage",
  ".data",
  "__pycache__",
  ".venv",
  "venv",
  ".mypy_cache",
  ".pytest_cache",
]);

/** Files that add noise, not structure. */
const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "poetry.lock",
  "uv.lock",
  "Cargo.lock",
]);

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".pdf",
  ".zip",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".mp3",
  ".wav",
  ".sqlite",
  ".db",
  ".wasm",
]);

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);

/** Largest file the digest will open for exports or schema. */
const MAX_READ_BYTES = 200_000;

/**
 * True when a repo-relative path belongs in the digest.
 * @param {string} path
 */
export function isListed(path) {
  const parts = path.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  const name = parts[parts.length - 1];
  if (SKIP_FILES.has(name)) return false;
  if (name === ".env" || name.startsWith(".env.")) return false;
  return true;
}

/**
 * Repo-relative POSIX paths. Uses `git ls-files` (tracked + untracked, not
 * ignored) when the folder is a git repo, otherwise walks the tree.
 * @param {string} root
 * @returns {string[]}
 */
export function listFiles(root) {
  let files;
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    files = out.split("\n").filter(Boolean);
  } catch {
    files = walk(root, root);
  }
  return [...new Set(files.map((f) => f.split(sep).join("/")))].filter(isListed).sort();
}

/**
 * @param {string} root
 * @param {string} dir
 * @returns {string[]}
 */
function walk(root, dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(root, full));
    } else if (entry.isFile()) {
      out.push(relative(root, full));
    }
  }
  return out;
}

/**
 * Full commit hash, or "unknown" outside a git repo.
 * @param {string} root
 */
export function commitOf(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Read a small text file, or null if it's missing, huge, or binary.
 * @param {string} root
 * @param {string} path
 */
function readText(root, path) {
  if (BINARY_EXT.has(extname(path).toLowerCase())) return null;
  try {
    const full = join(root, path);
    if (statSync(full).size > MAX_READ_BYTES) return null;
    const text = readFileSync(full, "utf8");
    return text.includes("\u0000") ? null : text;
  } catch {
    return null;
  }
}

/**
 * Exported names from one source file. TS/JS: `export` declarations.
 * Python: top-level `def` and `class`, skipping private names.
 * @param {string} path
 * @param {string} text
 * @returns {string[]}
 */
export function exportsOf(path, text) {
  const ext = extname(path).toLowerCase();
  /** @type {string[]} */
  const names = [];
  if (ext === ".py") {
    for (const m of text.matchAll(/^(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)/gm)) {
      if (!m[1].startsWith("_")) names.push(m[1]);
    }
  } else if (CODE_EXT.has(ext)) {
    const decl =
      /^export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;
    for (const m of text.matchAll(decl)) names.push(m[1]);
    for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(",")) {
        const name = part
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
          .replace(/^type\s+/, "");
        if (name) names.push(name);
      }
    }
    if (/^export\s+default\s+(?!function|class|async)/m.test(text)) names.push("default");
  }
  return [...new Set(names)];
}

/**
 * Dependency names from the manifests that exist.
 * @param {string} root
 * @param {string[]} files
 * @returns {string[]}
 */
export function dependenciesOf(root, files) {
  /** @type {string[]} */
  const lines = [];
  if (files.includes("package.json")) {
    try {
      const pkg = JSON.parse(readText(root, "package.json") ?? "{}");
      const deps = Object.keys(pkg.dependencies ?? {});
      const dev = Object.keys(pkg.devDependencies ?? {});
      if (deps.length) lines.push(`package.json: ${deps.join(", ")}`);
      if (dev.length) lines.push(`package.json (dev): ${dev.join(", ")}`);
    } catch {
      lines.push("package.json: unreadable");
    }
  }
  for (const req of files.filter((f) => /(^|\/)requirements[^/]*\.txt$/.test(f))) {
    const names = (readText(root, req) ?? "")
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim())
      .filter((l) => l && !l.startsWith("-"))
      .map((l) => l.split(/[<>=!~;[ ]/)[0]);
    if (names.length) lines.push(`${req}: ${names.join(", ")}`);
  }
  if (files.includes("pyproject.toml")) {
    const text = readText(root, "pyproject.toml") ?? "";
    const block = text.match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m);
    if (block) {
      const names = [...block[1].matchAll(/["']([A-Za-z0-9_.-]+)/g)].map((m) => m[1]);
      if (names.length) lines.push(`pyproject.toml: ${names.join(", ")}`);
    }
  }
  return lines;
}

/**
 * SQL schema files with comments and blank lines stripped, each capped.
 * @param {string} root
 * @param {string[]} files
 * @returns {string[]}
 */
export function schemaOf(root, files) {
  /** @type {string[]} */
  const blocks = [];
  for (const path of files.filter((f) => f.toLowerCase().endsWith(".sql"))) {
    const text = readText(root, path);
    if (!text) continue;
    const body = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.replace(/--.*$/, "").trimEnd())
      .filter((l) => l.trim())
      .join("\n");
    if (body)
      blocks.push(`-- ${path}\n${body.length > 1500 ? `${body.slice(0, 1500)}\n-- (cut)` : body}`);
  }
  return blocks;
}

/**
 * Cap a list of lines to a character budget, noting how many were left out.
 * @param {string[]} lines
 * @param {number} budget
 * @returns {string[]}
 */
function capLines(lines, budget) {
  /** @type {string[]} */
  const kept = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length + 1 > budget) {
      kept.push(`(+${lines.length - kept.length} more not listed)`);
      break;
    }
    kept.push(line);
    used += line.length + 1;
  }
  return kept;
}

/**
 * Build the digest text. Sections are cut in reverse priority: exports first,
 * then schema, then dependencies. The file list is kept as long as possible
 * because it is the evidence the guard checks against.
 * @param {string} root
 * @param {{ maxChars?: number, now?: Date }} [opts]
 */
export function buildDigest(root, opts = {}) {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const files = listFiles(root);
  const exportLines = files
    .filter((f) => CODE_EXT.has(extname(f).toLowerCase()) && !/\.test\.|\.gen\./.test(f))
    .map((f) => {
      const text = readText(root, f);
      const names = text ? exportsOf(f, text) : [];
      return names.length ? `${f}: ${names.join(", ")}` : "";
    })
    .filter(Boolean);
  const deps = dependenciesOf(root, files);
  const schema = schemaOf(root, files);

  const header = [
    "# Repo digest",
    `commit: ${commitOf(root)}`,
    `generated: ${(opts.now ?? new Date()).toISOString()}`,
    `repo: ${basename(resolve(root))}`,
  ].join("\n");

  // Budget: header, then up to half for files, then deps, schema, exports.
  let left = maxChars - header.length - 64;
  const fileBlock = capLines(files, Math.max(500, Math.floor(left / 2)));
  left -= fileBlock.join("\n").length;
  const depBlock = capLines(deps, Math.max(0, Math.min(left, 1500)));
  left -= depBlock.join("\n").length;
  const schemaBlock = capLines(schema, Math.max(0, Math.min(left, 3000)));
  left -= schemaBlock.join("\n").length;
  const exportBlock = capLines(exportLines, Math.max(0, left - 120));

  return [
    header,
    "",
    `## Files (${files.length})`,
    ...fileBlock,
    "",
    "## Dependencies",
    ...(depBlock.length ? depBlock : ["(none found)"]),
    "",
    "## Schema",
    ...(schemaBlock.length ? schemaBlock : ["(none found)"]),
    "",
    "## Exports",
    ...(exportBlock.length ? exportBlock : ["(none found)"]),
    "",
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const maxAt = args.indexOf("--max");
  const maxChars = maxAt >= 0 ? Number(args[maxAt + 1]) : DEFAULT_MAX_CHARS;
  const root = args.find((a, i) => !a.startsWith("--") && (maxAt < 0 || i !== maxAt + 1));
  if (!root || !Number.isFinite(maxChars) || maxChars < 1000) {
    process.stderr.write("usage: node scripts/digest.mjs <repoPath> [--max 12000]\n");
    process.exit(2);
  }
  try {
    if (!statSync(root).isDirectory()) throw new Error();
  } catch {
    process.stderr.write(`not a folder: ${root}\n`);
    process.exit(2);
  }
  process.stdout.write(buildDigest(root, { maxChars }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

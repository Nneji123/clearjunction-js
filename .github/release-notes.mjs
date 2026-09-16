#!/usr/bin/env node
/**
 * Builds the release version and notes for a production deploy.
 *
 * Deterministic by design: everything comes from git — commit subjects, bodies,
 * PR numbers and added migration files. Nothing is inferred or invented, so a
 * release can always be traced back to the commits it describes.
 *
 * Kept byte-identical across repos so it can later move to one shared workflow;
 * per-repo differences go in the workflow env, not here. Lives at .github/ and
 * not .github/scripts/ because errandigo-backend's .gitignore has an unanchored
 * `scripts/` rule that silently excluded it from the repo.
 *
 * Local dry run (prints, writes nothing):
 *   node .github/release-notes.mjs --dry-run
 *   node .github/release-notes.mjs --dry-run --since v1.2.0
 *
 * In CI it appends `version` / `tag` / `notes_file` to $GITHUB_OUTPUT.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

/** Commits to look back over when no previous tag exists yet. */
const BASELINE_COMMITS = 20;
const UNIT_SEP = "\x1f";
const RECORD_SEP = "\x1e";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }).trim();

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const sinceFlag = argv.indexOf("--since");
const sinceOverride = sinceFlag !== -1 ? argv[sinceFlag + 1] : null;

/** Highest existing v-tag, or null on the very first release. */
function previousTag() {
  if (sinceOverride) return sinceOverride;
  const tags = git("tag", "--list", "v*", "--sort=-v:refname").split("\n").filter(Boolean);
  return tags[0] ?? null;
}

// type → release heading. Anything absent here is deliberately not published:
// chore/test/build/ci/style are noise in a release note, but still counted so
// an "N other commits" line can show nothing was silently dropped.
const SECTIONS = [
  ["feat", "✨ Added"],
  ["fix", "🐛 Fixed"],
  ["perf", "⚡ Performance"],
  ["security", "🔐 Security"],
  ["refactor", "♻️ Changed"],
  ["revert", "⏪ Reverted"],
  ["docs", "📚 Documentation"],
];
const PUBLISHED = new Set(SECTIONS.map(([type]) => type));
const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

function parseCommits(range) {
  const raw = git(
    "log",
    "--no-merges",
    `--pretty=format:%h${UNIT_SEP}%s${UNIT_SEP}%b${RECORD_SEP}`,
    range,
  );
  if (!raw) return [];
  return raw
    .split(RECORD_SEP)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, subject = "", body = ""] = record.split(UNIT_SEP);
      const m = CONVENTIONAL.exec(subject.trim());
      // A squash merge leaves "(#123)" on the subject; a plain merge does not.
      const pr = /\(#(\d+)\)\s*$/.exec(subject)?.[1] ?? null;
      return {
        sha,
        pr,
        type: m?.groups?.type ?? null,
        scope: m?.groups?.scope ?? null,
        subject: (m?.groups?.subject ?? subject).replace(/\s*\(#\d+\)\s*$/, "").trim(),
        breaking: Boolean(m?.groups?.bang) || /^BREAKING CHANGE:/m.test(body),
      };
    });
}

function nextVersion(prev, commits) {
  // A ref that isn't vX.Y.Z (a stray tag, or a --since sha) would otherwise
  // produce "vNaN.undefined.NaN" and publish a nonsense release.
  const parsed = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(prev ?? "");
  if (!parsed) return "1.0.0";
  const [major, minor, patch] = parsed.slice(1).map(Number);
  if (commits.some((c) => c.breaking)) return `${major + 1}.0.0`;
  if (commits.some((c) => c.type === "feat")) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Migrations added in this range. Deploys do NOT run these — they are applied by
 * hand — so the note flags them as outstanding rather than claiming they ran.
 *
 * Driven by MIGRATION_PATH / MIGRATION_CMD so this script stays identical across
 * repos; a repo with no versioned migrations simply leaves them unset.
 */
const MIGRATION_PATH = process.env.MIGRATION_PATH ?? "";
const MIGRATION_CMD = process.env.MIGRATION_CMD ?? "";

function addedMigrations(range) {
  if (!MIGRATION_PATH) return [];
  const out = git("diff", "--name-only", "--diff-filter=A", range, "--", MIGRATION_PATH);
  return out
    ? out
        .split("\n")
        .filter(Boolean)
        .map((f) => f.split("/").pop())
    : [];
}

const prev = previousTag();
const range = prev ? `${prev}..HEAD` : `HEAD~${BASELINE_COMMITS}..HEAD`;
const commits = parseCommits(range);
const version = nextVersion(prev, commits);
const tag = `v${version}`;
const sha = git("rev-parse", "--short", "HEAD");
const repo = process.env.GITHUB_REPOSITORY ?? "";
const prLink = (pr) => (repo ? `[#${pr}](https://github.com/${repo}/pull/${pr})` : `#${pr}`);
// Linked so a line in the changelog goes straight to its diff. Falls back to
// plain code when GITHUB_REPOSITORY is absent, i.e. a local --dry-run.
const shaLink = (s) => (repo ? `[\`${s}\`](https://github.com/${repo}/commit/${s})` : `\`${s}\``);

const lines = [];
lines.push(`Released: ${new Date().toISOString().slice(0, 10)}`, "");

if (!prev) {
  // Report the real count, not BASELINE_COMMITS: HEAD~N walks N *first-parent*
  // steps, so on a branch with merge commits the range holds many more than N.
  lines.push(
    `> First automated release. No previous tag existed, so this covers ${commits.length} commit(s)`,
    `> reachable from \`${range}\`; subsequent releases cover exactly the range since the preceding tag.`,
    "",
  );
}

const breaking = commits.filter((c) => c.breaking);
if (breaking.length > 0) {
  lines.push("## ⚠️ Breaking Changes", "");
  for (const c of breaking) {
    lines.push(`- ${c.scope ? `**${c.scope}**: ` : ""}${c.subject} (${shaLink(c.sha)})`);
  }
  lines.push("");
}

for (const [type, heading] of SECTIONS) {
  const group = commits.filter((c) => c.type === type && !c.breaking);
  if (group.length === 0) continue;
  lines.push(`## ${heading}`, "");
  for (const c of group) {
    const scope = c.scope ? `**${c.scope}**: ` : "";
    const ref = c.pr ? ` (${prLink(c.pr)})` : ` (${shaLink(c.sha)})`;
    lines.push(`- ${scope}${c.subject}${ref}`);
  }
  lines.push("");
}

// Never let a filtered category look like "nothing else happened".
const hidden = commits.filter((c) => !c.type || !PUBLISHED.has(c.type));
if (hidden.length > 0) {
  lines.push(
    `<sub>${hidden.length} additional commit(s) not shown (chore, test, build, ci, style, or non-conventional subjects).</sub>`,
    "",
  );
}

const migrations = addedMigrations(range);
lines.push("## Deployment", "");
lines.push(`- Commit: ${shaLink(sha)}`);
lines.push(
  `- Previous release: ${prev && repo ? `[${prev}](https://github.com/${repo}/releases/tag/${prev})` : (prev ?? "none")}`,
);
if (prev && repo) {
  lines.push(`- Full diff: https://github.com/${repo}/compare/${prev}...${tag}`);
}
lines.push(`- Commits in this release: ${commits.length}`);
if (migrations.length > 0) {
  lines.push(
    `- ⚠️ **${migrations.length} new migration(s) in this release — NOT run by the deploy.**`,
  );
  if (MIGRATION_CMD) {
    lines.push(`  Apply with \`${MIGRATION_CMD}\` from the \`prod\` branch:`);
  }
  for (const m of migrations) lines.push(`  - \`${m}\``);
} else if (MIGRATION_PATH) {
  // Only claim "none" where migrations are actually tracked; a repo without them
  // should say nothing rather than imply it has a migration story.
  lines.push("- New migrations: none");
}

const notes = lines.join("\n");

if (dryRun) {
  process.stdout.write(
    `--- tag: ${tag} (from ${prev ?? "no previous tag"}, range ${range}) ---\n\n${notes}\n`,
  );
} else {
  const notesFile = "release-notes.md";
  writeFileSync(notesFile, notes);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${version}\ntag=${tag}\nnotes_file=${notesFile}\n`,
    );
  }
  process.stdout.write(`${tag}\n`);
}

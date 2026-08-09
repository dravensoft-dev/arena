/* Everything runs inside main() and not at module top level, because the graph collects a
 * node's declaration by importing the script that carries it, and this one reads the plugin
 * manifest, shells out to git and exits the process the moment an import reaches it. */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

const read = (p: string) => readFileSync(join(root, p), 'utf8');
const readJSON = (p: string) => readJson(join(root, p));

function git(...args: string[]) {
  try {
    return execFileSync(hostBinary('git', 'to read what the tree tracks, which is a question only git can answer'), args,
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function main() {
  let ok = true;
  const results: [string, string, string][] = [];

  const check = (name: string, pass: boolean, detail: string, gate = true) => {
    if (!pass && gate) ok = false;
    results.push([gate ? (pass ? 'PASS' : 'FAIL') : 'INFO', name, detail]);
    return pass;
  };

  const plugin = readJSON('.claude-plugin/plugin.json');
  const marketplace = readJSON('.claude-plugin/marketplace.json');

  const version = plugin.version;
  const tag = `v${version}`;
  console.log(`\nRelease under test: ${tag}  (from .claude-plugin/plugin.json, the version Claude Code resolves first)`);

  function report(): never {
    console.log('');
    for (const [glyph, name, detail] of results) {
      console.log(`  [${glyph}] ${name.padEnd(30)} ${detail}`);
    }
    console.log(ok
      ? `\nRelease OK — ${tag} is tagged, pinned, and hands out ${version}.\n`
      : '\nRelease FAILED — fix the marked checks before publishing.\n');
    process.exit(ok ? 0 : 1);
  }

  const entry = marketplace.plugins?.find((p: { name: string }) => p.name === plugin.name);
  if (!check('marketplace entry', !!entry, entry ? `"${plugin.name}" found` : `no plugin named "${plugin.name}" in marketplace.json`)) {
    report();
  }

  check('marketplace version', entry.version === version, `${entry.version ?? '(unset)'} — plugin.json says ${version}`);

  const HEADING = 'Latest project artifacts';
  const LABEL = 'Repo/Claude Code plugin';

  const lines = read('README.md').split('\n');
  const opens = lines.findIndex((l) => new RegExp(`^##\\s+${HEADING}\\s*$`).test(l));
  const closes = lines.findIndex((l, i) => i > opens && /^##\s/.test(l));
  const artifacts = opens === -1 ? [] : lines.slice(opens + 1, closes === -1 ? lines.length : closes);

  if (check('README artifact list', opens !== -1, opens === -1 ? `no "## ${HEADING}" section found` : `${artifacts.filter((l) => l.trim()).length} entr(ies)`)) {
    const stated = artifacts.join('\n').match(new RegExp(`^-\\s+\\*\\*${LABEL}\\*\\*:\\s*(\\S+)`, 'm'))?.[1];
    check('the repo and the plugin move together', stated === version, stated ?? `no "- **${LABEL}**: X.Y.Z" line found`);

    const restated = artifacts.filter((l) => /npm/i.test(l) && /\d+\.\d+\.\d+/.test(l));
    check('a package version is linked, never restated', restated.length === 0,
      restated.length
        ? `${restated.length} line(s) write a version the registry decides: ${restated.map((l) => l.trim()).join(' | ')}`
        : `${artifacts.filter((l) => /npm/i.test(l)).length} package(s) point at the registry, which is the authority on what is published`);
  }

  const source = entry.source;
  const pinned = source && typeof source === 'object';
  check('source is pinned', pinned,
    pinned ? `${source.source}:${source.repo}` :
      `"${source}" — a string source resolves against the marketplace's own checkout (the default branch), so a version would not identify a tree`);

  if (pinned) {
    check('source.ref names the tag', source.ref === tag, `ref "${source.ref ?? '(unset)'}" — expected "${tag}"`);
  }

  const commit = git('rev-list', '-n1', tag);
  const exists = check('tag exists', commit !== null, commit === null
    ? `${tag} is not in this repository — git tag -a ${tag} -m "Arena ${tag}"`
    : `${tag} -> ${commit.slice(0, 7)}`);
  if (exists && commit !== null) {
    const type = git('cat-file', '-t', git('rev-parse', tag) ?? '');
    check('tag is annotated', type === 'tag', `${type ?? 'unknown'}; the convention is annotated: git tag -a ${tag} -m "Arena ${tag}"`, false);

    const atTag = git('show', `${tag}:.claude-plugin/plugin.json`);
    if (check('plugin.json at the tag', !!atTag, atTag ? '' : `cannot read .claude-plugin/plugin.json at ${tag}`)) {
      let tagged = null;
      try { tagged = JSON.parse(atTag ?? '').version; } catch {  }
      check('THE PIN SERVES THIS VERSION', tagged === version,
        tagged === version
          ? `${tag} hands out ${tagged}`
          : `${tag} hands out ${tagged ?? '(unparseable)'}, but the marketplace advertises ${version} — nobody would ever be offered this release, and nothing would error`);
    }

    if (pinned && source.sha) {
      check('source.sha matches the tag', source.sha === commit, `sha ${source.sha.slice(0, 7)} — ${tag} is ${commit.slice(0, 7)}; sha is the effective pin when both are set`);
    }

    const onMain = git('merge-base', '--is-ancestor', commit, 'origin/main') !== null;
    check('tag is on origin/main', onMain, onMain ? `${commit.slice(0, 7)} is reachable from origin/main` : `${commit.slice(0, 7)} is not on origin/main — users fetch the tag from the published repo`, false);
  }

  report();
}

if (isMainModule(import.meta.url)) main();

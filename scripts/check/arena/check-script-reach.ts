/* Holds every path INTO scripts/ that is named from outside it. Four framework suites and the
 * Overview page import tooling modules, and package.json names one per npm script; nothing
 * checked either, because check:script-types stops at scripts/ and script-imports.test.ts
 * scans only inside it. A move is therefore silent from out here: pascal left layers.ts and
 * HostClassBinding.test.ts kept naming it, which surfaced as `not a function` inside a suite
 * rather than as a missing path. Two shapes reach in. A literal names scripts/... outright,
 * relative or bare, in code or in prose. A built one is join(ANCHOR, 'a', 'b') inside an
 * import(), and the anchors are read from where they are declared rather than repeated here,
 * so a new one is covered the day it lands and one this cannot resolve is a problem. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { captured } from '../../utils/captures.ts';
import { repoRoot as ROOT } from '../../lib/arena/repo-root.ts';

export const ANCHOR_FILE = 'frameworks/angular/test/Compliance.ts';

export const MANIFEST = 'package.json';

export const SCANNED_TREES = ['frameworks', 'intro', 'contracts'];

export const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

export const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'vendor']);

const ANCHOR_DECL = /export const ([A-Z][A-Z0-9_]*) = join\(([A-Z][A-Z0-9_]*)((?:\s*,\s*'[^']*')*)\s*\)/g;
const IMPORTED_BUILD = /(?:const\s*\{([^}]*)\}\s*=\s*)?(?:await\s+)?import\(\s*[^)]*join\(([A-Z][A-Z0-9_]*)((?:\s*,\s*'[^']*')*)\s*\)/g;
const STATIC_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']*)'/g;
const LITERAL_PATH = /(?<![A-Za-z0-9._-])scripts\/[A-Za-z0-9._/-]+/g;
const TRAILING_PUNCTUATION = /[.,;:)]+$/;
const SEGMENT = /'([^']*)'/g;
const EXTENSION = /\.[A-Za-z0-9]{1,6}$/;

const segmentsOf = (tail: string) => [...tail.matchAll(SEGMENT)].map((m) => captured(m));

export const namesOf = (clause: string | undefined) => (clause ?? '')
  .split(',')
  .map((one) => ((one.split(':')[0] ?? '').split(/\s+as\s+/)[0] ?? '').trim())
  .filter((one) => one !== '' && !one.startsWith('...'));

export function anchorsFrom(source: string, root = ROOT) {
  const anchors = new Map([['REPO', root]]);
  for (const decl of source.matchAll(ANCHOR_DECL)) {
    const base = anchors.get(captured(decl, 2));
    if (base === undefined) continue;
    anchors.set(captured(decl), join(base, ...segmentsOf(captured(decl, 3))));
  }
  return anchors;
}

export function scannedFiles(root = ROOT) {
  const skip = (name: string) => name.startsWith('.') || SKIPPED_DIRECTORIES.has(name);
  return SCANNED_TREES
    .map((tree) => join(root, tree))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walkFiles(dir, { skip }))
    .filter((path) => SCANNED_EXTENSIONS.some((e) => path.endsWith(e)) && !path.includes('.generated.'));
}

export function namesAFile(cited: string) {
  return EXTENSION.test(cited);
}

export function literalsIn(source: string) {
  return (source.match(LITERAL_PATH) ?? [])
    .map((cited) => cited.replace(TRAILING_PUNCTUATION, ''))
    .filter(namesAFile);
}

export function literalProblems(rel: string, cited: string[], root = ROOT) {
  return cited
    .filter((path) => !existsSync(join(root, path)))
    .map((path) => `${rel} names ${path}, and nothing is there`);
}

export type Reach = { path: string; names: string[] };

export function buildsIn(source: string, anchors: Map<string, string>, root = ROOT) {
  const scripts = join(root, 'scripts');
  const resolved: Reach[] = [];
  const unresolvable: string[] = [];
  for (const built of source.matchAll(IMPORTED_BUILD)) {
    const anchor = built[2] ?? '';
    const base = anchors.get(anchor);
    if (base === undefined) { unresolvable.push(anchor); continue; }
    const path = join(base, ...segmentsOf(built[3] ?? ''));
    if (path.startsWith(scripts)) resolved.push({ path, names: namesOf(built[1]) });
  }
  return { resolved, unresolvable };
}

export function staticImportsIn(source: string, root = ROOT) {
  const out: Reach[] = [];
  for (const found of source.matchAll(STATIC_IMPORT)) {
    const spec = captured(found, 2);
    const at = spec.indexOf('scripts/');
    if (at < 0) continue;
    out.push({ path: join(root, spec.slice(at)), names: namesOf(captured(found)) });
  }
  return out;
}

export function builtProblems(rel: string, built: { resolved: Reach[]; unresolvable: string[] }, root = ROOT) {
  const { resolved, unresolvable } = built;
  return [
    ...unresolvable.map((name) =>
      `${rel} imports a path built from ${name}, and no anchor of that name is declared in `
      + `${ANCHOR_FILE}, so this gate cannot resolve it and would otherwise skip it in silence`),
    ...resolved.filter(({ path }) => !existsSync(path))
      .map(({ path }) => `${rel} imports ${relPosix(root, path)}, and nothing is there`),
  ];
}

export async function bindingProblems(rel: string, reaches: Reach[], root = ROOT) {
  const problems = [];
  for (const { path, names } of reaches) {
    if (names.length === 0 || !existsSync(path)) continue;
    const where = relPosix(root, path);
    let exported;
    try {
      exported = new Set(Object.keys(await import(pathToFileURL(path).href)));
    } catch (err) {
      problems.push(`${rel} imports ${where}, which is there and does not load: ${(err as Error).message}`);
      continue;
    }
    for (const name of names) {
      if (exported.has(name)) continue;
      problems.push(`${rel} imports ${name} from ${where}, which exports no such name. The path `
        + 'resolves, so only the binding moved, and out here that surfaces as "not a function" '
        + 'inside a suite rather than as anything a reader can act on.');
    }
  }
  return problems;
}

export async function reachProblems(root = ROOT) {
  const anchors = anchorsFrom(readFileSync(join(root, ANCHOR_FILE), 'utf8'), root);
  const problems = [];
  let reaching = 0;
  let bound = 0;

  for (const path of scannedFiles(root)) {
    const source = readFileSync(path, 'utf8');
    const built = buildsIn(source, anchors, root);
    const statics = staticImportsIn(source, root);
    const literals = literalsIn(source);
    if (literals.length + statics.length + built.resolved.length + built.unresolvable.length === 0) continue;
    reaching += 1;
    const rel = relPosix(root, path);
    const reaches = [...statics, ...built.resolved];
    bound += reaches.reduce((n, one) => n + one.names.length, 0);
    problems.push(
      ...literalProblems(rel, literals, root),
      ...builtProblems(rel, built, root),
      ...await bindingProblems(rel, reaches, root),
    );
  }

  const named = literalsIn(readFileSync(join(root, MANIFEST), 'utf8'));
  problems.push(...literalProblems(MANIFEST, named, root));

  return { problems, anchors, reaching, bound, named: named.length };
}

export function zeroReachProblems(reaching: number, named: number, anchors: Map<string, string>, bound = 1) {
  const problems = [];
  if (bound === 0) {
    problems.push('no imported binding was read at all, so every name could have moved and this '
      + 'gate would still report the paths clean, which is the half that catches a moved export');
  }
  if (reaching === 0) {
    problems.push('found no source outside scripts/ that names a path into it, and this gate exists '
      + 'because several do; a scan reaching nothing passes over the very thing it is for');
  }
  if (named === 0) {
    problems.push(`${MANIFEST} names no path under scripts/, and every npm script here is one, so `
      + 'the manifest half of this gate is reading something other than the manifest');
  }
  if (anchors.size <= 1) {
    problems.push(`${ANCHOR_FILE} declares no anchor this gate could read, so every built import `
      + 'would go unresolved and be reported as clean');
  }
  return problems;
}

async function main() {
  const { problems, anchors, reaching, bound, named } = await reachProblems();
  const all = [...zeroReachProblems(reaching, named, anchors, bound), ...problems];
  if (all.length > 0) {
    console.error(`check-script-reach: ${all.length} problem(s)\n`);
    for (const problem of all) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-script-reach: ${reaching} source(s) outside scripts/ reach into it; every path resolves and `
    + `all ${bound} imported binding(s) are exported, through ${anchors.size - 1} anchor(s) declared in `
    + `${ANCHOR_FILE}; ${named} path(s) in ${MANIFEST} resolve too`,
  );
}

if (isMainModule(import.meta.url)) await main();

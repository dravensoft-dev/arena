/* The architecture envelope, which is a promise a consumer already acted on rather than a policy.
 * Arena is adopted on a tree whose last nodes tell a project it may server-render, prerender or
 * embed as a fragment, and what each answer costs in dependencies; every one of those is a
 * property of these sources, so a contributor solving something else can withdraw one with every
 * other gate green. A global read while a module evaluates runs on a server, useLayoutEffect warns
 * there, an import outside the envelope is a framework decision made for the consumer, and a peer
 * that stops being optional installs a router in projects that never asked. literalRanges spans a
 * comment from its opening slash and a string from inside its quotes, which tells the two apart
 * without a second lexer: the pass reading an import specifier keeps strings and blanks comments,
 * since a specifier IS a string, and the rest blank both, since a global in one is prose. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { literalRanges } from '../../lib/arena/comments.ts';
import { OPTIONAL_PEERS } from '../../lib/arena/support-matrix.ts';

export type Envelope = { layer: string; source: string[]; allowed: string[]; why: string };

export const ENVELOPES: Envelope[] = [
  {
    layer: 'react',
    source: ['ts', 'tsx'],
    allowed: ['react', 'react-dom', 'tailwind-merge', 'tailwind-variants'],
    why:
      'the whole of what this layer may reach outside itself, and the reason a consumer may put it '
      + 'in a single-page application, a server-rendered one, a static build or a fragment inside '
      + 'somebody else\'s host without asking Arena first. A router, a store, a data client or an '
      + 'application shell imported here is a decision the library made on a consumer\'s behalf, '
      + 'and the consumer discovers it as a dependency they did not choose. The two styling '
      + 'utilities are vendored rather than declared, which is why the manifest carries no runtime '
      + 'dependency at all.',
  },
  {
    layer: 'angular',
    source: ['ts'],
    allowed: ['@angular/core', '@angular/common', '@angular/platform-browser', '@angular/cdk',
      '@angular/router', 'rxjs', 'tslib'],
    why:
      'the same claim on the other layer, with the CDK inside the envelope because the overlay '
      + 'primitives are built on it and it is a declared peer. The router is in this list and is '
      + 'the one entry that may not spread: it belongs to the metadata entry point alone, which is '
      + 'what keeps it optional, and OPTIONAL_PEER_RULE below is the half of that claim this gate '
      + 'holds.',
  },
];

export const ROUTER = '@angular/router';

export const ROUTER_ONLY_UNDER = 'frameworks/angular/metadata/';

export const BROWSER_GLOBALS = ['window', 'document', 'localStorage', 'sessionStorage',
  'navigator', 'matchMedia', 'ResizeObserver', 'IntersectionObserver'];

export const SSR_HOSTILE = new Map([
  ['useLayoutEffect',
   'React warns on it during a server render, because there is no layout to read before paint. '
   + 'useEffect is the one that is silent there, and where a measurement genuinely has to run '
   + 'before paint the answer is a state the first paint can already draw'],
]);

export const SKIPPED_TREES = ['dist', 'build', 'vendor', 'kitchen-sink', 'demos'];

const SKIPPED = [...SKIPPED_TREES.map((one) => `/${one}/`), '.generated.'];

export const skipsFor = (layer: string) => SKIPPED_TREES
  .filter((tree) => existsSync(join(root, 'frameworks', layer, tree)))
  .map((tree) => `!frameworks/${layer}/${tree}/**`);

export const node = {
  name: 'check:architecture',
  reads: ENVELOPES.flatMap((one) => [
    ...one.source.map((ext) => `frameworks/${one.layer}/**/*.${ext}`),
    ...skipsFor(one.layer),
    `!frameworks/${one.layer}/**/*.generated.*`,
  ]),
  writes: [],
  feeds: [],
};

const IS_TEST = /\.(test|spec)\.[cm]?[jt]sx?$|\/test\//;

const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^;\n]*?from\s*['"]([^'"]+)['"]/g;

const DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export const isComment = (text: string, from: number) => text.slice(from, from + 2).startsWith('/');

export function blank(text: string, ranges: [number, number][]) {
  const out = [...text];
  for (const [from, to] of ranges)
    for (let at = from; at < to && at < out.length; at += 1)
      if (out[at] !== '\n') out[at] = ' ';
  return out.join('');
}

export function withoutComments(text: string) {
  return blank(text, literalRanges(text).filter(([from]) => isComment(text, from)));
}

export function masked(text: string) {
  return blank(text, literalRanges(text));
}

export function topLevelStatements(text: string) {
  const source = masked(text);
  const out: { at: number; text: string }[] = [];
  let depth = 0;
  let start = 0;
  for (let at = 0; at < source.length; at += 1) {
    const ch = source[at];
    if (ch === '{' || ch === '(' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') depth = Math.max(depth - 1, 0);
    else if (depth === 0 && (ch === ';' || ch === '\n')) {
      const slice = source.slice(start, at);
      if (slice.trim()) out.push({ at: start, text: slice });
      start = at + 1;
    }
  }
  const rest = source.slice(start);
  if (rest.trim()) out.push({ at: start, text: rest });
  return out;
}

export function shipped(layer: string, base = root) {
  const dir = join(base, 'frameworks', layer);
  if (!existsSync(dir)) return [];
  return walkFiles(dir)
    .map((path) => relPosix(base, path))
    .filter((rel) => /\.[cm]?[jt]sx?$/.test(rel))
    .filter((rel) => !SKIPPED.some((skip) => rel.includes(skip)))
    .filter((rel) => !IS_TEST.test(rel))
    .sort();
}

export function packageOf(specifier: string) {
  if (specifier.startsWith('.') || specifier.startsWith('node:')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? null);
}

export function importsIn(source: string) {
  const text = withoutComments(source);
  return [...text.matchAll(IMPORT), ...text.matchAll(DYNAMIC)]
    .map((hit) => hit[1] ?? '')
    .map(packageOf)
    .filter((name): name is string => name !== null);
}

export function envelopeProblems(envelope: Envelope, base = root) {
  const problems = [];
  for (const rel of shipped(envelope.layer, base)) {
    for (const name of new Set(importsIn(readFileSync(join(base, rel), 'utf8')))) {
      if (envelope.allowed.includes(name)) continue;
      problems.push(
        `${rel} imports ${name}, which is outside the ${envelope.layer} envelope. ${envelope.why} `
        + 'Add it to ENVELOPES with the reason a consumer is now made to carry it, or reach the '
        + 'capability through a member the consumer answers.',
      );
    }
  }
  return problems;
}

export function optionalPeerProblems(optional: Record<string, unknown> = OPTIONAL_PEERS.angular, base = root) {
  const problems = [];
  if (!Object.hasOwn(optional, ROUTER))
    problems.push(
      `${ROUTER} is no longer declared optional. It is optional because reaching it is a choice a `
      + 'project makes when it decides the product has to be found from outside, and a required '
      + 'peer installs a router into every project that answered no.',
    );

  for (const rel of shipped('angular', base)) {
    if (rel.startsWith(ROUTER_ONLY_UNDER)) continue;
    if (!importsIn(readFileSync(join(base, rel), 'utf8')).includes(ROUTER)) continue;
    problems.push(
      `${rel} imports ${ROUTER} and does not sit under ${ROUTER_ONLY_UNDER}. The peer is optional `
      + 'only while the router is reachable from that entry point alone: an import anywhere else '
      + 'is loaded by every consumer of the main entry point, so the optional declaration becomes '
      + 'a promise the package breaks at run time rather than at install time.',
    );
  }
  return problems;
}

export const DEFERS = [/=>/, /\bfunction\b/, /\bclass\b/];

export function deferred(statement: string, global: string) {
  if (new RegExp(`typeof\\s+${global}\\b`).test(statement)) return true;
  return DEFERS.some((shape) => shape.test(statement));
}

export function moduleScopeProblems(base = root) {
  const problems = [];
  const globals = new RegExp(`(?<![.\\w$'"])(${BROWSER_GLOBALS.join('|')})(?![\\w$])`, 'g');

  for (const envelope of ENVELOPES) {
    for (const rel of shipped(envelope.layer, base)) {
      const text = readFileSync(join(base, rel), 'utf8');
      for (const statement of topLevelStatements(text)) {
        if (/^\s*(import|export\s+(type|interface))\b/.test(statement.text)) continue;
        for (const name of new Set([...statement.text.matchAll(globals)].map((hit) => hit[1] ?? ''))) {
          if (deferred(statement.text, name)) continue;
          problems.push(
            `${rel}: \`${statement.text.trim().slice(0, 60)}\` reads ${name} while the module `
            + 'evaluates. That runs on a server as well as in a browser, so it throws during a '
            + 'server render and during a prerender, at import time rather than at paint. Put the '
            + 'read inside a function, an effect or an after-render hook, or guard it with a '
            + "typeof check the way this layer's existing reads do.",
          );
        }
      }
    }
  }
  return problems;
}

export function hostileApiProblems(base = root, hostile = SSR_HOSTILE) {
  const problems = [];
  for (const envelope of ENVELOPES) {
    for (const rel of shipped(envelope.layer, base)) {
      const text = masked(readFileSync(join(base, rel), 'utf8'));
      for (const [name, why] of hostile)
        if (new RegExp(`\\b${name}\\b`).test(text))
          problems.push(`${rel} reaches ${name}, which a server render cannot answer. ${why}.`);
    }
  }
  return problems;
}

export function zeroScanProblems(counted: Map<string, number>) {
  const problems = [];
  if (ENVELOPES.length === 0)
    problems.push('declared 0 envelopes, so every import passes and this gate holds nothing');
  for (const [layer, n] of counted)
    if (n === 0)
      problems.push(`walked 0 shipped source(s) under frameworks/${layer}, so its envelope is `
        + 'measured over nothing and reports clean; check the discovery path');
  return problems;
}

export function architectureProblems(base = root) {
  const counted = new Map(ENVELOPES.map((one) => [one.layer, shipped(one.layer, base).length]));
  const problems = [...zeroScanProblems(counted)];
  if (problems.length > 0) return { problems, counted };

  for (const envelope of ENVELOPES) problems.push(...envelopeProblems(envelope, base));
  problems.push(
    ...optionalPeerProblems(OPTIONAL_PEERS.angular, base),
    ...moduleScopeProblems(base),
    ...hostileApiProblems(base),
  );
  return { problems, counted };
}

function main() {
  const { problems, counted } = architectureProblems();
  if (problems.length > 0) {
    console.error(`check-architecture: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const total = [...counted.values()].reduce((sum, one) => sum + one, 0);
  console.log(`check-architecture: ${total} shipped source(s) across ${counted.size} layer(s) `
    + 'import inside their envelope, read no browser global while the module evaluates, reach no '
    + 'API a server render cannot answer, and keep the router optional');
}

if (isMainModule(import.meta.url)) main();

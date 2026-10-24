/* The audit's alias list against the stylesheet that defines the aliases. The rule cannot read
 * that file: it ships inside the package beside the CLI and depends on nothing but its siblings,
 * so the list is a constant there and this is what stops the constant going quietly false. An
 * alias the layer gains and the rule does not name is a step of Arena's ramp a style plugin can
 * assign with nothing reporting it; one the rule names and the layer has dropped is a report about
 * a property nothing declares. Comments are stripped before the parse, because a name written in
 * prose above a block is not a definition. The same alias list also holds the manifests to the role
 * tier: a slot or variant that reads a colour alias paints out of every plugin's reach. The focus ring
 * and the picker's inverse are left out because no role answers them, and a level-* alias holds
 * a percentage and not a colour. */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { COMPAT_ALIASES } from '../../generate/core/arena-cli/audit.ts';

export const COLORS = 'contracts/design/colors.css';

export const MANIFESTS = 'frameworks/tailwind/components';

export const OUT_OF_SCOPE = ['focus-ring', 'picker-invert'];

export const RULE = 'scripts/generate/core/arena-cli/audit.ts';

export const node = {
  name: 'check:compat-aliases',
  reads: [COLORS, RULE, MANIFESTS],
  writes: [],
  feeds: [],
};

const COMMENT = /\/\*[\s\S]*?\*\//g;

const DEFINED = /--([a-z0-9-]+)\s*:/g;

const CHANNEL = 'arena-palette';

export function aliasesIn(css: string) {
  const text = css.replace(COMMENT, ' ');
  return [...new Set([...text.matchAll(DEFINED)].map((one) => one[1] ?? ''))]
    .filter((name) => name !== '' && name !== CHANNEL);
}

export function missing(defined: string[], known: string[]) {
  return defined.filter((name) => !known.includes(name));
}

export function extra(defined: string[], known: string[]) {
  return known.filter((name) => !defined.includes(name));
}

export function zeroAliasProblems(count: number) {
  if (count > 0) return [];
  return [`found 0 alias(es) in ${COLORS} -- an empty result set is a failure, not a clean pass; `
    + 'check the discovery path'];
}

export function collect(base = repoRoot) {
  const defined = aliasesIn(readFileSync(join(base, COLORS), 'utf8'));
  const zero = zeroAliasProblems(defined.length);
  if (zero.length) return zero;
  return [
    ...missing(defined, COMPAT_ALIASES).map((name) =>
      `${COLORS} defines --${name} and COMPAT_ALIASES does not name it, so a style plugin can `
      + 'assign that value with nothing reporting it'),
    ...extra(defined, COMPAT_ALIASES).map((name) =>
      `COMPAT_ALIASES names --${name} and ${COLORS} no longer defines it, so the rule reports on a `
      + 'property nothing declares'),
  ];
}

export type ManifestSource = { file: string; text: string };

function manifestFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return manifestFiles(path);
    return entry.name.endsWith('.manifest.json') ? [path] : [];
  });
}

export function shippedManifests(base = repoRoot): ManifestSource[] {
  return manifestFiles(join(base, MANIFESTS)).map((path) => ({
    file: relPosix(base, path),
    text: readFileSync(path, 'utf8'),
  }));
}

function classStrings(node: unknown, where: string): [string, string][] {
  if (typeof node === 'string') return [[where, node]];
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) =>
    classStrings(value, where === '' ? key : `${where}.${key}`));
}

export function manifestAliasProblems(manifests: ManifestSource[] = shippedManifests()) {
  const watched = COMPAT_ALIASES.filter((alias) => !OUT_OF_SCOPE.includes(alias) && !alias.startsWith('level-'));
  return manifests.flatMap(({ file, text }) => {
    const manifest = JSON.parse(text) as { slots?: unknown; variants?: unknown };
    const strings = [
      ...classStrings(manifest.slots, 'slot'),
      ...classStrings(manifest.variants, 'variant'),
    ];
    return strings.flatMap(([where, value]) =>
      watched.filter((alias) => new RegExp(`var\\(\\s*--${alias}\\s*[,)]`).test(value)).map((alias) =>
        `${file}: ${where} reads var(--${alias}), a compatibility alias no style plugin can answer, `
        + 'so the colour it paints is out of every plugin\'s reach; read a role'));
  });
}

function main() {
  const problems = [...collect(), ...manifestAliasProblems()];
  if (problems.length) {
    console.error(`check-compat-aliases: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-compat-aliases: the audit names every one of the ${COMPAT_ALIASES.length} `
    + 'alias(es) the compatibility layer defines, and none it has stopped defining, so a style '
    + 'plugin reaching around the role tier is reported wherever it reaches');
}

if (isMainModule(import.meta.url)) main();

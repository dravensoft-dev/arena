/* A design extension is a scope class that re-values ROLE tokens and nothing else: a scale is
 * shared by every use that wants that length, so moving one is not an extension but a different
 * Arena. FS_STEP is the one family outside roles.json it may move, because those steps are
 * already named roles. RESERVED_NAME is the one name it may not have, because a consumer writes
 * "extension": "none" to ask for none; `default` is reserved by nothing and fails as an unknown
 * name until one is actually called that. Two joins are held here: the file against the generator
 * block that emits it, since a file nobody emits paints nothing and a block naming no file emits
 * nothing; and PRINCIPLES, where a voice declares WHICH mechanism groups its content, the resolved
 * values have to agree, and no two voices may claim one.
 * contracts/design/Extensions.md is the normative statement of all of it. */


import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import { FILES, THEME_SCOPES } from '../../generate/arena/generate-tokens.ts';
import { POLARITIES } from '../../generate/core/arena-to-prod/palette-keys.ts';

const EFFECTS = 'contracts/design-generated/effects.generated.css';

export const node = {
  name: 'check:extensions',
  reads: ['contracts/design', 'scripts/generate/arena/generate-tokens.ts', EFFECTS],
  writes: [],
  feeds: [],
};

const DESIGN_DIR = join(repoRoot, 'contracts/design');
export const PREFIX = 'extension.';
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const FS_STEP = /^fs-[a-z0-9]+$/;

export const RHYTHM_STEP = /^rhythm-[a-z]+$/;

export const RESERVED_NAME = 'none';

export const GROUPING = 'grouping';

type Token = { $type?: string; $value?: unknown; $description?: string };

export function extensionName(file: string) {
  return basename(file).slice(PREFIX.length, -'.json'.length);
}

export function extensionFiles(dir = DESIGN_DIR) {
  return readdirSync(dir).filter((f) => f.startsWith(PREFIX) && f.endsWith('.json')).sort();
}

export function isZeroLength(value: string | undefined) {
  return value !== undefined && /^0(\.0+)?[a-z%]*$/.test(value.trim());
}

export function paintsNothing(shadow: string | undefined) {
  if (shadow === undefined) return true;
  const rgba = shadow.match(/rgba?\(([^)]*)\)/);
  if (!rgba) return false;
  const parts = (rgba[1] ?? '').split(',').map((p) => p.trim());
  return parts.length === 4 && Number(parts[3]) === 0;
}

export const PRINCIPLES = new Map<string, {
  says: string;
  holds: (at: Map<string, string>) => string | null;
}>([
  ['common-region', {
    says: 'a line drawn around a region says the things inside it are one thing',
    holds: (at) => (isZeroLength(at.get('bw-surface'))
      ? 'it sets --bw-surface to zero, and a voice that groups by drawing the region has to draw it'
      : null),
  }],
  ['figure-ground', {
    says: 'a surface is an object standing off a floor, so depth separates it and no line has to',
    holds: (at) => {
      if (!isZeroLength(at.get('bw-surface')))
        return 'it still draws --bw-surface, so the depth is decoration over the default voice '
          + 'rather than the thing carrying the grouping';
      if (paintsNothing(at.get('shadow-surface-rest')))
        return 'it removed --bw-surface and left --shadow-surface-rest painting nothing, so a surface '
          + 'is told from the page by neither a line nor a depth';
      return null;
    },
  }],
  ['proximity', {
    says: 'what belongs together is near and what does not is far, and nothing is drawn at all',
    holds: (at) => {
      if (!isZeroLength(at.get('bw-surface')))
        return 'it draws --bw-surface, which is grouping by common region under another name';
      if (!paintsNothing(at.get('shadow-surface-rest')))
        return 'it paints --shadow-surface-rest, which is grouping by figure and ground under another name';
      return null;
    },
  }],
]);

export function groupingOf(tokens: Record<string, unknown>) {
  const meta = (tokens as { $extensions?: Record<string, { grouping?: unknown }> })
    .$extensions?.[ARENA_EXT];
  return typeof meta?.[GROUPING] === 'string' ? meta[GROUPING] : undefined;
}

export const SCOPES = ['dark', ...THEME_SCOPES.keys()];

export function resolvedFor(css: string, name: string, scope = 'dark') {
  const decls = parseDecls(css);
  const themed = THEME_SCOPES.get(scope)?.(`.arena-${name}`);
  return new Map<string, string>([
    ...(decls.get(':root') ?? new Map()),
    ...(decls.get(`.arena-${name}`) ?? new Map()),
    ...((themed && decls.get(themed)) || new Map()),
  ]);
}

export function principleProblems(
  name: string, declared: string | undefined, byScope: Map<string, Map<string, string>>,
) {
  const problems = [];
  const file = `extension.${name}.json`;
  if (declared === undefined) {
    problems.push(
      `${file}: declares no grouping principle. Write $extensions["${ARENA_EXT}"].${GROUPING}, one of `
      + `${[...PRINCIPLES.keys()].join(', ')}. Two voices that pick values without answering "what belongs `
      + `together" differently end up differing by degree, and a catalogue of those is one voice with a `
      + `dial on it.`,
    );
    return problems;
  }
  const principle = PRINCIPLES.get(declared);
  if (!principle) {
    problems.push(
      `${file}: "${declared}" is not a grouping principle Arena knows, which are `
      + `${[...PRINCIPLES.keys()].join(', ')}. A fourth voice needs a fourth mechanism and the invariant `
      + `that holds it, added here, rather than a fourth name for one of these three.`,
    );
    return problems;
  }
  for (const [scope, at] of byScope) {
    const broken = principle.holds(at);
    if (broken)
      problems.push(
        `${file}: claims to group by ${declared}, where ${principle.says}, but in ${scope} ${broken}. `
        + `A voice checked in one theme only has not been checked: a depth cue that works in one polarity `
        + `can do nothing in the other, which is why an extension may carry a theme group.`,
      );
  }
  return problems;
}

export function sharedPrincipleProblems(declaredBy: Map<string, string | undefined>) {
  const byPrinciple = new Map<string, string[]>();
  for (const [name, declared] of declaredBy) {
    if (declared === undefined) continue;
    byPrinciple.set(declared, [...(byPrinciple.get(declared) ?? []), name]);
  }
  return [...byPrinciple]
    .filter(([, names]) => names.length > 1)
    .map(([declared, names]) =>
      `${names.map((n) => `extension.${n}.json`).join(' and ')} both group by ${declared}. Two voices `
      + `answering "what belongs together" the same way can only differ in how far they take it, and a `
      + `reader cannot tell a second voice from a re-tuned first one. Give one of them a mechanism the `
      + `other does not use, or ship one.`);
}

export function movedTokens(tokens: Record<string, unknown>) {
  const out: { key: string; token: Token; theme: string }[] = [];
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;
    if (!THEME_SCOPES.has(key)) { out.push({ key, token: value as Token, theme: '' }); continue; }
    for (const [child, token] of Object.entries(value as Record<string, Token>))
      out.push({ key: child, token, theme: key });
  }
  return out;
}

export function extensionProblems(
  name: string, tokens: Record<string, Token>, roles: Record<string, Token>,
) {
  const problems = [];
  const at = `extension.${name}.json`;
  if (name === RESERVED_NAME)
    problems.push(
      `${at}: "${RESERVED_NAME}" is how a consumer says it wants no extension, so an extension `
      + `answering to that name could never be selected`,
    );
  if (POLARITIES.includes(name))
    problems.push(
      `${at}: "${name}" is a theme polarity, and .arena-${name} is already the class a palette of `
      + `that polarity answers to. An extension named after one would be indistinguishable from the `
      + `theme's own scope, both to the cascade and to the consumer CLI reading the catalogue out of `
      + `the shipped CSS.`,
    );
  if (!KEBAB.test(name))
    problems.push(`${at}: "${name}" is not kebab-case, and the name becomes the class .arena-${name}`);
  const moved = movedTokens(tokens);
  if (!moved.length)
    problems.push(`${at}: moves no role, and an extension that changes nothing is a class nobody can tell from its absence`);
  for (const { key, token, theme } of moved) {
    const where = theme ? `${at} (${theme})` : at;
    const named = FS_STEP.test(key) ? 'an fs step' : RHYTHM_STEP.test(key) ? 'a rhythm step' : null;
    if (named) {
      if (token?.$type !== 'dimension')
        problems.push(`${where}: --${key} is a ${token?.$type}, and ${named} is a dimension`);
      if (!token?.$description)
        problems.push(`${where}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
      continue;
    }
    const role = roles[key];
    if (!role) {
      problems.push(
        `${where}: --${key} is neither a role in contracts/design/roles.json nor an fs or rhythm step. An extension re-values those only: `
        + `a scale, a colour, a density step or a spacing step is shared by every use that wants that value, `
        + `so moving one is not an extension but a different Arena.`,
      );
      continue;
    }
    if (token?.$type !== role.$type)
      problems.push(`${where}: --${key} is a ${token?.$type} here and a ${role.$type} in roles.json, and the two cannot disagree`);
    if (!token?.$description)
      problems.push(`${where}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
  }
  return problems;
}

export function declarationProblems(names: string[], blocks = FILES.flatMap((f) => f.blocks)) {
  const problems = [];
  const emitted = new Map(
    blocks.filter((b) => b.source.startsWith(PREFIX)).map((b) => [b.source, b.selector]),
  );
  for (const name of names) {
    const source = `${PREFIX}${name}.json`;
    const selector = emitted.get(source);
    if (!selector)
      problems.push(
        `${source} is emitted by no block in FILES in scripts/generate/arena/generate-tokens.ts, so it paints nothing: `
        + `add { selector: '.arena-${name}', source: '${source}' } after the :root blocks, since an extension and a role `
        + `have equal specificity and source order is what decides between them`,
      );
    else if (selector !== `.arena-${name}`)
      problems.push(`${source} is emitted under ${selector}, and an extension named ${name} is the class .arena-${name}`);
  }
  for (const source of emitted.keys())
    if (!names.includes(extensionName(source)))
      problems.push(`FILES emits ${source}, and no such file is in contracts/design/`);
  return problems;
}

export function zeroExtensionProblem(files: string[]) {
  return files.length === 0
    ? 'found 0 extensions -- an empty result set is a failure, not a clean pass; check the discovery path'
    : null;
}

export function collect(dir = DESIGN_DIR, effects?: string) {
  const css = effects ?? readFileSync(join(repoRoot, EFFECTS), 'utf8');
  const files = extensionFiles(dir);
  const roles = readJson(join(dir, 'roles.json'));
  const problems = [];
  const declaredBy = new Map<string, string | undefined>();
  for (const f of files) {
    const name = extensionName(f);
    const tokens = readJson(join(dir, f));
    const declared = groupingOf(tokens);
    declaredBy.set(name, declared);
    problems.push(...extensionProblems(name, tokens, roles));
    problems.push(...principleProblems(name, declared,
      new Map(SCOPES.map((scope) => [scope, resolvedFor(css, name, scope)]))));
  }
  problems.push(...sharedPrincipleProblems(declaredBy));
  problems.push(...declarationProblems(files.map(extensionName)));
  return problems;
}

function main() {
  const files = extensionFiles();
  const zero = zeroExtensionProblem(files);
  if (zero) {
    console.error(`check-extensions: ${zero}`);
    process.exit(1);
  }
  const problems = collect();
  if (problems.length) {
    console.error(`check-extensions: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-extensions: ${files.length} extension(s), each moving roles, fs steps and rhythm steps only, `
    + `each emitted under its own class, and each grouping by a mechanism no other one claims, `
    + `measured in ${SCOPES.length} scope(s)`);
}

if (isMainModule(import.meta.url)) main();

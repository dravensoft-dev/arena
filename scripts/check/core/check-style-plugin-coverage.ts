/* Whether the surface the kernel advertises is the surface it exposes. A role nothing can reach
 * is a role that does not exist, and a part nothing can paint is a hook that was emitted and
 * never wired, so `complete` is the witness and this gate is the question: it answers every role
 * with a value `default` does not use and paints through every part hook. It reads the parts from
 * the manifests rather than from the generated modules, so a manifest that gained a slot and
 * never rebuilt is caught, and it reuses paintedParts from the shipped audit rather than parsing
 * a selector a second time. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { paintedParts } from '../../generate/core/arena-to-prod/audit.ts';
import { restatedFindings } from '../../generate/core/arena-to-prod/restated.ts';
import { kebab } from '../../utils/case.ts';
import { categoryOf } from '../../lib/tailwind/manifest-surfaces.ts';
import { MANIFESTS, partsOf } from '../arena/check-parts.ts';
import { ROLES, ROOT_PLUGIN } from './check-style-plugin.ts';

export const COMPLETE = 'plugin-style-store/complete/plugin.tokens.json';

export const COMPLETE_CSS = 'plugin-style-store/complete/plugin.css';

export const node = {
  name: 'check:style-plugin-coverage',
  reads: [ROLES, ROOT_PLUGIN, COMPLETE, COMPLETE_CSS, 'frameworks/tailwind/components/**'],
  writes: [],
  feeds: [],
};

type Token = { $value?: unknown };

export function answersIn(tokens: Record<string, Token>) {
  return Object.fromEntries(Object.entries(tokens).map(([name, token]) => [name, JSON.stringify(token.$value)]));
}

export function movedRoles(root: Record<string, string>, complete: Record<string, string>) {
  return Object.keys(complete).filter((role) => complete[role] !== root[role]);
}

export function unreachedRoles(declared: string[], moved: string[]) {
  const given = new Set(moved);
  return declared.filter((role) => !given.has(role)).map((role) =>
    `${role} is declared and complete answers it the way default does, so nothing in this tree `
    + 'shows the role reaching a page. A role nothing can reach is a role that does not exist: '
    + `give it an answer of its own in ${COMPLETE}, or take the question out of the kernel.`);
}

export function unpaintedParts(all: string[], painted: string[]) {
  const given = new Set(painted);
  return all.filter((part) => !given.has(part)).map((part) =>
    `no rule in ${COMPLETE_CSS} paints [data-arena-part="${part}"]. The hook was emitted and wired `
    + 'to nothing, so a style plugin has reach this repository advertises and never demonstrates.');
}

export function phantomParts(all: string[], painted: string[]) {
  const emitted = new Set(all);
  return painted.filter((part) => !emitted.has(part)).map((part) =>
    `${COMPLETE_CSS} paints [data-arena-part="${part}"] and no manifest emits that hook, so the `
    + 'selector matches nothing on any page. The witness is what says the advertised surface is '
    + 'real, and a rule that paints nothing says the opposite while counting as coverage: name the '
    + 'part a manifest emits, or declare the slot in its manifest\'s partOf when the element it '
    + 'draws already carries another slot\'s hook.');
}

export function sheetsByPart(base = repoRoot) {
  const out = new Map<string, string>();
  for (const name of MANIFESTS()) {
    const path = join(base, 'frameworks/tailwind/consume/components', categoryOf(name) ?? '',
      kebab(name), `${name}.styles.generated.css`);
    if (!existsSync(path)) continue;
    for (const part of Object.values(partsOf(name))) out.set(part, path);
  }
  return out;
}

export function restatedInWitness(css: string, sheetOf: (part: string) => string | null) {
  return restatedFindings(css, sheetOf).map(({ part, property, value }) =>
    `${COMPLETE_CSS} sets ${property} to ${value} on [data-arena-part="${part}"] and the slot `
    + 'already paints exactly that, so the rule demonstrates no reach. The witness is what says the '
    + 'advertised surface is real, and a part reached by restating its own answer says the opposite '
    + 'while counting as coverage: paint it with a value of its own.');
}

export function zeroCoverageProblems(count: number) {
  if (count > 0) return [];
  return ['walked 0 role(s) -- an empty result set is a failure, not a clean pass; check the '
    + 'discovery path'];
}

export function collect(base = repoRoot) {
  const declared = Object.keys(readJson(join(base, ROLES)) as Record<string, unknown>);
  const root = answersIn(readJson(join(base, ROOT_PLUGIN)) as Record<string, Token>);
  const complete = answersIn(readJson(join(base, COMPLETE)) as Record<string, Token>);
  const parts = [...new Set(MANIFESTS().flatMap((name) => Object.values(partsOf(name))))].sort();
  const witness = readFileSync(join(base, COMPLETE_CSS), 'utf8');
  const painted = paintedParts(witness);
  const sheets = sheetsByPart(base);
  const sheetOf = (part: string) => {
    const path = sheets.get(part);
    return path ? readFileSync(path, 'utf8') : null;
  };

  return {
    problems: [
      ...unreachedRoles(declared, movedRoles(root, complete)),
      ...unpaintedParts(parts, painted),
      ...phantomParts(parts, painted),
      ...restatedInWitness(witness, sheetOf),
    ],
    roles: declared.length,
    parts: parts.length,
  };
}

function main() {
  const { problems, roles, parts } = collect();
  const zero = zeroCoverageProblems(roles);
  const all = [...zero, ...(zero.length ? [] : problems)];
  if (all.length > 0) {
    console.error(`check-style-plugin-coverage: ${all.length} problem(s)\n`);
    for (const one of all) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-style-plugin-coverage: complete moves all ${roles} declared role(s) and paints all `
    + `${parts} emitted part(s), so every question the kernel asks has somewhere it is answered `
    + 'differently and every hook it emits has somewhere it is used');
}

if (isMainModule(import.meta.url)) main();

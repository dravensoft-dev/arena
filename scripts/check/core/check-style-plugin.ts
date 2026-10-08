/* The reading floors, measured against the values this build actually emits rather than against
 * the file that authored them, in the base scope and in every theme scope beside it. A floor
 * checked in one polarity only has not been checked: a value restated under a theme can close a
 * paragraph up in the one scope nobody measured. The rules themselves live beside the shipped
 * command, so this gate and a consumer's build hold the same claim and neither can be the weaker
 * of the two. The root plugin is held total with kernel defaults ignored, and its answer to a role
 * carrying one is that default completed the way a consumer's build completes a silent plugin, so
 * a project whose own copy is silent on the role renders it as this one does. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { THEME_SCOPES } from '../../generate/arena/generate-tokens.ts';
import {
  ARENA_EXT, FS_STEP, KEBAB, MAX_PROSE_MEASURE, MIN_HEADING_LEADING, MIN_PROSE_LEADING,
  MIN_PROSE_MEASURE, RHYTHM_STEP, floorProblems, keyProblems, nameProblems, totalityProblems,
  valueProblems, withDefaults,
} from '../../generate/core/arena-cli/style-plugin-rules.ts';
import { readPlugin } from '../../generate/core/arena-cli/theme-css.ts';

export {
  ARENA_EXT, FS_STEP, KEBAB, MAX_PROSE_MEASURE, MIN_HEADING_LEADING, MIN_PROSE_LEADING,
  MIN_PROSE_MEASURE, RHYTHM_STEP, floorProblems, keyProblems, nameProblems, totalityProblems,
  valueProblems,
};

export const ROOT_PLUGIN = 'plugin-style-store/default/plugin.tokens.json';

export const ROLES = 'contracts/design/roles.json';

export const RESOLVED = [
  'contracts/design-generated/effects.generated.css',
  'contracts/design-generated/typography.generated.css',
  'contracts/design-generated/spacing.generated.css',
  'contracts/design-generated/style-plugin.default.generated.css',
  'contracts/design-generated/style-plugin.complete.generated.css',
];

export const node = {
  name: 'check:style-plugin',
  reads: [ROLES, ROOT_PLUGIN, 'scripts/generate/arena/generate-tokens.ts', ...RESOLVED],
  writes: [],
  feeds: [],
};

type Token = { $type?: string; $value?: unknown; $description?: string };

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

export function zeroScopeProblems(count: number) {
  if (count > 0) return [];
  return ['measured 0 scope(s) -- an empty result set is a failure, not a clean pass; check the '
    + 'discovery path'];
}

const SCOPED = /^\.arena-([a-z][a-z0-9-]*)$/;

export function scopedPlugins(css: string) {
  return [...parseDecls(css).keys()]
    .map((selector) => SCOPED.exec(selector)?.[1])
    .filter((name): name is string => name !== undefined && !THEME_SCOPES.has(name));
}

type KernelRole = { $extensions?: Record<string, { default?: unknown }> };

const without = (record: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([one]) => one !== key));

export function defaultAnswerProblems(roles: Record<string, KernelRole>, answers: Record<string, unknown>) {
  const kernel = Object.fromEntries(Object.entries(roles)
    .map(([name, role]) => [name, { default: role.$extensions?.[ARENA_EXT]?.default }]));
  const plugin = readPlugin('default', answers);
  const said = ([dark, light]: unknown[]) =>
    (light === undefined ? JSON.stringify(dark) : `${JSON.stringify(dark)}, ${JSON.stringify(light)} in light`);
  const problems = [];
  for (const [name, { default: alias }] of Object.entries(kernel)) {
    if (typeof alias !== 'string' || !Object.hasOwn(plugin.tokens, name)) continue;
    const completed = withDefaults({ tokens: without(plugin.tokens, name), light: without(plugin.light, name) }, kernel).plugin;
    const want = [completed.tokens[name], completed.light[name]];
    const got = [plugin.tokens[name], plugin.light[name]];
    if (want[0] !== got[0] || want[1] !== got[1])
      problems.push(`${ROOT_PLUGIN}: --${name} is ${said(got)} and its kernel default ${alias} comes to ${said(want)}. `
        + 'A project whose own plugin is silent on the role renders it through that default, so the plugin Arena '
        + 'installs with gives the same answer or the two appearances differ on the one role they were meant to share.');
  }
  return problems;
}

export function collect(sheets?: string) {
  const css = sheets ?? RESOLVED.map((f) => readFileSync(join(repoRoot, f), 'utf8')).join('\n');
  const problems = [];
  for (const scope of SCOPES)
    problems.push(...floorProblems(resolvedFor(css, '', scope), scope, ROOT_PLUGIN));
  for (const name of scopedPlugins(css))
    for (const scope of SCOPES)
      problems.push(...floorProblems(resolvedFor(css, name, scope), `${scope} under .arena-${name}`,
        `.arena-${name}`));
  problems.push(...totalityProblems(
    Object.keys(readJson(join(repoRoot, ROLES))),
    Object.keys(readJson(join(repoRoot, ROOT_PLUGIN))),
  ));
  problems.push(...defaultAnswerProblems(
    readJson(join(repoRoot, ROLES)) as Record<string, KernelRole>,
    readJson(join(repoRoot, ROOT_PLUGIN)) as Record<string, unknown>,
  ));
  return problems;
}

function main() {
  const zero = zeroScopeProblems(SCOPES.length);
  const problems = [...zero, ...(zero.length ? [] : collect())];
  if (problems.length) {
    console.error(`check-style-plugin: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-style-plugin: the root plugin answers every role the kernel declares, and the `
    + `reading floors hold in ${SCOPES.length} scope(s)`);
}

if (isMainModule(import.meta.url)) main();

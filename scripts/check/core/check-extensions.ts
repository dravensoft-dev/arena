/* The reading floors, measured against the values this build actually emits rather than against
 * the file that authored them, in the base scope and in every theme scope beside it. A floor
 * checked in one polarity only has not been checked: a value restated under a theme can close a
 * paragraph up in the one scope nobody measured. The rules themselves live beside the shipped
 * command, so this gate and a consumer's build hold the same claim and neither can be the weaker
 * of the two. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { THEME_SCOPES } from '../../generate/arena/generate-tokens.ts';
import {
  ARENA_EXT, FS_STEP, KEBAB, MAX_PROSE_MEASURE, MIN_HEADING_LEADING, MIN_PROSE_LEADING,
  MIN_PROSE_MEASURE, RHYTHM_STEP, floorProblems, keyProblems, nameProblems, valueProblems,
} from '../../generate/core/arena-to-prod/extension-rules.ts';

export {
  ARENA_EXT, FS_STEP, KEBAB, MAX_PROSE_MEASURE, MIN_HEADING_LEADING, MIN_PROSE_LEADING,
  MIN_PROSE_MEASURE, RHYTHM_STEP, floorProblems, keyProblems, nameProblems, valueProblems,
};

const EFFECTS = 'contracts/design-generated/effects.generated.css';

export const node = {
  name: 'check:extensions',
  reads: ['contracts/design', 'scripts/generate/arena/generate-tokens.ts', EFFECTS],
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

export function collect(effects?: string) {
  const css = effects ?? readFileSync(join(repoRoot, EFFECTS), 'utf8');
  const problems = [];
  for (const scope of SCOPES)
    problems.push(...floorProblems(resolvedFor(css, '', scope), scope, 'contracts/design/roles.json'));
  return problems;
}

function main() {
  const zero = zeroScopeProblems(SCOPES.length);
  const problems = [...zero, ...(zero.length ? [] : collect())];
  if (problems.length) {
    console.error(`check-extensions: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-extensions: the reading floors hold in ${SCOPES.length} scope(s)`);
}

if (isMainModule(import.meta.url)) main();

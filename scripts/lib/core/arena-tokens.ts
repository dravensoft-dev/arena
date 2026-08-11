/* Which Arena tokens a stylesheet reads, which names the generated CSS defines, the union of
 * those with the hand-authored aliases, and which SCOPE CLASSES those same sheets answer to.
 * They sit in lib rather than in any one gate because check-cdk, check-tailwind,
 * check-tailwind-coverage and check-docs all read them, and a library must not reach up into a
 * gate to do it. The last one is read off the SELECTORS rather than the declarations, and it is
 * the same four files because a scope class only means anything where a token is re-valued
 * under it. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDecls } from '../arena/css-decls.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { captured } from '../../utils/captures.ts';

const GENERATED = ['palette.generated.css', 'typography.generated.css', 'spacing.generated.css', 'effects.generated.css'];

export function arenaTokens(root = repoRoot) {
  const names = new Set<string>();
  for (const f of GENERATED)
    for (const decls of parseDecls(readFileSync(join(root, 'contracts', 'design-generated', f), 'utf8')).values())
      for (const name of decls.keys()) names.add(name);
  return names;
}

export const SCOPE_CLASS = /\.arena-([a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/g;

export function arenaScopeClasses(root = repoRoot) {
  const classes = new Set<string>();
  for (const f of GENERATED)
    for (const selector of parseDecls(readFileSync(join(root, 'contracts', 'design-generated', f), 'utf8')).keys())
      for (const m of selector.matchAll(SCOPE_CLASS)) classes.add(captured(m));
  return classes;
}

export function referencedTokens(css: string) {
  const out = new Set<string>();
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of stripped.matchAll(/var\(\s*--([a-z0-9-]+)\s*[,)]/g)) out.add(captured(m));
  return out;
}

export function arenaTokenNames(root: string) {
  const names = arenaTokens(root);
  const colors = parseDecls(readFileSync(join(root, 'contracts', 'design', 'colors.css'), 'utf8'));
  for (const decls of colors.values()) for (const name of decls.keys()) names.add(name);
  return names;
}

/* The userScale axis of a token in contracts/design/: what happens to a dimension when the user asks
 * for larger text. It lives in lib/ because the generator spells a length by it and the vocabulary
 * compiler restates one by it, and a library never imports a gate; check:user-scale re-exports it
 * and holds the totality claim over it. */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { ARENA_EXT, EXCLUDED, childEntries, isToken } from './dtcg-shapes.ts';
import type { DtcgNode } from './dtcg-shapes.ts';

export const KEY = 'userScale';

export const AXES = new Map([
  ['scales', 'grows with the user\'s text setting: sp on Android, Dynamic Type on iOS'],
  ['follows', 'a multiplier of a size that scales, so it needs no transform of its own'],
  ['fixed', 'does not move when the text does, and the box around it grows instead'],
]);

export function declaredAxis(node: DtcgNode) {
  return (node?.$extensions as Record<string, any>)?.[ARENA_EXT]?.[KEY];
}

export type Classified = { at: string; axis: string; declaredAt: string };

export function classify(tree: DtcgNode, file: string) {
  const found: Classified[] = [];
  const problems: string[] = [];

  const walk = (node: DtcgNode, path: string[], inherited: string | undefined,
                inheritedFrom: string, type: string | undefined) => {
    const own = declaredAxis(node);
    const at = `${file}:${path.join('.') || '(root)'}`;
    if (own !== undefined && !AXES.has(own)) {
      problems.push(`${at} declares userScale "${own}", which is not one of ${[...AXES.keys()].join(', ')}`);
    }
    const axis = own ?? inherited;
    const from = own !== undefined ? at : inheritedFrom;
    const resolvedType = (node.$type as string | undefined) ?? type;

    if (isToken(node)) {
      if (resolvedType === 'dimension' && axis === undefined) {
        problems.push(
          `${at} is a dimension and resolves no userScale. Declare one on it, or on the group it `
          + 'belongs to, because a target with a text-size setting has no way to derive the answer.',
        );
      }
      if (axis !== undefined && AXES.has(axis)) found.push({ at, axis, declaredAt: from });
      return;
    }
    for (const [name, child] of childEntries(node)) walk(child, [...path, name], axis, from, resolvedType);
  };

  walk(tree, [], undefined, '', undefined);
  return { found, problems };
}

export function tokenAxes(dir: string) {
  const map = new Map<string, string>();
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f)).sort();
  for (const file of files) {
    for (const { at, axis } of classify(readJson(join(dir, file)), file).found) {
      map.set(at.slice(at.indexOf(':') + 1), axis);
    }
  }
  return map;
}

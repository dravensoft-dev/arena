/* Every dimension in `contracts/design/` says what happens to it when the user asks for larger
 * text. CSS emits px either way, so nothing here changes a rendered page: the axis exists because
 * a platform that HAS the setting, which is every phone, cannot derive the answer from a value and
 * a unit. The closed set is what earns the extension, the same argument `keyword` makes for being a
 * type. A group declares for the leaves under it and a leaf overrides its group, which is Arena's
 * rule rather than DTCG's: 2025.10 admits `$extensions` on a group (§6.3.2) and defines no
 * inheritance for it, so the inheritance is stated here and in `contracts/design/TokenTypes.md`.
 * `follows` is checked wherever it is declared but never demanded, because a multiplier is not a
 * dimension and the totality claim is about dimensions. */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { ARENA_EXT, childEntries, isToken } from '../../lib/core/dtcg-shapes.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { EXCLUDED } from './check-dtcg.ts';

export const node = {
  name: 'check:user-scale',
  reads: ['contracts/design/*.json'],
  writes: [],
  feeds: [],
};

export const KEY = 'userScale';

export const AXES = new Map([
  ['scales', 'grows with the user\'s text setting: sp on Android, Dynamic Type on iOS'],
  ['follows', 'a multiplier of a size that scales, so it needs no transform of its own'],
  ['fixed', 'does not move when the text does, and the box around it grows instead'],
]);

export const SOURCE_DIR = 'contracts/design';

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

export function zeroClassifiedProblems(count: number) {
  if (count > 0) return [];
  return ['classified 0 tokens on the user-text-size axis, so this gate reported nothing wrong with '
    + 'everything; a walk that finds no token is a failure rather than a clean pass'];
}

export function unusedAxisProblems(found: Classified[], axes = AXES) {
  const used = new Set(found.map((f) => f.axis));
  return [...axes.keys()]
    .filter((axis) => !used.has(axis))
    .map((axis) => `the userScale axis "${axis}" is declared in this gate and no token takes it, so `
      + 'the set names a case the tree does not have; retire it or declare the token that needs it');
}

export function collect(dir = join(root, SOURCE_DIR)) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f)).sort();
  const found: Classified[] = [];
  let problems: string[] = [];
  for (const file of files) {
    const result = classify(readJson(join(dir, file)), file);
    found.push(...result.found);
    problems = problems.concat(result.problems);
  }
  return { files, found, problems };
}

function main() {
  const { files, found, problems } = collect();
  const all = [
    ...zeroClassifiedProblems(found.length),
    ...problems,
    ...unusedAxisProblems(found),
  ];
  if (all.length) {
    console.error(`check-user-scale: ${all.length} problem(s)\n`);
    for (const p of all) console.error(`  ${p}`);
    console.error('\ncontracts/design/TokenTypes.md states what each axis obliges a platform to do.');
    process.exit(1);
  }
  const counts = [...AXES.keys()].map((a) => `${found.filter((f) => f.axis === a).length} ${a}`);
  console.log(`check-user-scale: ${found.length} token(s) across ${files.length} file(s) carry an axis (${counts.join(', ')})`);
}

if (isMainModule(import.meta.url)) main();

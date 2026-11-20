/* Every dimension in `contracts/design/` says what happens to it when the user asks for larger
 * text. The axis decides the CSS unit: `scales` is emitted in rem and grows with the reader's text
 * setting, `fixed` and `follows` as written. The same answer serves a platform that HAS the setting,
 * which is every phone, and cannot derive it from a value and a unit. The closed set is what earns the extension, the same argument `keyword` makes for being a
 * type. A group declares for the leaves under it and a leaf overrides its group, which is Arena's
 * rule rather than DTCG's: 2025.10 admits `$extensions` on a group (§6.3.2) and defines no
 * inheritance for it, so the inheritance is stated here and in `contracts/design/TokenTypes.md`.
 * `follows` is checked wherever it is declared but never demanded, because a multiplier is not a
 * dimension and the totality claim is about dimensions. It also walks roles.json against every
 * plugin answer in PLUGIN_ANSWERS and refuses an alias that lands on another axis than its role. */

import { readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { KEY, AXES, declaredAxis, classify, tokenAxes as axesOf } from '../../lib/core/user-scale.ts';
import type { Classified } from '../../lib/core/user-scale.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { EXCLUDED } from '../../lib/core/dtcg-shapes.ts';

export const PLUGIN_ANSWERS = [
  'plugin-style-store/default/plugin.tokens.json',
  'plugin-style-store/complete/plugin.tokens.json',
  'plugin-style-store/catalogue/*/plugin.tokens.json',
];

export const node = {
  name: 'check:user-scale',
  reads: [
    'contracts/design/*.json',
    ...PLUGIN_ANSWERS,
  ],
  writes: [],
  feeds: [],
};

export const SOURCE_DIR = 'contracts/design';

export { KEY, AXES, declaredAxis, classify };
export type { Classified };

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

export const tokenAxes = (dir = join(root, SOURCE_DIR)) => axesOf(dir);

type Answer = { name: string; tokens: Record<string, DtcgNode> };

export function answerAxisProblems(roles: Record<string, DtcgNode>, axes: ReadonlyMap<string, string>,
                                   answers: Answer[]) {
  let judged = 0;
  const problems: string[] = [];
  for (const { name, tokens } of answers) {
    for (const [key, answer] of Object.entries(tokens)) {
      const role = Object.hasOwn(roles, key) ? roles[key] : undefined;
      const want = role ? declaredAxis(role) : undefined;
      if (!want || !AXES.has(want)) continue;
      const value = (answer as DtcgNode)?.$value;
      const target = typeof value === 'string' ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;
      if (!target) continue;
      let got: string | undefined = axes.get(target);
      if (got === undefined && !target.includes('.') && Object.hasOwn(roles, target)) {
        got = declaredAxis(roles[target] as DtcgNode);
      }
      if (got === undefined) continue;
      judged += 1;
      if (got !== want) {
        problems.push(`${name}: ${key} answers {${target}}, which is on the "${got}" axis, but the role `
          + `${key} is declared "${want}"; an answer stays on its role's axis, or the role's `
          + 'declaration is what is wrong');
      }
    }
  }
  return { judged, problems };
}

export function answerFiles(base = root) {
  const files: string[] = [];
  for (const pattern of PLUGIN_ANSWERS) {
    let found = [''];
    for (const part of pattern.split('/')) {
      found = part === '*'
        ? found.flatMap((dir) => readdirSync(join(base, dir), { withFileTypes: true })
          .filter((e) => e.isDirectory()).map((e) => posix.join(dir, e.name)).sort())
        : found.map((dir) => posix.join(dir, part));
    }
    files.push(...found);
  }
  return files;
}

export function collectAnswers(base = root) {
  const unreadable: string[] = [];
  const read = (file: string, label: string) => {
    try {
      return readJson(join(base, file)) as Record<string, DtcgNode>;
    } catch (err) {
      unreadable.push(`${file} cannot be read as ${label}: ${(err as Error).message}`);
      return {};
    }
  };
  const roles = read(posix.join(SOURCE_DIR, 'roles.json'), 'the role file');
  const files = answerFiles(base);
  const walked = files.map((f) => f.split('/').slice(1, -1).join('/'));
  const answers = files.map((file, i) => ({
    name: walked[i] as string,
    tokens: read(file, 'a plugin answer'),
  }));
  const result = answerAxisProblems(roles, tokenAxes(join(base, SOURCE_DIR)), answers);
  return { ...result, problems: [...unreadable, ...result.problems], walked };
}

export function zeroJudgedProblems(count: number) {
  if (count > 0) return [];
  return ['judged 0 plugin answers, so this gate reported nothing wrong with everything; a walk '
    + 'over the answers that judges none is a failure rather than a clean pass'];
}

function main() {
  const { files, found, problems } = collect();
  const answers = collectAnswers();
  const all = [
    ...zeroClassifiedProblems(found.length),
    ...zeroJudgedProblems(answers.judged),
    ...answers.problems,
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
  console.log(`check-user-scale: ${found.length} token(s) across ${files.length} file(s) carry an axis (${counts.join(', ')}); ${answers.judged} alias answer(s) judged over ${answers.walked.length} plugin(s)`);
}

if (isMainModule(import.meta.url)) main();

/* An Angular signal input's write type is what a template may bind, and a boolean one
 * declared without booleanAttribute accepts only true and false. So `<arena-x disabled>`,
 * the bare-attribute spelling every other boolean in the layer answers to, fails to compile
 * on that one input alone, and the difference is invisible until a consumer writes it. The
 * transform is the layer's convention rather than a preference, which is why this reads the
 * declaration rather than trusting it: NOT_AN_ATTRIBUTE names the inputs that are boolean by
 * type and are not attributes, each with its reason, and an entry that stops being needed
 * fails here rather than sitting unread. */

import { readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { lineOf } from '../../utils/text.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { splitArguments } from './check-assertions.ts';

export const COMPONENT_ROOT = 'frameworks/angular/components';

export const node = {
  name: 'check:boolean-inputs',
  reads: [`${COMPONENT_ROOT}/**/*.ts`, `!${COMPONENT_ROOT}/**/*.test.ts`, `!${COMPONENT_ROOT}/**/*.generated.ts`],
  writes: [],
  feeds: [],
};

export const NOT_AN_ATTRIBUTE = new Map([
  ['ArenaIconButton.pressed',
   'a tri-state rather than a toggle: undefined means the control is not a toggle at all and '
   + 'draws no aria-pressed, which is a third answer booleanAttribute cannot carry, since it '
   + 'resolves an absent value to false and would make every icon button a released toggle.'],
]);

export const INPUT_DECLARATION = /readonly\s+([A-Za-z_$][\w$]*)\s*=\s*input(\.required)?\s*(<[^<>]*>)?\s*\(/g;

export function isBooleanInput(generic: string, args: string[]) {
  if (/^<\s*boolean\b/.test(generic)) return true;
  const first = (args[0] ?? '').trim();
  return first === 'true' || first === 'false';
}

export function carriesTransform(args: string[]) {
  return args.some((argument) => /transform\s*:\s*booleanAttribute\b/.test(argument));
}

export function sourceFiles(root: string) {
  return walkFiles(root)
    .filter((path) => path.endsWith('.ts') && !path.includes('.test.') && !path.includes('.generated.'))
    .sort();
}

export function booleanInputProblems(
  files: string[],
  read: (path: string) => string,
  exempt = NOT_AN_ATTRIBUTE,
) {
  const problems = [];
  const claimed = new Set();
  let found = 0;

  for (const file of files) {
    const source = read(file);
    const component = basename(file, '.ts');
    INPUT_DECLARATION.lastIndex = 0;
    let match;

    while ((match = INPUT_DECLARATION.exec(source)) !== null) {
      const parsed = splitArguments(source, match.index + match[0].length - 1);
      if (!parsed) continue;
      INPUT_DECLARATION.lastIndex = parsed.end;

      const [member = '', , generic = ''] = match.slice(1);
      if (!isBooleanInput(generic, parsed.args)) continue;
      found += 1;

      const key = `${component}.${member}`;
      if (carriesTransform(parsed.args)) {
        if (exempt.has(key)) {
          claimed.add(key);
          problems.push(
            `${file}:${lineOf(source, match.index)}: ${key} carries booleanAttribute and is also `
            + 'named in NOT_AN_ATTRIBUTE. A record of an exception that is not one is a record '
            + 'that answers the next reader wrongly',
          );
        }
        continue;
      }
      if (exempt.has(key)) {
        claimed.add(key);
        continue;
      }
      problems.push(
        `${file}:${lineOf(source, match.index)}: ${key} is a boolean input without `
        + 'transform: booleanAttribute, so a bare attribute does not compile against it while it '
        + 'does against every other boolean in the layer. Add the transform, or name it in '
        + 'NOT_AN_ATTRIBUTE with the reason it takes no attribute',
      );
    }
  }

  for (const key of exempt.keys()) {
    if (claimed.has(key)) continue;
    problems.push(
      `NOT_AN_ATTRIBUTE names ${key}, which is no longer a boolean input this gate reads. `
      + 'A stale exemption is worse than none, because it reads as a decision somebody made '
      + 'about code that is there',
    );
  }

  if (found === 0) {
    problems.push(
      `found 0 boolean input(s) under ${COMPONENT_ROOT}. An empty result set is a failure, not a `
      + 'clean pass: a gate iterating nothing reports nothing wrong with everything.',
    );
  }
  return { problems, found };
}

function main() {
  const root = join(repoRoot, COMPONENT_ROOT);
  const files = sourceFiles(root).map((path) => relative(repoRoot, path));
  const { problems, found } = booleanInputProblems(
    files,
    (rel: string) => readFileSync(join(repoRoot, rel), 'utf8'),
  );
  if (problems.length) {
    console.error(`check-boolean-inputs: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-boolean-inputs: ${found} boolean input(s) across ${files.length} source(s) take a bare `
    + `attribute, bar ${NOT_AN_ATTRIBUTE.size} that is not one`,
  );
}

if (isMainModule(import.meta.url)) main();

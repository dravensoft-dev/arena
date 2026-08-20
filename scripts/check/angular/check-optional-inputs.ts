/* A signal input's WRITE type is what a template may bind, and for a defaulted input it is the
 * value's own type: undefined is not in it. So where React omits an optional prop, an Angular
 * consumer has to restate the default the component already owns, in a second place where it can
 * drift, and Arena is a library of optional members. The remedy is a transform resolving an absent
 * value back to the default, and it spells that default TWICE, only one of which runs for any
 * given caller: the transform never fires for an input nobody bound, so a bare element reads the
 * initial value and a bound-but-absent one reads the fallback. So this holds both halves, that a
 * defaulted input resolves an absence at all and that its two spellings are the same text. The
 * fallback is read off the `value ?? X` shape alone, because a transform doing arithmetic has no
 * fallback text to compare and a guess would report a disagreement that is not one. */

import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { lineOf } from '../../utils/text.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { splitArguments } from './check-assertions.ts';
import { COMPONENT_ROOT, INPUT_DECLARATION, sourceFiles } from './check-boolean-inputs.ts';

export const node = {
  name: 'check:optional-inputs',
  reads: [
    `${COMPONENT_ROOT}/**/*.ts`,
    `!${COMPONENT_ROOT}/**/*.test.ts`,
    `!${COMPONENT_ROOT}/**/*.generated.ts`,
  ],
  writes: [],
  feeds: [],
};

export const TAKES_NO_ABSENCE = new Map<string, string>([]);

const RESOLVES = /transform\s*:\s*\(\s*([A-Za-z_$][\w$]*)\s*(?::[^)]*)?\)\s*=>\s*\1\s*\?\?\s*([\s\S]*)$/;

export function resolvedFallback(options: string) {
  const found = RESOLVES.exec(options.trim());
  if (!found) return null;
  return (found[2] ?? '').replace(/[\s,}]+$/, '').trim();
}

export function optionalInputProblems(
  files: string[],
  read: (path: string) => string,
  exempt = TAKES_NO_ABSENCE,
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

      const [member = '', required] = match.slice(1);
      const value = (parsed.args[0] ?? '').trim();
      if (required || value === '') continue;
      found += 1;

      const key = `${component}.${member}`;
      const carries = parsed.args.some((argument) => /transform\s*:/.test(argument));
      if (carries) {
        const fallback = resolvedFallback(parsed.args.slice(1).join(','));
        if (fallback !== null && fallback !== value) {
          problems.push(
            `${file}:${lineOf(source, match.index)}: ${key} declares its default twice and the two `
            + `disagree -- the initial value is ${value} and the transform resolves an absent one `
            + `to ${fallback}. The transform never runs for an input nobody bound, so a consumer `
            + `who writes the element bare reads the initial value and one who binds an absent `
            + 'value reads the fallback, and the component answers the same markup two ways',
          );
        }
        if (!exempt.has(key)) continue;
        claimed.add(key);
        problems.push(
          `${file}:${lineOf(source, match.index)}: ${key} resolves an absent value and is also `
          + 'named in TAKES_NO_ABSENCE. A record of an exception that is not one answers the next '
          + 'reader wrongly',
        );
        continue;
      }
      if (exempt.has(key)) {
        claimed.add(key);
        continue;
      }
      problems.push(
        `${file}:${lineOf(source, match.index)}: ${key} has a default and no transform, so its `
        + 'write type excludes undefined and a consumer holding an optional value has to restate '
        + `that default themselves. Add { transform: (value) => value ?? ${value} }, or name it in `
        + 'TAKES_NO_ABSENCE with the reason an absence must not resolve',
      );
    }
  }

  for (const key of exempt.keys()) {
    if (claimed.has(key)) continue;
    problems.push(
      `TAKES_NO_ABSENCE names ${key}, which is no longer a defaulted input this gate reads. `
      + 'A stale exemption is worse than none, because it reads as a decision somebody made about '
      + 'code that is there',
    );
  }

  if (found === 0) {
    problems.push(
      `found 0 defaulted input(s) under ${COMPONENT_ROOT}. An empty result set is a failure, not a `
      + 'clean pass: a gate iterating nothing reports nothing wrong with everything.',
    );
  }
  return { problems, found };
}

function main() {
  const root = join(repoRoot, COMPONENT_ROOT);
  const files = sourceFiles(root).map((path) => relPosix(repoRoot, path));
  const { problems, found } = optionalInputProblems(
    files,
    (rel: string) => readFileSync(join(repoRoot, rel), 'utf8'),
  );
  if (problems.length) {
    console.error(`check-optional-inputs: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-optional-inputs: ${found} defaulted input(s) take an absent value and resolve it, `
    + `bar ${TAKES_NO_ABSENCE.size} that must not`,
  );
}

if (isMainModule(import.meta.url)) main();

/* Two generated files may not declare the same custom property on the same selector. A role named
 * ls-label was once added beside the ls.label scale step: both files stayed in sync with their
 * own sources so check:tokens passed twice over, and effects.generated.css loads after
 * typography.generated.css, so the role silently overwrote the step and every use of
 * tracking-label moved from 0.22em to 0.14em with nothing saying so.
 * The rule is therefore a naming rule as much as an emission one: a role never borrows a scale's
 * prefix, because the collision only appears the day the scale grows a step with the same name.
 * That is why the tracking roles are track-* and the size roles step-*, not ls-* and fs-*.
 * It reads the emitted CSS rather than the sources, because each source looks fine on its own and
 * the emitted name is the only place the two meet. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { CSS_TARGETS } from '../../generate/arena/generate-tokens.ts';

export const node = {
  name: 'check:token-collisions',
  reads: CSS_TARGETS,
  writes: [],
  feeds: [],
};

export function declarationsByFile(files: { file: string; css: string }[]) {
  const seen = new Map<string, string[]>();
  for (const { file, css } of files) {
    for (const [selector, decls] of parseDecls(css) as Map<string, Map<string, string>>) {
      for (const name of decls.keys()) {
        const key = `${selector} --${name}`;
        seen.set(key, [...(seen.get(key) ?? []), file]);
      }
    }
  }
  return seen;
}

export function collisionProblems(files: { file: string; css: string }[]) {
  const errs: string[] = [];
  for (const [key, sources] of declarationsByFile(files)) {
    const distinct = [...new Set(sources)];
    if (distinct.length < 2) continue;
    const cut = key.lastIndexOf(' --');
    const where = key.slice(0, cut);
    const name = key.slice(cut + 1);
    errs.push(`${name} is declared on ${where} by ${distinct.join(' and ')}. Source order decides `
      + 'which one a page gets, so one of them is silently overwriting the other. A role and a '
      + 'scale step that share a name are the usual cause: give the role its own prefix.');
  }
  return errs.sort();
}

function main() {
  const files = CSS_TARGETS.map((target) => ({
    file: target.split('/').pop() ?? target,
    css: readFileSync(join(root, target), 'utf8'),
  }));
  const errs = collisionProblems(files);
  if (errs.length) {
    console.error(`check-token-collisions: ${errs.length} property declared by more than one file\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  const total = declarationsByFile(files).size;
  console.log(`check-token-collisions: ${total} declaration(s) across ${files.length} generated file(s), each declared once`);
}

if (isMainModule(import.meta.url)) main();

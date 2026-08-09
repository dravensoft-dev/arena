/* Fails when the same module-level named numeric constant is declared in BOTH
 * framework layers. Module-level-in-both is narrower than "duplicated": a design value declared
 * in ONE layer, and a constant declared inside a function body in EITHER, both escape. The two
 * layers do not share an idiom for where a design number lives, so that happens often.
 * Generated output is out of scope, because it is one declaration rather than two: a file a
 * script writes into every layer cannot drift between them, and the gate that holds it equal to
 * its single source is the one that would notice if it did. */

import { readFileSync, existsSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { captured } from '../../utils/captures.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const node = {
  name: 'check:duplicate-constants',
  reads: [
    'frameworks/react/**', 'frameworks/angular/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};


const EXEMPT = new Map([
  ['SSR_VIEWPORT_H',
   'Not a design value and so not a token: it stands in for window.innerHeight where there is no '
   + 'window, which is a rendering assumption rather than a decision anybody made. Both layers need '
   + 'the same stand-in for the same reason, and authoring it in contracts/design/ would put a '
   + 'number nobody chose into the Overview beside values that were chosen. ArenaOnboarding is the one '
   + 'component that compares against viewport HEIGHT; the reserve it subtracts IS a token '
   + '(--onboarding-height-reserve).'],
  ['NARROW_WIDTH',
   'A test fixture width, and only ever that: it is the container size a suite reports through a '
   + 'stubbed ResizeObserver so a responsive branch can be reached at all, since happy-dom has one '
   + 'that never fires. It is not a decision anybody made about layout, and the number that IS the '
   + 'decision is the breakpoint the branch compares against, which is a token both layers read. '
   + 'The suites deliberately do not agree on it either, since a value below the threshold is the '
   + 'whole requirement, so drift between the layers costs nothing here.'],
]);

export function numericConstants(source: string) {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/gm;
  for (const m of source.matchAll(re)) {
    const raw = captured(m, 2).replace(/\s*as\s+const\s*$/, '').trim();
    if (/^-?\d+(\.\d+)?$/.test(raw)) { found.set(captured(m), raw); continue; }
    if (/^\{[^{}]*\}$/.test(raw)) {
      const body = raw.slice(1, -1).trim();
      if (body && /^([\w$]+\s*:\s*-?\d+(\.\d+)?\s*,?\s*)+$/.test(body)) {
        found.set(captured(m), `{${body.replace(/\s+/g, '').replace(/,$/, '')}}`);
      }
    }
  }
  return found;
}

const SCAN_EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist']);

export function sourceFiles(dir: string): string[] {
  const emitted = emittedTree();
  return walkFiles(dir, { skip: (name, path) => SKIP_DIRS.has(name) || path === emitted })
    .filter((path) => {
      const name = basename(path);
      if (!SCAN_EXT.has(extname(name)) || name.includes('.generated.')) return false;
      return !(extname(name) === '.js' && existsSync(path.replace(/\.js$/, '.jsx')));
    });
}

function collect() {

  const byName = new Map();
  for (const layer of ['react', 'angular']) {
    const dir = join(root, 'frameworks', layer);
    for (const path of sourceFiles(dir)) {
      for (const [name, value] of numericConstants(readFileSync(path, 'utf8'))) {
        if (!byName.has(name)) byName.set(name, new Map());
        const layers = byName.get(name);
        if (!layers.has(layer)) layers.set(layer, []);
        layers.get(layer).push({ file: relPosix(root, path), value });
      }
    }
  }

  const problems = [];
  const hit = new Set();

  for (const [name, layers] of byName) {
    if (layers.size < 2) continue;
    hit.add(name);
    if (EXEMPT.has(name)) continue;
    const where = [...layers].map(([layer, decls]) =>
      decls.map((d: { file: string; value: string }) => `${d.file} = ${d.value}`)
        .join(', ')).join('  and  ');
    problems.push(`${name}: declared in both layers — ${where}\n    Author it in contracts/design/ with the script flag instead.`);
  }

  for (const name of EXEMPT.keys()) {
    if (!hit.has(name)) {
      problems.push(`EXEMPT entry "${name}" is stale — it is no longer declared in both layers. Remove it.`);
    }
  }

  return problems;
}

function main() {
  const problems = collect();
  if (problems.length) {
    console.error(`check-duplicate-constants: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  const exempt = EXEMPT.size;
  console.log(
    exempt === 0
      ? 'check-duplicate-constants: no numeric constant is declared in both framework layers'
      : `check-duplicate-constants: no numeric constant is declared in both framework layers except ${exempt} named in EXEMPT with a reason`,
  );
}

if (isMainModule(import.meta.url)) main();

/* Builds inside drifts() and not at module top level, because the graph collects a node's
 * declaration by importing the script that carries it, and a top-level await runs the whole
 * comparison the moment an import reaches this file. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAll, buildBreakpointTheme, BREAKPOINT_TARGET } from '../../generate/arena/generate-tokens.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:tokens',
  reads: ['contracts/design/*.json', 'contracts/design-generated/*.generated.css', BREAKPOINT_TARGET],
  writes: [],
  feeds: [],
};

export function fileDrift(name: string, css: string, committed: string | null) {
  const expected = parseDecls(css);
  if (committed === null) return [`contracts/design-generated/${name}: missing — run bun run generate:tokens`];

  const actual = parseDecls(committed);
  const drift = [];
  for (const [selector, decls] of expected) {
    const found = actual.get(selector);
    if (!found) { drift.push(`contracts/design-generated/${name}: missing selector ${selector}`); continue; }
    for (const [prop, value] of decls) {
      if (!found.has(prop)) drift.push(`contracts/design-generated/${name} ${selector}: missing --${prop}`);
      else if (found.get(prop) !== value)
        drift.push(`contracts/design-generated/${name} ${selector}: --${prop} is "${found.get(prop)}", generated "${value}"`);
    }
    for (const prop of found.keys())
      if (!decls.has(prop)) drift.push(`contracts/design-generated/${name} ${selector}: --${prop} is committed but no longer generated`);
  }
  for (const selector of actual.keys())
    if (!expected.has(selector)) drift.push(`contracts/design-generated/${name}: committed selector ${selector} is no longer generated`);
  return drift;
}

const readOrNull = (path: string) => {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
};

export async function drifts() {
  const built = await buildAll();
  const drift = [...built].flatMap(([name, css]: [string, string]) =>
    fileDrift(name, css, readOrNull(join(root, 'contracts', 'design-generated', name))));

  const breakpoints = await buildBreakpointTheme();
  const committed = readOrNull(join(root, BREAKPOINT_TARGET));
  if (committed === null)
    drift.push(`${BREAKPOINT_TARGET}: missing — Theme.css imports it, so the preset compiles to nothing without it`);
  else if (committed !== breakpoints)
    drift.push(`${BREAKPOINT_TARGET}: stale — the Tailwind breakpoint literals no longer match the bp tokens`);

  return { drift, files: built.size + 1 };
}

async function main() {
  const { drift, files } = await drifts();
  if (drift.length) {
    console.error(`check-tokens-generated: ${drift.length} drift(s) between contracts/design/ and the generated CSS\n`);
    for (const d of drift) console.error(`  ${d}`);
    console.error('\nRun: bun run generate:tokens');
    process.exit(1);
  }
  console.log(`check-tokens-generated: ${files} file(s) in sync with contracts/design/`);
}

if (isMainModule(import.meta.url)) await main();

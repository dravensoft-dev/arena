/* Holds every prompt's two generated regions equal to a fresh emit. A prompt is the consumer's
 * last stop, and the rest of it is hand-written prose no gate can judge; these are the parts
 * something can hold. @api comes from the component's contract, so a member renamed, retyped or
 * given a new default surfaces as a stale table rather than as silence, and the fix is always the
 * contract and then bun run generate:api, never the table. @rules is the note pointing back at
 * the router, owed to every prompt whether contracted or not: it is the last stop's only path
 * back to the rules, and a prompt that has lost it is a page an agent can read to the end and
 * drift off. Whether a component is contracted at all is check:api's question, so an uncontracted
 * one is counted here rather than failed. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { loadContract } from '../../generate/arena/generate-skills.ts';
import {
  renderRegion, renderRulesRegion, promptPaths,
  OPEN_LINE, CLOSE_LINE, RULES_OPEN_LINE, RULES_CLOSE_LINE,
} from '../../generate/arena/generate-prompt-api.ts';

export const node = {
  name: 'check:prompts',
  reads: [
    'contracts/api/components', 'frameworks/Components.json',
    'frameworks/react/components/**/*.prompt.md', 'frameworks/angular/components/**/*.prompt.md',
  ],
  writes: [],
  feeds: [],
};


export function sliceRegion(source: string, open: RegExp, close: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => open.test(line));
  if (opensAt === -1) return null;
  const closesAt = lines.indexOf(close, opensAt);
  if (closesAt === -1) return null;
  return lines.slice(opensAt, closesAt + 1).join('\n');
}

export function regionOf(source: string) {
  return sliceRegion(source, OPEN_LINE, CLOSE_LINE);
}

export function rulesRegionOf(source: string) {
  return sliceRegion(source, RULES_OPEN_LINE, RULES_CLOSE_LINE);
}

export function promptProblems(base = root, prompts = promptPaths(base)) {
  const problems = [];
  let held = 0;
  let anchored = 0;
  let uncontracted = 0;

  for (const { component, layer, path } of prompts) {
    const source = readFileSync(join(base, path), 'utf8');

    const anchor = rulesRegionOf(source);
    if (anchor === null) {
      problems.push(`${path}: carries no @rules region, so it is a last stop that names no rule `
        + 'and no way back to the router. Run bun run generate:api, which places one at the foot');
    } else if (anchor !== renderRulesRegion(layer)) {
      problems.push(`${path}: its @rules region is not the note this layer emits. `
        + 'Run bun run generate:api');
    } else {
      anchored += 1;
    }

    const contract = loadContract(component, base);
    if (!contract) { uncontracted += 1; continue; }

    const found = regionOf(source);
    if (found === null) {
      problems.push(`${path}: carries no @api region, and ${component} is contracted. `
        + 'Run bun run generate:api, which places one after the first example');
      continue;
    }
    const expected = renderRegion(contract, layer);
    if (found !== expected) {
      problems.push(`${path}: its @api region does not match the contract. `
        + 'Fix contracts/api/components/' + `${component}.json and run bun run generate:api`);
      continue;
    }
    held += 1;
  }

  return {
    problems, held, anchored, uncontracted, scanned: prompts.length,
  };
}

export function zeroScanProblems(scanned: number) {
  return scanned === 0
    ? ['found no .prompt.md at all, so this gate compared nothing against nothing']
    : [];
}

function main() {
  const {
    problems, held, anchored, uncontracted, scanned,
  } = promptProblems();
  const all = [...zeroScanProblems(scanned), ...problems];
  if (all.length > 0) {
    for (const problem of all) console.error(`check-prompts: ${problem}`);
    console.error(`\ncheck-prompts: ${all.length} problem(s)`);
    process.exit(1);
  }
  console.log(
    `check-prompts: ${held} prompt(s) carry an @api region equal to their contract, `
    + `${anchored} point back at the router`
    + (uncontracted > 0 ? `; ${uncontracted} name a component no contract covers` : ''),
  );
}

if (isMainModule(import.meta.url)) main();

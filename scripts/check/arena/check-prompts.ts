/* Holds every prompt's four generated regions equal to a fresh emit. A prompt is the consumer's
 * last stop, and the rest of it is hand-written prose no gate can judge; these are the parts
 * something can hold. @api comes from the component's contract, so a member renamed, retyped or
 * given a new default surfaces as a stale table rather than as silence, and the fix is always the
 * contract and then bun run generate:api, never the table. @answers names the families the component's manifest answers, so a family added to a manifest
 * surfaces as a stale prompt. @keys names the keys the binding's pattern requires. @rules is the note pointing back at
 * the router, owed to every prompt whether contracted or not: it is the last stop's only path
 * back to the rules, and a prompt that has lost it is a page an agent can read to the end and
 * drift off. Whether a component is contracted at all is check:api's question, so an uncontracted
 * one is counted here rather than failed. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { readFamilies } from '../../lib/tailwind/vocabulary.ts';
import { readManifests } from './check-measured-box.ts';
import { loadContract } from '../../generate/arena/generate-skills.ts';
import {
  renderRegion, renderRulesRegion, renderKeysRegion, keysOf, KEYS_OPEN_LINE, KEYS_CLOSE_LINE,
  renderAnswersRegion, answeredFamilies, promptPaths,
  OPEN_LINE, CLOSE_LINE, RULES_OPEN_LINE, RULES_CLOSE_LINE, ANSWERS_OPEN_LINE, ANSWERS_CLOSE_LINE,
  type Family, type Binding, type Pattern,
} from '../../generate/arena/generate-prompt-api.ts';

export const node = {
  name: 'check:prompts',
  reads: [
    'contracts/api/components', 'frameworks/Components.json',
    'frameworks/tailwind/vocabulary', 'frameworks/tailwind/components', 'contracts/behaviour',
    'frameworks/react/components/**/*.behaviour.json', 'frameworks/angular/components/**/*.behaviour.json',
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

export function answersRegionOf(source: string) {
  return sliceRegion(source, ANSWERS_OPEN_LINE, ANSWERS_CLOSE_LINE);
}

export function answersProblem(
  path: string, source: string, component: string, layer: string, answered: Family[],
) {
  const found = answersRegionOf(source);
  if (found === null) {
    return [`${path}: carries no @answers region, so it names no family its component answers. `
      + 'Run bun run generate:api, which places one after the members table'];
  }
  if (found !== renderAnswersRegion(component, layer, answered)) {
    return [`${path}: its @answers region does not match the families ${component}'s manifest answers. `
      + 'Fix the manifest or the family and run bun run generate:api'];
  }
  return [];
}

export function keysProblem(path: string, source: string, binding: Binding | null, patterns: Pattern | Pattern[] | null) {
  const found = sliceRegion(source, KEYS_OPEN_LINE, KEYS_CLOSE_LINE);
  if (found === null) {
    return [`${path}: carries no @keys region, so it names no key its pattern requires. `
      + 'Run bun run generate:api, which places one after the @answers region'];
  }
  if (found !== renderKeysRegion(binding, patterns)) {
    return [`${path}: its @keys region does not match its behaviour binding and pattern. `
      + 'Fix the binding or the pattern and run bun run generate:api'];
  }
  return [];
}

export function promptProblems(base = root, prompts = promptPaths(base)) {
  const problems = [];
  let held = 0;
  let anchored = 0;
  let keyed = 0;
  let uncontracted = 0;
  const families = readFamilies(base);
  const manifests = readManifests(base);

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

    problems.push(...answersProblem(
      path, source, component, layer, answeredFamilies(component, base, families, manifests),
    ));

    const { binding, patterns } = keysOf(path, component, base);
    const keys = keysProblem(path, source, binding, patterns);
    if (keys.length === 0) keyed += 1;
    problems.push(...keys);

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
    problems, held, anchored, keyed, uncontracted, scanned: prompts.length,
  };
}

export function zeroScanProblems(scanned: number) {
  return scanned === 0
    ? ['found no .prompt.md at all, so this gate compared nothing against nothing']
    : [];
}

function main() {
  const {
    problems, held, anchored, keyed, uncontracted, scanned,
  } = promptProblems();
  const all = [...zeroScanProblems(scanned), ...problems];
  if (all.length > 0) {
    for (const problem of all) console.error(`check-prompts: ${problem}`);
    console.error(`\ncheck-prompts: ${all.length} problem(s)`);
    process.exit(1);
  }
  console.log(
    `check-prompts: ${held} prompt(s) carry an @api region equal to their contract, `
    + `${keyed} carry an @keys region equal to their binding, ${anchored} point back at the router`
    + (uncontracted > 0 ? `; ${uncontracted} name a component no contract covers` : ''),
  );
}

if (isMainModule(import.meta.url)) main();

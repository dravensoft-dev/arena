/* Holds everything on the consumer branch that is emitted rather than written equal to a fresh
 * emit: the index tree, frameworks/SKILL.md and one per layer; the router's voice catalogue; and
 * the regions of each npm page that are the same page in both packages. All of them are tracked
 * rather than built, because the plugin is served from the git tag where nothing runs a build, so
 * a stale copy is not a stale artefact: it is a wrong answer handed to every reader of that tag,
 * with every other gate green. Tracking is this gate's to assert because check:generated scans no
 * .md and the ignore pattern over frameworks/ reaches only a .generated. name, so nothing else
 * would notice one falling out of the index. */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { renderTarget, skillTargets, loadCategories } from '../../generate/arena/generate-skills.ts';
import {
  VOICES_TARGET, renderRegion as renderVoices,
  OPEN_LINE as VOICES_OPEN, CLOSE_LINE as VOICES_CLOSE,
} from '../../generate/arena/generate-voices.ts';
import {
  TARGETS as NPM_TARGETS, renderTarget as renderNpmPage,
} from '../../generate/arena/generate-npm-pages.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:skills',
  reads: [
    'contracts/api/components', 'frameworks/Components.json', 'frameworks/SKILL.md',
    'contracts/design/extension.*.json', VOICES_TARGET, ...NPM_TARGETS,
    'frameworks/react/**', 'frameworks/angular/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};

export function voicesRegionOf(source: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => VOICES_OPEN.test(line));
  if (opensAt === -1) return null;
  const closesAt = lines.indexOf(VOICES_CLOSE, opensAt);
  if (closesAt === -1) return null;
  return lines.slice(opensAt, closesAt + 1).join('\n');
}

export function voiceRegionProblems(base = root) {
  const found = voicesRegionOf(readFileSync(join(base, VOICES_TARGET), 'utf8'));
  if (found === null)
    return [`${VOICES_TARGET}: carries no @voices region, so the first decision on the consumer `
      + 'route is made from a catalogue nothing holds to the contracts. Run bun run generate:voices'];
  const expected = renderVoices(base);
  return found === expected
    ? []
    : [`${VOICES_TARGET}: its @voices region does not match contracts/design/extension.*.json, so a `
      + 'reader picks a voice from a catalogue this build does not ship. Fix the contract and run '
      + 'bun run generate:voices'];
}

export function sharedRegionProblems(base = root) {
  const problems = [];
  for (const target of NPM_TARGETS) {
    const before = readFileSync(join(base, target), 'utf8');
    let after;
    try {
      after = renderNpmPage(before, base);
    } catch (error) {
      problems.push(`${target}: ${(error as Error).message}`);
      continue;
    }
    if (after !== before)
      problems.push(
        `${target}: a @shared region does not match a fresh emit. The half of an npm page that is `
        + 'the same page in both packages is written once, in generate-npm-pages.ts, because it was '
        + 'written twice by hand and the two had already drifted. Edit that script and run '
        + 'bun run generate:npm-pages',
      );
  }
  return problems;
}


export function trackingProblems(target: string, tracked: boolean) {
  return tracked
    ? []
    : [`${target}: not tracked by git, so it reaches no clone and no tag. `
      + 'A consumer agent routes through this file, and check:generated cannot catch its absence '
      + 'because it scans no .md.'];
}

function trackedFiles(base: string, targets = skillTargets(base)) {
  const git = hostBinary('git', 'to read what the tree tracks, which is a question only git can answer');
  const { stdout } = spawnSync(git, ['ls-files', ...targets], { cwd: base, encoding: 'utf8' });
  return new Set((stdout ?? '').split('\n').filter(Boolean));
}

export function firstDifference(expected: string, actual: string) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      return `line ${i + 1}: committed ${JSON.stringify(b[i] ?? '(end of file)')}, generated ${JSON.stringify(a[i] ?? '(end of file)')}`;
    }
  }
  return null;
}

export function zeroDeclarationProblems(componentCount: number) {
  return componentCount === 0
    ? ['frameworks/Components.json declared no component, so this gate compared an index of nothing against an index of nothing']
    : [];
}

export function skillProblems(base = root, tracked = trackedFiles(base)) {
  const targets = skillTargets(base);
  const declared = Object.values(loadCategories(base)).flat().length;
  const problems = [
    ...zeroDeclarationProblems(declared),
    ...voiceRegionProblems(base),
    ...sharedRegionProblems(base),
  ];

  for (const target of targets) {
    problems.push(...trackingProblems(target, tracked.has(target)));

    const expected = renderTarget(target, base);
    let actual;
    try {
      actual = readFileSync(join(base, target), 'utf8');
    } catch {
      problems.push(`${target}: missing, and the git tag hands this file to a reader directly`);
      continue;
    }
    if (expected !== actual) problems.push(`${target}: stale, ${firstDifference(expected, actual)}`);
  }

  return { problems, declared, emitted: targets.length };
}

function main() {
  const { problems, declared, emitted } = skillProblems();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-skills: ${problem}`);
    console.error('\nA stale index is fixed by bun run generate:skills; the others say their own fix.');
    process.exit(1);
  }
  console.log(
    `check-skills: ${emitted} index page(s), the router's voice catalogue and `
    + `${NPM_TARGETS.length} npm page(s) match a fresh emit over ${declared} declared component(s)`,
  );
}

if (isMainModule(import.meta.url)) main();

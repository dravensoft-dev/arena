/* Six modules are authored once per layer at the same path, and nothing held any of them
 * together: two are byte-identical today and four have drifted apart in their type shapes while
 * their algorithms stayed the same. A calendar whose layers disagree by arithmetic renders two
 * different schedules from one set of events, and no other gate can see it, because
 * check:duplicate-constants reads module-level NUMBERS and an exported function is invisible to
 * it. This compares the BODY of every function the two copies export under one name, normalised
 * for whitespace, and DIVERGENT carries the ones that legitimately differ with the reason. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:shared-arithmetic',
  reads: [
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/react/*.ts', 'frameworks/angular/*.ts',
  ],
  writes: [],
  feeds: [],
};


export const PAIRED = [
  'AnchorActivation.ts',
  'WarnOnce.ts',
  'ToastClock.ts',
  'DataVisuals.ts',
  'components/charts/ChartScales.ts',
  'components/charts/ChartMarks.ts',
  'components/charts/ChartAxis.ts',
  'components/charts/ChartLegend.ts',
  'components/charts/ChartTooltip.ts',
  'components/charts/ChartSeries.ts',
  'components/charts/ChartPointer.ts',
  'components/charts/ChartPolar.ts',
  'components/display/arena-calendar/CalendarInternals.ts',
  'components/navigation/arena-pagination/PaginationWindow.ts',
];

export const DIVERGENT = new Map([
  ['components/display/arena-calendar/CalendarInternals.ts:arenaAddDays',
   'the same UTC day step; one hands arenaIsoDateOf a date and the other the full parts shape its own '
   + 'arenaIsoDateOf takes, which is why the zero hour and minute appear on one side only.'],
  ['components/display/arena-calendar/CalendarInternals.ts:arenaPlaceEvents',
   'the same walk over the same two parsed instants, differing only in the type it accepts: one '
   + 'layer takes the chip\'s own props and the other a readonly EventTimes, because each layer\'s '
   + 'caller holds a different object. The parse and the day-boundary clamp, which is what decides '
   + 'a placement, are identical.'],
  ['components/display/arena-calendar/CalendarInternals.ts:arenaLayoutDay',
   'identical lane assignment; one signature is generic over the event and the other over the '
   + 'placement, which is the same difference one line up.'],
  ['components/display/arena-calendar/CalendarInternals.ts:arenaZonedParts',
   'the same parse; one accepts null in addition to undefined, because its caller can hold one.'],
  ['components/display/arena-calendar/CalendarInternals.ts:arenaRangeTitle',
   'the same title over the same formatter; one takes a readonly array.'],
  ['components/display/arena-calendar/CalendarInternals.ts:arenaParseHM',
   'the same parse, over a local pad helper the two layers name differently.'],
  ['components/navigation/arena-pagination/PaginationWindow.ts:arenaPageWindow',
   'the same window: first, last, a run around the current page and an ellipsis where a gap is '
   + 'skipped. One writes the ellipsis as a literal and the other as a named constant of its own '
   + 'PageSlot type, so what differs is how the gap is spelt, not where one falls.'],
]);

export function normalise(body: string) {
  return body.replace(/\s+/g, ' ').trim();
}

export function exportedFunctions(source: string) {
  const found = new Map();
  const re = /^export function (\w+)[\s\S]*?^\}/gm;
  for (const match of source.matchAll(re)) {
    const whole = match[0];
    const open = whole.indexOf('{');
    found.set(match[1], normalise(whole.slice(open)));
  }
  return found;
}

export function pairProblems(
  rel: string, react: Map<string, string>, angular: Map<string, string>, divergent = DIVERGENT,
) {
  const problems = [];
  const claimed: string[] = [];
  const shared = [...react.keys()].filter((name) => angular.has(name)).sort();
  if (shared.length === 0) {
    problems.push(`${rel}: the two copies export no function under the same name, so this pair `
      + 'compares nothing; either the file moved or the entry is stale');
    return { problems, claimed };
  }
  for (const name of shared) {
    const key = `${rel}:${name}`;
    const same = react.get(name) === angular.get(name);
    if (divergent.has(key)) {
      claimed.push(key);
      if (same) {
        problems.push(`${key}: DIVERGENT names it and the two bodies are identical now — delete the `
          + 'entry, because an exception that has stopped being true is what this map exists to catch');
      }
      continue;
    }
    if (!same) {
      problems.push(`${key}: the two layers' copies of this function have drifted apart. One source, `
        + 'two hand-kept copies, and nothing but this gate reads both.');
    }
  }
  return { problems, claimed };
}

export function collect(base = root, paired = PAIRED, divergent = DIVERGENT) {
  const problems = [];
  const claimed = [];
  let compared = 0;
  for (const rel of paired) {
    const react = join(base, 'frameworks/react', rel);
    const angular = join(base, 'frameworks/angular', rel);
    if (!existsSync(react) || !existsSync(angular)) {
      problems.push(`${rel}: PAIRED names it and it does not exist in both layers`);
      continue;
    }
    const found = pairProblems(rel,
      exportedFunctions(readFileSync(react, 'utf8')),
      exportedFunctions(readFileSync(angular, 'utf8')),
      divergent);
    problems.push(...found.problems);
    claimed.push(...found.claimed);
    compared += 1;
  }
  if (compared === 0) {
    problems.push('compared 0 pairs — an empty result set is a failure rather than a clean pass');
  }
  return { problems, claimed, compared };
}

export function staleEntries(claimed: string[], divergent = DIVERGENT) {
  const seen = new Set(claimed);
  return [...divergent.keys()]
    .filter((key) => !seen.has(key))
    .map((key) => `DIVERGENT names ${key}, and no pair exports a function under that name`);
}

function main() {
  const { problems, claimed, compared } = collect();
  problems.push(...staleEntries(claimed));
  if (problems.length > 0) {
    console.error(`check-shared-arithmetic: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-shared-arithmetic: ${compared} module(s) authored in both layers agree on every `
    + `function they share, ${DIVERGENT.size} declared with a reason`);
}

if (isMainModule(import.meta.url)) main();

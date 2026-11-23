/* Modules are authored once per layer at the same path. Those the gate holds to one text, up to
 * a relative specifier's extension (React spells `.ts` or `.js`, Angular's resolver forbids
 * both), are tested once, in React: this gate is what holds the Angular copy to that suite.
 * BODIES_ONLY names the ones that differ as files, each with its reason. The body of every
 * function both copies export under one name is compared for all of them, normalised for
 * whitespace, and DIVERGENT carries the bodies that legitimately differ. An exception that has
 * stopped being true fails, so neither map outlives the difference it records. */

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
  'TypeAhead.ts',
  'Phrase.ts',
  'ArenaLocale.ts',
  'DataVisuals.ts',
  'StructuredData.ts',
  'AnchoredPanel.ts',
  'Thresholds.ts',
  'RowWindowMeasure.ts',
  'components/charts/ChartScales.ts',
  'components/charts/ChartMarks.ts',
  'components/charts/ChartAxis.ts',
  'components/charts/ChartLegend.ts',
  'components/charts/ChartTooltip.ts',
  'components/charts/ChartSeries.ts',
  'components/charts/ChartPointer.ts',
  'components/charts/ChartPolar.ts',
  'components/forms/NumberRules.ts',
  'components/feedback/arena-tooltip/TooltipName.ts',
  'components/forms/arena-combobox/ComboboxRules.ts',
  'components/display/arena-calendar/CalendarInternals.ts',
  'components/navigation/arena-pagination/PaginationWindow.ts',
  'components/display/arena-table/TableWindow.ts',
  'components/navigation/TreeModel.ts',
  'components/forms/arena-file-input/FileRules.ts',
  'components/forms/arena-pin-input/PinRules.ts',
  'components/navigation/arena-link/LinkRules.ts',
  'components/navigation/arena-filter-bar/FilterBarFocus.ts',
  'components/feedback/arena-meter/MeterStanding.ts',
  'components/navigation/arena-stepper/StepperState.ts',
  'components/display/arena-timeline/TimelineGlyphs.ts',
  'RootScale.ts',
];

export const BODIES_ONLY = new Map([
  ['ArenaLocale.ts',
   'the binding to each framework\'s provider: a React context with its provider component and hook '
   + 'against an Angular InjectionToken with a provide function, over the same merge of the locale.'],
  ['DataVisuals.ts',
   'the screen-reader-only style is spelt in each layer\'s own style type, arenaSrOnly with numeric '
   + 'React values against ARENA_SR_ONLY with strings, and arenaRailStyle returns each layer\'s style type.'],
  ['components/charts/ChartSeries.ts',
   'arenaSwatchHue against arenaSwatchChoice: the swatch answer each layer\'s legend binds, '
   + 'a tone or colour id object against the Angular selection type, over the same rules.'],
  ['components/display/arena-calendar/CalendarInternals.ts',
   'the DIVERGENT entries\' signatures, plus local names, a helper spelt as an arrow against a '
   + 'function and the import lines each layer needs, over the same calendar arithmetic.'],
  ['components/navigation/arena-pagination/PaginationWindow.ts',
   'the gap is spelt as a literal in React against a named ELLIPSIS and its PageSlot type in '
   + 'Angular, so what differs is how the gap is spelt, not where one falls.'],
]);

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

const RELATIVE_EXT = String.raw`(?<q>['"])(?<path>\.\.?\/[^'"\n]*?)\.(?:tsx?|js)\k<q>`;
const SPECIFIER_FORMS = [
  new RegExp(String.raw`(^[ \t]*(?:import|export)\b[^;'"]*?\bfrom\s*)${RELATIVE_EXT}`, 'gm'),
  new RegExp(String.raw`(^[ \t]*import\s*)${RELATIVE_EXT}`, 'gm'),
  new RegExp(String.raw`(\bimport\s*\(\s*)${RELATIVE_EXT}`, 'g'),
];

export function normaliseSpecifiers(source: string) {
  let out = source;
  for (const form of SPECIFIER_FORMS) out = out.replace(form, '$1$<q>$<path>$<q>');
  return out;
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

export function fileProblems(rel: string, react: string, angular: string, bodiesOnly = BODIES_ONLY) {
  const a = normaliseSpecifiers(react);
  const b = normaliseSpecifiers(angular);
  const same = a === b;
  if (bodiesOnly.has(rel)) {
    return same
      ? [`${rel}: BODIES_ONLY names it and the two copies are one text now — delete the entry`]
      : [];
  }
  if (same) return [];
  const [x, y] = [a.split('\n'), b.split('\n')];
  let line = 0;
  while (line < x.length && line < y.length && x[line] === y[line]) line += 1;
  return [`${rel}: the two copies differ at line ${line + 1} of the normalised text. This module is `
    + 'tested once, in React, so a drift is untested in the other layer; make them one text, or '
    + 'declare it in BODIES_ONLY with the reason'];
}

export function collect(
  base = root, paired = PAIRED, divergent = DIVERGENT, bodiesOnly = BODIES_ONLY,
) {
  const problems = [];
  const claimed = [];
  let compared = 0;
  let oneText = 0;
  for (const rel of paired) {
    const react = join(base, 'frameworks/react', rel);
    const angular = join(base, 'frameworks/angular', rel);
    if (!existsSync(react) || !existsSync(angular)) {
      problems.push(`${rel}: PAIRED names it and it does not exist in both layers`);
      continue;
    }
    const reactSource = readFileSync(react, 'utf8');
    const angularSource = readFileSync(angular, 'utf8');
    const whole = fileProblems(rel, reactSource, angularSource, bodiesOnly);
    problems.push(...whole);
    if (whole.length === 0 && !bodiesOnly.has(rel)) oneText += 1;
    const found = pairProblems(rel,
      exportedFunctions(reactSource),
      exportedFunctions(angularSource),
      divergent);
    problems.push(...found.problems);
    claimed.push(...found.claimed);
    compared += 1;
  }
  if (compared === 0) {
    problems.push('compared 0 pairs — an empty result set is a failure rather than a clean pass');
  }
  return { problems, claimed, compared, oneText };
}

export function staleEntries(claimed: string[], divergent = DIVERGENT) {
  const seen = new Set(claimed);
  return [...divergent.keys()]
    .filter((key) => !seen.has(key))
    .map((key) => `DIVERGENT names ${key}, and no pair exports a function under that name`);
}

export function staleBodiesOnly(paired: readonly string[] = PAIRED, bodiesOnly = BODIES_ONLY) {
  return [...bodiesOnly.keys()]
    .filter((key) => !paired.includes(key))
    .map((key) => `BODIES_ONLY names ${key}, and PAIRED does not hold it`);
}

function main() {
  const { problems, claimed, compared, oneText } = collect();
  problems.push(...staleEntries(claimed), ...staleBodiesOnly());
  if (problems.length > 0) {
    console.error(`check-shared-arithmetic: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-shared-arithmetic: ${compared} module(s) authored in both layers agree on every `
    + `function they share, ${oneText} of them one text, ${BODIES_ONLY.size} declared with a reason`);
}

if (isMainModule(import.meta.url)) main();

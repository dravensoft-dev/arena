/* Holds the rule the router already states and nothing held: anything a package ships needs a
 * home on the consumer branch, and for a symbol that home is the layer's PACKAGE.md. A barrel
 * re-exports whole modules, so a helper written for one component reaches the package root beside
 * the components, and the npm page says a symbol it does not name carries no compatibility
 * promise. That pair is worse than either half: the tested focus trap behind a dialog ships,
 * reaches a consumer told to write their own overlay, and is disclaimed by omission, so the
 * consumer writes a second one. INTERNAL declares what reaches the root and is nobody's to lean
 * on, with the reason, and fails both ways. The subject is derived from the barrel rather than
 * listed, and it is what a consumer CALLS: a type is reached through the value whose signature
 * carries it, so naming the hook names its options. */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const PAGE = 'PACKAGE.md';

export const BARRELS = new Map([
  ['react', 'frameworks/react/Index.generated.ts'],
  ['angular', 'frameworks/angular/index.ts'],
]);

const CHART_GEOMETRY = 'the geometry Arena\'s own chart components share between the two layers, '
  + 'authored once and held identical. A consumer reaches a chart component or draws their own '
  + 'SVG entirely, and neither route passes through this';

const THE_DOCUMENTED_SURFACE_IS_ABOVE_IT = 'an implementation detail of a surface the page does '
  + 'name. A consumer reaches the named one and receives this through it';

export const INTERNAL = new Map<string, string>([
  ['arenaWarnOnce', 'the once-per-message warning helper every layer uses to report a caller '
    + 'mistake without flooding a console. A consumer calls nothing here: they receive its output'],
  ['forgetArenaWarnings', 'the test seam that clears what arenaWarnOnce has already said, so a '
    + 'suite can assert the same warning twice. It exists for Arena\'s own suites'],
  ['forgetArenaBreakpoints', 'the same shape for the breakpoint cache, and the same reason'],
  ['arenaReadBreakpoint', 'reads one breakpoint out of the compiled sheet for the hooks above it. '
    + 'A consumer asks the hook rather than the sheet'],
  ['ARENA_PAD', CHART_GEOMETRY],
  ['ARENA_CHART_HEIGHT', CHART_GEOMETRY],
  ['arenaPlotWidth', CHART_GEOMETRY],
  ['arenaRailStyle', CHART_GEOMETRY],
  ['ARENA_RAIL_STYLE', CHART_GEOMETRY],
  ['arenaAreaFill', CHART_GEOMETRY],
  ['arenaValueWriter', CHART_GEOMETRY],
  ['ARENA_INTERACTIVE_DESCENDANT', 'the selector string behind the rule that a press starting on '
    + 'a control inside an activation target keeps to that control. The rule is what a consumer '
    + 'holds; this is how Arena finds the descendants, and a consumer matching on it by hand is '
    + 'writing against a list that moves'],
  ['arenaThemeClass', THE_DOCUMENTED_SURFACE_IS_ABOVE_IT],
  ['ARENA_DEFAULT_THEMES', THE_DOCUMENTED_SURFACE_IS_ABOVE_IT],
  ['arenaToastPersists', THE_DOCUMENTED_SURFACE_IS_ABOVE_IT],
  ['arenaActiveWeight', 'how the Angular layer picks the filled weight of a Phosphor glyph for a '
    + 'selected nav row. A consumer writes the class string themselves and picks their own weight'],
  ['arenaBadgeCount', 'how a nav row renders a count beside its label, capped so a four-digit one '
    + 'does not widen the rail. It belongs to that row rather than to a caller'],
  ['ARENA_WEIGHTS', 'the Phosphor weight class names the layer recognises, which a consumer '
    + 'already types into an icon string directly'],
]);

export const ROOT_MODULE = /^export (?:type )?\* from '\.\/([A-Za-z][A-Za-z0-9]*)(?:\.ts)?';$/gm;

export const EXPORTED = /^export (?:declare )?(?:async )?(?:function|const|class|enum) ([A-Za-z_][A-Za-z0-9_]*)/gm;

export function rootModules(base: string, barrel: string) {
  const text = readFileSync(join(base, barrel), 'utf8');
  const from = dirname(barrel);
  return [...text.matchAll(ROOT_MODULE)]
    .map((match) => `${from}/${match[1]}.ts`)
    .filter((rel) => existsSync(join(base, rel)) && !rel.includes('.generated.'));
}

export function symbolsOf(base: string, rel: string) {
  return [...readFileSync(join(base, rel), 'utf8').matchAll(EXPORTED)].map((match) => match[1] ?? '');
}

export function reachedSymbols(base = root, barrels = BARRELS) {
  const reached = new Map<string, string[]>();
  for (const [layer, barrel] of barrels) {
    if (!existsSync(join(base, barrel))) continue;
    const names = new Set<string>();
    for (const rel of rootModules(base, barrel)) for (const name of symbolsOf(base, rel)) names.add(name);
    reached.set(layer, [...names].sort());
  }
  return reached;
}

export function zeroReachProblems(reached: Map<string, string[]>) {
  const empty = [...reached].filter(([, names]) => names.length === 0).map(([layer]) => layer);
  if (reached.size === 0) return ['no barrel found, so every symbol below is a symbol nobody read'];
  return empty.map((layer) => `${layer}'s barrel reaches 0 symbol(s), so this gate passes it by `
    + 'reading nothing rather than by finding nothing wrong');
}

export function homeProblems(base = root, reached = reachedSymbols(base), internal = INTERNAL) {
  const problems = [];
  for (const [layer, names] of reached) {
    const page = join(base, 'frameworks', layer, PAGE);
    if (!existsSync(page)) continue;
    const text = readFileSync(page, 'utf8');
    for (const name of names) {
      if (internal.has(name) || text.includes(name)) continue;
      problems.push(
        `${name} reaches the root of the ${layer} package and frameworks/${layer}/${PAGE} never `
        + `names it. That page says a symbol it does not name carries no compatibility promise, so `
        + `a consumer who needs this either writes a second one or leans on something Arena has `
        + `told them not to. Name it there, or declare it in INTERNAL with the reason it is `
        + `nobody's to call.`,
      );
    }
  }
  return problems;
}

export function staleInternalProblems(reached = reachedSymbols(), internal = INTERNAL) {
  const all = new Set([...reached.values()].flat());
  return [...internal]
    .filter(([name]) => !all.has(name))
    .map(([name, reason]) => `INTERNAL declares ${name}, which no barrel reaches any more, so the `
      + `declaration outlived what it was written for: ${reason}`);
}

export function collect(base = root) {
  const reached = reachedSymbols(base);
  const zero = zeroReachProblems(reached);
  if (zero.length > 0) return zero;
  return [...homeProblems(base, reached), ...staleInternalProblems(reached)];
}

function main() {
  const problems = collect();
  if (problems.length > 0) {
    console.error(`check-exports: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const reached = reachedSymbols();
  const counted = [...reached].map(([layer, names]) => `${layer} ${names.length}`).join(', ');
  console.log(`check-exports: every symbol a barrel reaches has a home on its npm page (${counted}), `
    + `with ${INTERNAL.size} declared internal`);
}

if (isMainModule(import.meta.url)) main();

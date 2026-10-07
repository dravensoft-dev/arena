/* The steps a run takes beside the theme and the icons: the audit over a consumer's sources, the
 * marker check, the undrawn list, and the component resolution the theme step leans on. Each answers
 * what it found and prints nothing, so the entry decides what is said and what is fatal. The note a
 * run closes the audit with, the parts a style plugin paints, is paintedBy's and not auditStep's. */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toPosix } from './posix.ts';
import { auditText, paintedParts, sourceScope } from './audit.ts';
import type { VocabularyIndex } from './audit.ts';
import { markerProblems } from './markers.ts';
import { restatedFindings, sheetFor } from './restated.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import { AUTO, resolve as resolveComponents } from './components.ts';
import type { ComponentMap } from './components.ts';
import type { ArenaConfig, TokenCatalogue } from './theme-css.ts';
import { pluginTokenMaps } from './sheets.ts';
import { auditFiles, owningPlugin, pluginDirs, readSources, sourceFiles } from './sources.ts';

type StepOptions = { paths: string[]; config: string };

export function reportLines(reports: { palette: string; messages: Report[] }[]) {
  return reports.flatMap(({ palette, messages }) =>
    messages.map((one) => report(one.kind, `${palette}: ${one.message}`)));
}

export function autoComponents(config: ArenaConfig, options: StepOptions,
  map: ComponentMap, packageName: string) {
  const sources = [];
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }

  const found = resolveComponents(map, sources, packageName);
  if (!found) {
    return { fatal: [`"components": "${AUTO}" cannot be read against a map keyed by ${JSON.stringify(map.match)}, `
      + 'which this command does not know how to scan for; name the sheets instead'] };
  }
  if (found.components.length === 0) {
    return { fatal: [`"components": "${AUTO}" found no Arena component under ${options.paths.join(', ')}, `
      + 'so the subset would be empty; point --src at the sources that render them, or name the sheets'] };
  }

  return {
    components: found.components,
    reports: found.unplaced.map((one) => `${one} is not a component this package ships, so no sheet was added for it`),
    note: `${found.drawn.length} component sheet(s) drawn`
      + (found.pulled.length ? `, and ${found.pulled.length} Arena draws for you: ${found.pulled.join(', ')}` : ''),
  };
}

export function gradientMark(options: StepOptions) {
  try {
    return JSON.parse(readFileSync(options.config, 'utf8')).gradientMark === true;
  } catch {
    return false;
  }
}

export function auditStep(
  options: StepOptions, arena: string | null = null, catalogue: TokenCatalogue | null = null,
  vocabulary: VocabularyIndex | null = null,
) {
  const dirs = pluginDirs(options);
  const tokensAt = pluginTokenMaps(dirs, catalogue);
  const declaredMark = gradientMark(options);
  const reports: Report[] = [];
  const painted = new Set<string>();
  let scanned = 0;
  const sheetOf = (part: string) => {
    if (!arena) return null;
    const path = join(arena, 'css', 'components', sheetFor(part));
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  };
  for (const file of auditFiles(options.paths, dirs)) {
    scanned += 1;
    const cited = toPosix(file);
    const text = readFileSync(file, 'utf8');
    const scope = sourceScope(resolve(file), dirs);
    reports.push(...auditText(cited, text, scope, declaredMark, vocabulary).map((line) => report('audit', line)));
    if (scope !== 'plugin') continue;
    for (const part of paintedParts(text)) painted.add(part);
    if (!file.endsWith('.css')) continue;
    const owner = owningPlugin(resolve(file), dirs);
    for (const one of restatedFindings(text, sheetOf, owner ? tokensAt.get(owner) ?? null : null)) {
      reports.push(report('restated', `${cited}: ${one.property} on [data-arena-part="${one.part}"] `
        + `is already ${one.value} on that slot, so the declaration changes nothing. The audit `
        + 'counts a part as painted by reading source text, and a role is grown from that count, '
        + 'so a restatement is evidence for a question nobody asked'));
    }
  }
  return { reports, scanned, painted: [...painted].sort() };
}

export function markersStep(options: StepOptions, map: ComponentMap | null) {
  if (!map?.markers) return { reports: [] as Report[] };
  const files = [];
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) {
      if (!file.endsWith('.ts')) continue;
      files.push({ path: toPosix(file), source: readFileSync(file, 'utf8') });
    }
  }
  return { reports: markerProblems(files, map.markers, map.markerDirectives ?? {})
    .map((line) => report('markers', line)) };
}

export function undrawnStep(options: StepOptions, packageName: string, map: ComponentMap | null) {
  if (!map) {
    return { notes: [] as string[],
      fatal: ['the component map this package carries is not beside this command, so arena usage '
        + 'cannot compare what you draw against what ships'] };
  }
  const found = resolveComponents(map, readSources(options.paths), packageName);
  if (!found) {
    return { notes: [] as string[],
      fatal: [`arena usage cannot read a map keyed by ${JSON.stringify(map.match)}`] };
  }

  const shipped = Object.keys(map.draws).sort();
  const undrawn = shipped.filter((key) => !found.keys.includes(key));
  const notes = [
    `${found.keys.length} of ${shipped.length} shipped component(s) drawn under ${options.paths.join(', ')}`,
  ];
  notes.push(undrawn.length === 0
    ? 'every component this package ships is drawn somewhere'
    : `${undrawn.length} drawn nowhere: ${undrawn.join(', ')}`);
  return { notes, fatal: [] as string[] };
}

export function paintedBy(painted: string[]) {
  const named = painted.length ? `: ${painted.join(', ')}` : '';
  return `your style plugin(s) paint ${painted.length || 'no'} part(s)${named}. `
    + 'A role is added to Arena when several style plugins are measured painting the same decision '
    + 'by hand through the same part, so this note is where the evidence for one comes from';
}

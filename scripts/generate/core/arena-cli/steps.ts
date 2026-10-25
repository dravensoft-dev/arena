/* The steps a run takes beside the theme and the icons: the audit over a consumer's sources, the
 * marker check, the undrawn list, and the component resolution the theme step leans on. Each answers
 * what it found and prints nothing, so the entry decides what is said and what is fatal. The note a
 * run closes the audit with, the parts a style plugin paints, is paintedBy's and not auditStep's. */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toPosix } from './posix.ts';
import { auditFindings, paintedParts, sourceScope, withoutComments, ALLOW_MARKER, PAINTED_PART, group } from './audit.ts';
import { knownParts, nearestName, unknownPart } from './names.ts';
import type { VocabularyIndex } from './audit.ts';
import { markerProblems } from './markers.ts';
import { restatedFindings, sheetFor } from './restated.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import { AUTO, pulledBy, resolve as resolveComponents } from './components.ts';
import type { ComponentMap } from './components.ts';
import type { ArenaConfig, TokenCatalogue } from './theme-css.ts';
import { pluginTokenMaps } from './sheets.ts';
import { auditFiles, owningPlugin, pluginDirs, readSources, sourceFiles } from './sources.ts';

type StepOptions = { paths: string[]; config: string };

export function reportLines(reports: { palette: string; messages: Report[] }[]) {
  return reports.flatMap(({ palette, messages }) =>
    messages.map((one) => report(one.kind, `${palette}: ${one.message}`)));
}

export const drawsForYou = (pulled: string[]) => `${pulled.length} Arena draws for you: ${pulled.join(', ')}`;

export function namedComponents(named: unknown[], map: ComponentMap) {
  const pulled = pulledBy(map.needs, named);
  return {
    components: [...named, ...pulled],
    note: pulled.length ? `${named.length} component sheet(s) named, and ${drawsForYou(pulled)}` : null,
  };
}

export function autoComponents(config: ArenaConfig, options: StepOptions,
  map: ComponentMap, packageName: string, required = true) {
  const sources = [];
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }

  const found = resolveComponents(map, sources, packageName);
  if (!found) {
    return { fatal: [`"components": "${AUTO}" cannot be read against a map keyed by ${JSON.stringify(map.match)}, `
      + 'which this command does not know how to scan for; name the sheets instead'] };
  }
  const reports = found.unplaced.map((one) => `${one} is not a component this package ships, so no sheet was added for it`);
  if (found.components.length === 0 && !required) {
    return { components: [] as string[], reports, note: 'no Arena component drawn, so no component sheet is imported' };
  }
  if (found.components.length === 0) {
    return { fatal: [`"components": "${AUTO}" found no Arena component under ${options.paths.join(', ')}, `
      + 'so the subset would be empty; point --src at the sources that render them, or name the sheets'] };
  }

  return {
    components: found.components,
    reports,
    note: `${found.drawn.length} component sheet(s) drawn`
      + (found.pulled.length ? `, and ${drawsForYou(found.pulled)}` : ''),
  };
}

export function gradientMark(options: StepOptions) {
  try {
    return JSON.parse(readFileSync(options.config, 'utf8')).gradientMark === true;
  } catch {
    return false;
  }
}

const VAR_READ = /var\(\s*(--[\w-]+)(?![\w-]|\$\{|#\{)/g;
const PROPERTY_DECLARED = /(?<![\w-])(--[\w-]+)['"]?\s*:|@property\s+(--[\w-]+)/g;

function paletteColours(config: string) {
  try {
    const palettes = JSON.parse(readFileSync(config, 'utf8'))?.palettes;
    return (Array.isArray(palettes) ? palettes : []).flatMap((one) =>
      Object.keys(one?.colors ?? {}).map((key) => `--color-${key}`));
  } catch {
    return [];
  }
}

function knownProperties(catalogue: TokenCatalogue, options: StepOptions, dirs: string[]) {
  const dashed = (name: string) => `--${name.replace(/^--/, '')}`;
  const known = new Set([
    ...Object.keys(catalogue.tokens ?? {}), ...Object.keys(catalogue.roles ?? {}),
    ...Object.keys(catalogue.aliases ?? {}), ...(catalogue.channels ?? []),
  ].map(dashed));
  for (const name of paletteColours(options.config)) known.add(name);
  for (const file of auditFiles(options.paths, dirs)) {
    for (const m of withoutComments(readFileSync(file, 'utf8')).matchAll(PROPERTY_DECLARED)) known.add(m[1] ?? group(m, 2));
  }
  return known;
}

function nameFindings(text: string, known: Set<string> | null, parts: Set<string> | null,
  vocabulary: VocabularyIndex | null) {
  const found: { line: number; rule: string; message: string }[] = [];
  withoutComments(text).split('\n').forEach((line, index) => {
    if (known) {
      for (const m of line.matchAll(VAR_READ)) {
        const name = group(m);
        if (known.has(name) || name.startsWith('--tw-')) continue;
        const near = nearestName(name, known);
        found.push({ line: index + 1, rule: 'unknown-property', message: `reads var(${name}), which no role, `
          + 'token, alias, channel, palette colour or property your sources declare is called, so the rule '
          + `takes its fallback, or nothing, in silence${near ? `. The nearest listed name is ${near}` : ''}` });
      }
    }
    if (!parts || !vocabulary?.parts) return;
    for (const m of line.matchAll(PAINTED_PART)) {
      const part = group(m);
      if (parts.has(part)) continue;
      const { near, hook } = unknownPart(part, vocabulary.parts);
      found.push({ line: index + 1, rule: 'unknown-part', message: `names the part ${part}, which no component `
        + `declares, so the rule reaches nothing${near ? `. The nearest part is ${near}${hook
          ? `, and ${hook} is the hook that marks that state on it` : ''}` : ''}` });
    }
  });
  return found;
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
  const known = catalogue?.channels ? knownProperties(catalogue, options, dirs) : null;
  const parts = vocabulary?.parts ? knownParts(vocabulary.parts) : null;
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
    const audited = auditFindings(cited, text, scope, declaredMark, vocabulary);
    if (scope !== 'plugin') {
      reports.push(...audited.map((one) => report('audit', one.text, one.rule)));
      continue;
    }
    const lines = text.split('\n');
    const names = nameFindings(text, known, parts, vocabulary);
    const held = new Set(names.map((one) => one.line));
    reports.push(...audited
      .filter((one) => one.rule !== 'stale-allowance'
        || ![...held].some((line) => one.text.startsWith(`${cited}:${line}: `)))
      .map((one) => report('audit', one.text, one.rule)));
    for (const one of names) {
      if (ALLOW_MARKER.test(lines[one.line - 1] ?? '')) continue;
      reports.push(report('audit', `${cited}:${one.line}: ${one.message} (${one.rule})`, one.rule));
    }
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
      fatal: ['the component map this package carries is not beside this command, so what '
        + 'you draw cannot be compared against what ships'] };
  }
  const found = resolveComponents(map, readSources(options.paths), packageName);
  if (!found) {
    return { notes: [] as string[],
      fatal: [`a map keyed by ${JSON.stringify(map.match)} cannot be read`] };
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

const sheetOfComponent = (component: string) => `arena-${component.replace(/^Arena/, '')
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

export function paintedBy(painted: string[], vocabulary: VocabularyIndex | null = null,
  drawnSheets: string[] | null = null) {
  let reached = painted;
  let nothing: string[] = [];
  if (vocabulary?.parts && drawnSheets) {
    const owner = new Map<string, string>();
    for (const [component, declared] of Object.entries(vocabulary.parts)) {
      for (const part of Object.keys(declared)) owner.set(part, sheetOfComponent(component));
    }
    const drawn = (part: string) => drawnSheets.includes(owner.get(part) ?? '');
    reached = painted.filter(drawn);
    nothing = painted.filter((part) => !drawn(part));
  }
  const named = reached.length ? `: ${reached.join(', ')}` : '';
  const rest = nothing.length ? `${nothing.length} rule(s) reach nothing this project draws: ${nothing.join(', ')}. ` : '';
  return `your style plugin(s) paint ${reached.length || 'no'} part(s)${named}. ${rest}`
    + 'A role is added to Arena when several style plugins are measured painting the same decision '
    + 'by hand through the same part, so this note is where the evidence for one comes from';
}

/* A gated <ng-content select="[x]"> is paired with a contentChild(ArenaX), because that query is
 * the only way an ng-content slot can report whether anything was projected. The query resolves
 * the DIRECTIVE, so it finds nothing unless the consumer lists ArenaX in its own `imports`, and
 * with the query null the @if never renders and the projected content vanishes. No error, no
 * warning: `ngc --strictTemplates` is happy, because a bare `footer` attribute on a <div> is valid
 * HTML whether or not a directive matches it. A component cannot detect it, so the guard sits
 * outside. The rule is the CLI's markerProblems, which consumers run through `arena check`; this
 * suite feeds it this layer's own map, read out of the contentChild queries. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ANGULAR_COMPONENTS, SCRIPTS } from './Compliance';

const LAYER = join(ANGULAR_COMPONENTS, '..');

type Files = Array<{ path: string; source: string }>;
const { markerProblems, markerUses, templatesOf } = await import(pathToFileURL(join(SCRIPTS, 'generate', 'core', 'arena-cli', 'markers.ts')).href) as {
  markerProblems: (files: Files, markers: Record<string, string[]>, directives: Record<string, string>) => string[];
  markerUses: (template: string, markers: Record<string, string[]>) => unknown[];
  templatesOf: (path: string, source: string) => string[];
};

const DECLARED_MARKER = /@Directive\(\{\s*selector:\s*'\[([A-Za-z][\w-]*)\]'[^}]*\}\)\s*export class (Arena[A-Za-z0-9]*)/g;
const MARKER_SOURCE = readFileSync(join(LAYER, 'ProjectionMarkers.ts'), 'utf8');

export const MARKERS = new Map([...MARKER_SOURCE.matchAll(DECLARED_MARKER)].map(([, marker = '', directive = '']) => [marker, directive]));

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { yield* sources(path); continue; }
    if (path.endsWith('.ts')) yield path;
  }
}

export function queriedMarkers(files: Files): Map<string, string[]> {
  const byMarker = new Map<string, string[]>();
  for (const [marker, directive] of MARKERS) {
    const hosts = files
      .filter((f) => new RegExp(`contentChild\\(${directive}(?:\\s*,[^)]*)?\\)`).test(f.source))
      .map((f) => selectorOf(f.source))
      .filter((sel): sel is string => Boolean(sel));
    if (hosts.length) byMarker.set(marker, hosts);
  }
  return byMarker;
}

export function selectorOf(source: string): string | null {
  return /selector:\s*'(arena-[a-z-]+)'/.exec(source)?.[1] ?? null;
}

export function hostMap(queried: Map<string, string[]>): Record<string, string[]> {
  const byHost: Record<string, string[]> = {};
  for (const [marker, hosts] of queried) for (const host of hosts) (byHost[host] ??= []).push(marker);
  return byHost;
}

test('every consumer in this layer imports the projection markers it projects into', () => {
  const files = [...sources(LAYER)].map((path) => ({
    path: relative(LAYER, path),
    source: readFileSync(path, 'utf8'),
  }));
  assert.ok(files.length > 0, 'found no sources, so this assertion checked nothing');

  const map = hostMap(queriedMarkers(files));
  assert.ok(Object.keys(map).length > 0, 'found no contentChild(ArenaX) query -- the map is empty, so the guard proves nothing');

  const projecting = files.filter((f) => templatesOf(f.path, f.source).some((t) => markerUses(t, map).length > 0));
  assert.ok(projecting.length > 0, 'found no template projecting into a marker slot -- the guard matched nothing, so it proves nothing');

  const [host = '', [marker = ''] = []] = Object.entries(map)[0] ?? [];
  const directive = MARKERS.get(marker) ?? '';
  const planted = {
    path: 'planted.ts',
    source: `@Component({ imports: [ArenaPlantedHost], template: \`<${host}><div ${marker}>x</div></${host}>\` })`,
  };
  assert.ok(directive !== '' && !'ArenaPlantedHost'.includes(directive), 'the planted consumer must not import the directive');
  const planteds = markerProblems([...files, planted], map, Object.fromEntries(MARKERS));
  assert.equal(planteds.length, 1, 'the rule must report the planted miss through this map, and nothing else');
  assert.ok(planteds[0]?.startsWith('planted.ts'), `the one problem names planted.ts: ${planteds[0]}`);

  assert.deepEqual(markerProblems(files, map, Object.fromEntries(MARKERS)), []);
});

test('every marker query reads direct content only', () => {
  const offenders: string[] = [];
  for (const path of sources(LAYER)) {
    if (path.includes('.test.') || relative(LAYER, path).startsWith('build')) continue;
    const source = readFileSync(path, 'utf8');
    for (const query of source.matchAll(/contentChild\((Arena[A-Za-z0-9]*)((?:\s*,[^)]*)?)\)/g)) {
      if (!/descendants:\s*false/.test(query[2] ?? '')) offenders.push(`${relative(LAYER, path)}: ${query[0]}`);
    }
  }
  assert.deepEqual(offenders, [], 'these queries match markers at any depth, so a marker inside a nested host fills an outer slot:\n' + offenders.join('\n'));
});

test('the guard knows every marker the layer declares', () => {
  const classes = [...MARKER_SOURCE.matchAll(/export class (Arena[A-Za-z0-9]*)/g)].map(([, name]) => name).sort();
  assert.ok(classes.length > 0, 'found no marker directive, so this compared nothing');
  assert.deepEqual([...MARKERS.values()].sort(), classes);
});

/* A gated <ng-content select="[x]"> is paired with a contentChild(ArenaX), because that query is
 * the only way an ng-content slot can report whether anything was projected. The query resolves
 * the DIRECTIVE, so it finds nothing unless the consumer lists ArenaX in its own `imports` --
 * and with the query null the @if never renders, the ng-content is never instantiated, and the
 * projected content vanishes. No error, no warning, nothing red: `ngc --strictTemplates` is
 * happy, because a bare `footer` attribute on a <div> is valid HTML whether or not a directive
 * matches it. A component cannot detect it (that is the case the query exists for), so the guard
 * has to sit outside, and this is it. build:angular-tests cannot import from scripts/, so
 * markerUses is a copy of the CLI's, made to agree: the innermost element is charged, an
 * ng-container included, and only when it queries the marker. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ANGULAR_COMPONENTS } from './Compliance';

const LAYER = join(ANGULAR_COMPONENTS, '..');

export const MARKERS = new Map([
  ['action', 'ArenaAction'],
  ['actions', 'ArenaActions'],
  ['brand', 'ArenaBrand'],
  ['footer', 'ArenaFooter'],
  ['secondaryAction', 'ArenaSecondaryAction'],
]);

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { yield* sources(path); continue; }
    if (path.endsWith('.ts')) yield path;
  }
}

export function stripAttributeValues(template: string): string {
  return template.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
}

export function queriedMarkers(files: Array<{ path: string; source: string }>): Map<string, string[]> {
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

export function templateOf(source: string): string {
  const at = source.indexOf('template: `');
  if (at === -1) return '';
  const start = at + 'template: `'.length;
  const end = source.indexOf('`', start);
  return end === -1 ? '' : source.slice(start, end);
}

export function importsOf(source: string): string {
  const at = source.indexOf('imports: [');
  if (at === -1) return '';
  const end = source.indexOf(']', at);
  return end === -1 ? '' : source.slice(at, end);
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

export function markerUses(template: string, queried: Map<string, string[]>): Array<{ marker: string; host: string | null }> {
  const uses: Array<{ marker: string; host: string | null }> = [];
  const stack: string[] = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  for (const m of template.matchAll(tag)) {
    const [, closing, name, attrs, selfClosing] = m;
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at !== -1) stack.length = at;
      continue;
    }
    const bare = stripAttributeValues(attrs);
    for (const marker of MARKERS.keys()) {
      if (!new RegExp(`(^|\\s)${marker}(?=$|[\\s/=])`).test(bare)) continue;
      const enclosing = stack[stack.length - 1] ?? null;
      const charged = enclosing !== null && enclosing.startsWith('arena-') && (queried.get(marker) ?? []).includes(enclosing);
      uses.push({ marker, host: charged ? enclosing : null });
    }
    if (!selfClosing && !VOID.has(name.toLowerCase())) stack.push(name);
  }
  return uses;
}

export function markerProblems(
  files: Array<{ path: string; source: string }>,
  queried: Map<string, string[]>,
): string[] {
  const problems: string[] = [];
  for (const { path, source } of files) {
    const template = templateOf(source);
    if (!template.includes('<arena-')) continue;
    const imports = importsOf(source);
    for (const { marker, host } of markerUses(template, queried)) {
      const directive = MARKERS.get(marker) as string;
      if (!host) continue;
      if (imports.includes(directive)) continue;
      problems.push(
        `${path}: projects into the \`${marker}\` slot of <${host}> and does not import ${directive}. `
        + `That host's contentChild(${directive}) query resolves the directive, so without the import it `
        + `finds nothing, the @if guarding that slot never renders, and the projected content vanishes `
        + `with no error and no failing compile.`,
      );
    }
  }
  return problems;
}

test('every consumer in this layer imports the projection markers it projects into', () => {
  const files = [...sources(LAYER)].map((path) => ({
    path: relative(LAYER, path),
    source: readFileSync(path, 'utf8'),
  }));
  assert.ok(files.length > 0, 'found no sources, so this assertion checked nothing');

  const queried = queriedMarkers(files);
  assert.ok(queried.size > 0, 'found no contentChild(ArenaX) query -- the guard matched nothing, so it proves nothing');

  const projecting = files.filter((f) => markerUses(templateOf(f.source), queried).some((u) => u.host));
  assert.ok(projecting.length > 0, 'found no template projecting into a marker slot -- the guard matched nothing, so it proves nothing');

  assert.deepEqual(markerProblems(files, queried), []);
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

const QUERIED = new Map([['footer', ['arena-dialog']], ['action', ['arena-card']]]);

test('a marker used without its import is caught, which is the case that shipped an empty dialog', () => {
  const problems = markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [ArenaDialog], template: `<arena-dialog><div footer>ok</div></arena-dialog>` })",
  }], QUERIED);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /projects into the `footer` slot of <arena-dialog> and does not import ArenaFooter/);
});

test('the same template with the import is fine, and a template with no arena- element is none of this rule\'s business', () => {
  assert.deepEqual(markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [ArenaDialog, ArenaFooter], template: `<arena-dialog><div footer>ok</div></arena-dialog>` })",
  }], QUERIED), []);
  assert.deepEqual(markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [], template: `<div footer>plain markup, no Arena host</div>` })",
  }], QUERIED), []);
});

test('a marker word inside an ATTRIBUTE VALUE is not a use of it, which is what over-reported first', () => {
  assert.deepEqual(markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [ArenaCard], template: `<arena-card><arena-tooltip label=\"Every action for this build\">x</arena-tooltip></arena-card>` })",
  }], QUERIED), []);
});

test('a slot gated by an INPUT rather than by a query needs no directive, so projecting into it is not a problem', () => {
  assert.deepEqual(markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [ArenaCalendarEvent], template: `<arena-calendar-event><button actions>Delete</button></arena-calendar-event>` })",
  }], QUERIED), []);
});

test('a marker name appearing inside a longer attribute is not a use of it', () => {
  assert.deepEqual(markerProblems([{
    path: 'a/B.ts',
    source: "@Component({ imports: [], template: `<arena-card><div data-footer-note=\"x\">y</div></arena-card>` })",
  }], QUERIED), []);
});

test('a marker inside an ng-container is charged to nobody, as its slot is the default one', () => {
  assert.deepEqual(markerUses('<arena-card><ng-container><button action>x</button></ng-container></arena-card>', QUERIED), [{ marker: 'action', host: null }]);
});

test('a void element written without a slash does not break the charge of a later sibling', () => {
  assert.deepEqual(markerUses('<arena-card><img src="a"><button action>x</button></arena-card>', QUERIED), [{ marker: 'action', host: 'arena-card' }]);
});

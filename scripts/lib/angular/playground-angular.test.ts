import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  selector, typeExpr, importPath, markerNames, collectFields, escapeText, renderSubject, renderTree,
  knobsInterface, angularEntry, angularPage, renderNode, slotBlock, attributeText, MARKERS_SOURCE,
} from './playground-angular.ts';
import { repoRoot as root } from '../arena/repo-root.ts';
import { placeOf } from '../arena/playground-model.ts';
import type { Knob, Places, PlaygroundModel } from '../arena/playground-model.ts';

const places: Places = new Map([
  ['ArenaCard', { name: 'ArenaCard', category: 'display', dir: 'arena-card', self: true }],
  ['ArenaBadge', { name: 'ArenaBadge', category: 'display', dir: 'arena-badge' }],
  ['ArenaTable', { name: 'ArenaTable', category: 'display', dir: 'arena-table' }],
]);

const contracts = new Map([
  ['ArenaBadge', { api: { tone: { form: 'enum', type: 'ArenaTone' }, content: { form: 'slot' } } }],
  ['ArenaTable', { api: { label: { form: 'primitive', type: 'string' }, content: { form: 'slot' } } }],
]);

const MARKERS = "@Directive({ selector: '[action]', standalone: true }) export class ArenaAction {}\n"
  + "@Directive({ selector: '[footer]', standalone: true }) export class ArenaFooter {}\n";

const knob = (over: Partial<Knob>): Knob => ({
  member: 'x', form: 'primitive', type: 'string', bind: 'optional', bound: false,
  control: 'text', codec: 'raw', initial: '', nodes: null, doc: 'A member.', ...over,
});

const model: PlaygroundModel = {
  component: 'ArenaCard',
  description: 'A surface.',
  note: 'A note.',
  affordances: [],
  knobs: [
    knob({ member: 'title', bind: 'pinned' }),
    knob({ member: 'tone', form: 'enum', type: 'ArenaTone', bind: 'defaulted', control: 'select', options: ['neutral'] }),
    knob({ member: 'content', form: 'slot', type: null, control: 'slotText', initial: 'Body.', nodes: [{ text: 'Body.' }] }),
    knob({
      member: 'action', form: 'slot', type: null, control: 'slotPresence', codec: 'flag', initial: true,
      nodes: [{ component: 'ArenaBadge', members: { tone: 'success' }, slots: { content: [{ text: 'Live' }] } }],
    }),
  ],
  events: [
    { name: 'click', payload: null, bind: null, doc: 'Clicked.' },
    { name: 'sortChange', payload: 'ArenaTableSort', bind: 'sort', doc: 'Sorted.' },
  ],
  host: null,
  uses: ['ArenaBadge'],
};

function entry() {
  return angularEntry(model, places, contracts, MARKERS, '');
}

test('a selector is derived from the component name, never listed', () => {
  assert.equal(selector('ArenaCard'), 'arena-card');
  assert.equal(selector('ArenaTableRow'), 'arena-table-row');
  assert.equal(selector('ArenaAppLogo'), 'arena-app-logo');
});

test('a marker directive is read from the layer\'s own source, so a new one joins with no edit here', () => {
  const found = markerNames(MARKERS);
  assert.deepEqual([...found.entries()], [['action', 'ArenaAction'], ['footer', 'ArenaFooter']]);
});

test('every marker the real source declares is found, or a projected slot would silently not report', () => {
  const found = markerNames(readFileSync(join(root, MARKERS_SOURCE), 'utf8'));
  assert.ok(found.size >= 4, `only ${found.size} marker(s) parsed out of the layer's own source`);
  assert.equal(found.get('action'), 'ArenaAction');
});

test('a type expression follows the form, the same way the other layer\'s does', () => {
  assert.equal(typeExpr(knob({ form: 'array', type: 'ArenaTableColumn' })), 'ArenaTableColumn[]');
  assert.equal(typeExpr(knob({ form: 'slot', control: 'slotPresence' })), 'boolean');
});

test('a component is reached without an extension, which is what the layer\'s own imports do', () => {
  assert.equal(importPath(placeOf(places, 'ArenaBadge')), '../../display/arena-badge/ArenaBadge');
});

test('a string literal becomes a static attribute, because a bound one lands too late for a required input', () => {
  const node = { component: 'ArenaBadge', members: { tone: 'success' }, slots: {} };
  assert.deepEqual(collectFields(node, contracts, [], 'slot'), []);
  assert.match(entry(), /<arena-badge action tone="success">/,
    'ArenaSideNavCollapsible reads its projected items\' required id() from a constructor effect, '
    + 'which runs before a property binding inside @if is applied');
});

test('a non-string literal stays a typed field, since an attribute would hand it a string', () => {
  const node = { component: 'ArenaBadge', members: { dot: true, count: 3 }, slots: {} };
  const contract = new Map([['ArenaBadge', { api: { dot: { form: 'primitive', type: 'boolean' }, count: { form: 'primitive', type: 'number' } } }]]);
  const fields = collectFields(node, contract, [], 'slot');
  assert.deepEqual(fields.map((f) => [f.member, f.type, f.value]), [['dot', 'boolean', true], ['count', 'number', 3]]);
});

test('an attribute value is escaped once, for the quote that ends it and the braces that would interpolate', () => {
  assert.equal(attributeText('a "b" c'), 'a &quot;b&quot; c');
  assert.equal(attributeText('{{ x }}'), '{{ &quot;{{&quot; }} x }}');
});

test('template syntax inside fixture copy is neutralised rather than executed', () => {
  assert.equal(escapeText('a {{ b }} c'), 'a {{ "{{" }} b }} c');
  assert.equal(escapeText('a `b` ${c}'), 'a \\`b\\` \\${c}');
});

test('every member is written out, because this layer has no spread', () => {
  const out = renderSubject(model, places, [], new Map(), 0, new Set());
  assert.match(out, /\[title\]="k\(\)\.title"/);
  assert.match(out, /\[tone\]="k\(\)\.tone"/);
});

test('a void event takes no $event and a payload event forwards one', () => {
  const out = renderSubject(model, places, [], new Map(), 0, new Set());
  assert.match(out, /\(click\)="play\.fire\('click'\)"/);
  assert.match(out, /\(sortChange\)="play\.fire\('sortChange', \$event\)"/);
});

test('a named slot is wrapped in @if, because a marked element counts as filled even when empty', () => {
  const out = renderSubject(model, places, [{ node: model.knobs[3]?.nodes[0], member: 'tone', name: 'f0' }], markerNames(MARKERS), 0, new Set());
  assert.match(out, /@if \(k\(\)\.action\) \{/);
  assert.match(out, /<arena-badge action/);
});

test('a text slot is guarded on undefined rather than on truthiness, so an empty string still renders', () => {
  const out = renderSubject(model, places, [], new Map(), 0, new Set());
  assert.match(out, /@if \(k\(\)\.content !== undefined\) \{/);
});

test('a marker directive joins imports only when a slot it covers is projected', () => {
  assert.match(entry(), /imports: \[Playground, ArenaAction, ArenaBadge, ArenaCard\]/);
  const noSlot: PlaygroundModel = { ...model, knobs: model.knobs.slice(0, 2), uses: [] };
  assert.doesNotMatch(angularEntry(noSlot, places, contracts, MARKERS, ''), /ArenaAction/);
});

test('a host wraps the subject where the placeholder marks', () => {
  const hosted = { ...model, host: { component: 'ArenaTable', members: { label: 'L' }, slots: { content: ['$subject' as const] } } };
  const fields = collectFields(hosted.host, contracts, [], 'host');
  const out = renderTree(hosted, places, fields, new Map(), 0, new Set());
  assert.match(out, /^<arena-table label="L"/);
  assert.match(out, /<arena-card/);
  assert.match(out, /<\/arena-table>$/);
});

test('a required member is not optional in the interface', () => {
  assert.match(knobsInterface(model), /^ {2}title: string;$/m);
  assert.match(knobsInterface(model), /^ {2}content\?: string;$/m);
});

test('the entry opens with the compiler import and bootstraps zoneless, which the gate requires', () => {
  const out = angularEntry(model, places, contracts, MARKERS, '/* banner */\n');
  assert.match(out, /^\/\* banner \*\/\nimport \* as angularJitCompiler from '@angular\/compiler';$/m);
  assert.match(out, /Reflect\.set\(globalThis, 'arenaAngularJitCompiler', angularJitCompiler\);/,
    'the namespace is read, and a bare side-effect import is not: @angular/compiler declares its '
    + 'side effects as one path with forward slashes, which a bundler comparing a native one does '
    + 'not match, so on Windows it dropped the module and every page threw at bootstrap');
  assert.ok(out.indexOf("Reflect.set(globalThis, 'arenaAngularJitCompiler'") < out.indexOf('bootstrapApplication('),
    'the compiler has to be registered before anything asks the injector for an injectable that '
    + 'was only partially compiled, which is the first thing bootstrap does');
  assert.match(out, /bootstrapApplication\(Demo, \{ providers: \[provideZonelessChangeDetection\(\)\] \}\)/);
  assert.match(out, /const MODEL: KnobModel = \{/);
});

test('the page mounts demo-root, loads its bundle and declares no card', () => {
  const page = angularPage(model, '<!-- banner -->\n');
  assert.match(page, /<demo-root><\/demo-root>/);
  assert.match(page, /build\/demo\/js\/ArenaCard\.demo\.entry\.generated\.js/);
  assert.doesNotMatch(page, /@dsCard/);
  assert.match(page, /frameworks\/tailwind\/consume\/Preflight\.generated\.css/);
  assert.match(page, /consume\/components\/display\/arena-card\/ArenaCard\.styles\.generated\.css/,
    'a page links the compiled CSS from the one place it exists, and only for what it draws');
  assert.doesNotMatch(page, /consume\/Components\.generated\.css/,
    'the barrel is for a page drawing most of the library, and this one draws two surfaces');
});

test('a void element is self-closing, because this layer refuses an end tag on one', () => {
  const node = { element: 'img', attrs: { src: 'x.svg', alt: '' } };
  const out = renderNode(node, places, [], new Map(), 0, new Set());
  assert.equal(out.trim(), '<img src="x.svg" alt="" />');
});

test('each projected node gets its own @if, because a block with two roots projects neither', () => {
  const knob: Knob = {
    member: 'footer', form: 'slot', type: null, bind: 'optional', bound: true,
    control: 'slotPresence', codec: 'flag', initial: true, doc: '',
    nodes: [{ component: 'ArenaBadge', slots: {} }, { component: 'ArenaBadge', slots: {} }],
  };
  const out = slotBlock(knob, places, [], new Map(), 0, new Set(), ' footer');
  assert.equal(out.match(/@if \(k\(\)\.footer\) \{/g)?.length, 2);
});

test('an unfilled named slot pulls in no marker directive, which the compiler would call unused', () => {
  const empty: PlaygroundModel = {
    ...model,
    knobs: [{
      member: 'action', form: 'slot', type: null, bind: 'optional', bound: false,
      control: 'slotPresence', codec: 'flag', initial: false, nodes: null, doc: '',
    }],
    events: [], uses: [],
  };
  assert.doesNotMatch(angularEntry(empty, places, contracts, MARKERS, ''), /ArenaAction/);
});

test('a component reached twice is imported once', () => {
  const twice = { ...model, uses: ['ArenaBadge', 'ArenaCard'] };
  const out = angularEntry(twice, places, contracts, MARKERS, '');
  assert.equal(out.match(/import \{ ArenaCard \}/g)?.length, 1);
});

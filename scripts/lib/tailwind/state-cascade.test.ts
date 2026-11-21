/* The cascade reader returns the declaration that wins for one element holding some states, with the media it needs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stateDeclarations, specificity, propertyInitials, roleValue } from './state-cascade.ts';

type Row = { name: string; css: string; element: string; active: string[]; property: string; want: string | undefined; media?: string[] };

const HOVER = '.x { color: red; &:hover { @media (hover: hover) { color: blue; } } }';
const SCOPE = '@scope (.y) { :scope { color: red; } :scope:is([aria-current]:not([aria-current="false"])) { color: green; } }';

const WINS: Row[] = [
  { name: 'rest', css: HOVER, element: '.x', active: [], property: 'color', want: 'red', media: [] },
  { name: 'nested hover under its media', css: HOVER, element: '.x', active: [':hover'], property: 'color', want: 'blue', media: ['(hover: hover)'] },
  { name: 'where and not', css: '@layer utilities { .x:where([data-on]) { color: green; } .x:where(:not([data-on])):hover { color: blue; } }', element: '.x', active: ['[data-on]', ':hover'], property: 'color', want: 'green', media: [] },
  { name: 'specificity beats order', css: '.x:hover:is([a="1"]) { color: green; } .x:hover { color: blue; }', element: '.x', active: [':hover', '[a="1"]'], property: 'color', want: 'green' },
  { name: 'later wins at equal specificity', css: '.x:hover { color: blue; } .x:active { color: gray; }', element: '.x', active: [':hover', ':active'], property: 'color', want: 'gray' },
  { name: 'scope root', css: SCOPE, element: '.y', active: ['[aria-current="page"]'], property: 'color', want: 'green' },
  { name: 'attribute false', css: SCOPE, element: '.y', active: ['[aria-current="false"]'], property: 'color', want: 'red' },
  { name: 'supports holds, forced colours do not', css: '.x { color: var(--a); @supports (color: color-mix(in lab, red, red)) { color: mix; } @media (forced-colors: active) { color: CanvasText; } }', element: '.x', active: [], property: 'color', want: 'mix', media: [] },
  { name: 'a combinator is another element', css: '.x .y { color: red; }', element: '.x', active: [], property: 'color', want: undefined },
  { name: 'one of a list', css: '.w, .x:hover { color: red; }', element: '.x', active: [':hover'], property: 'color', want: 'red' },
  { name: 'disabled stops the pointer', css: '.x:hover:not(:disabled, [aria-disabled="true"]) { color: blue; }', element: '.x', active: [':hover', ':disabled'], property: 'color', want: undefined },
];

test('the declaration that wins for an element holding some states', () => {
  for (const row of WINS) {
    const got = stateDeclarations(row.css, row.element, new Set(row.active)).get(row.property);
    assert.equal(got?.value, row.want, `${row.name}: value`);
    if (row.media) assert.deepEqual(got?.media, row.media, `${row.name}: media`);
  }
});

const SPECIFICITY: [string, string, [number, number, number]][] = [
  ['a class', '.x', [0, 1, 0]],
  ['where counts as nothing', '.x:where([a])', [0, 1, 0]],
  ['is takes its largest argument', '.x:is([a]:not([b]), [c])', [0, 3, 0]],
  ['not takes its largest argument', '.x:hover:not(:disabled, [aria-disabled="true"])', [0, 3, 0]],
];

test('specificity counts classes, attributes and pseudo-classes, :where as nothing and :is and :not as their largest argument', () => {
  for (const [name, selector, want] of SPECIFICITY) assert.deepEqual(specificity(selector), want, name);
});

const ROLES: [string, string, string][] = [
  ['nested slots', 'var(--slot-a,var(--slot-b,var(--fill-hover)))', 'var(--fill-hover)'],
  ['inside a mix', 'color-mix(in oklab, var(--s,var(--ink-muted)) var(--level-ink-muted), transparent)', 'color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)'],
  ['calc spacing', 'calc(var(--mix-pressed) * 100%)', 'calc(var(--mix-pressed)*100%)'],
  ['Tailwind property', 'var(--tw-outline-style)', 'solid'],
  ['unknown Tailwind property', 'var(--tw-other)', 'var(--tw-other)'],
  ['role', 'var(--ink-body)', 'var(--ink-body)'],
];

test("roleValue unwraps every fallback, resolves Tailwind's own properties and squashes the spacing", () => {
  const vars = new Map([['--tw-outline-style', 'solid']]);
  for (const [name, value, want] of ROLES) assert.equal(roleValue(value, vars), want, name);
});

test('propertyInitials reads each @property initial value', () => {
  const css = '@property --tw-outline-style { syntax: "*"; inherits: false; initial-value: solid; } @property --tw-x { syntax: "*"; inherits: false; }';
  assert.deepEqual([...propertyInitials(css)], [['--tw-outline-style', 'solid']]);
});

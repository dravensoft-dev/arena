/* Each state class compiles, state by state, to what the component that draws the same state compiles: ArenaSideNav for
 * the fill and ink, ArenaIconButton for the focus ring and ArenaInput for the invalid edge, read through the cascade. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { buildComponentCss, PRELUDE } from './build-tailwind.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { readFamilies, compileFamily } from '../../lib/tailwind/vocabulary.ts';
import { stateDeclarations, propertyInitials, roleValue } from '../../lib/tailwind/state-cascade.ts';

const COMPONENTS = ['ArenaSideNav', 'ArenaIconButton', 'ArenaInput'];
const manifests = new Map([...layerManifests()].filter(([key]) => COMPONENTS.some((name) => key.endsWith(`/${name}.manifest.json`))));
const out = buildComponentCss({ manifests });
const vars = propertyInitials(out.get(join(repoRoot, PRELUDE)) as string);
const classes = compileFamily(readFamilies().get('state')!, []);

const sheetOf = (name: string) => {
  const key = [...out.keys()].find((one) => one.endsWith(`${name}.styles.generated.css`));
  assert.ok(key, `${name} compiles a sheet`);
  return out.get(key) as string;
};
const SHEETS: Record<string, string> = {
  '.arena-side-nav__item': 'ArenaSideNav',
  '.arena-icon-button__root': 'ArenaIconButton',
  '.arena-input__field': 'ArenaInput',
  '.arena-input__error': 'ArenaInput',
};

type Row = { name: string; class: string; atoms: string; ref: string; refAtoms: string; properties: string[] };
const FILL_INK = ['background-color', 'color'];
const FILL_INK_FADE = ['background-color', 'color', 'opacity'];
const ITEM = '.arena-side-nav__item';
const ROWS: Row[] = [
  { name: 'rest', class: '.arena-interactive', atoms: '', ref: ITEM, refAtoms: '', properties: FILL_INK },
  { name: 'hover', class: '.arena-interactive', atoms: ':hover', ref: ITEM, refAtoms: ':hover', properties: FILL_INK },
  { name: 'pressed', class: '.arena-interactive', atoms: ':hover :active', ref: ITEM, refAtoms: ':hover :active', properties: FILL_INK },
  { name: 'selected through aria-pressed', class: '.arena-interactive', atoms: '[aria-pressed="true"]', ref: ITEM, refAtoms: '[data-arena-current]', properties: FILL_INK },
  { name: 'selected through aria-selected', class: '.arena-interactive', atoms: '[aria-selected="true"]', ref: ITEM, refAtoms: '[data-arena-current]', properties: FILL_INK },
  { name: 'selected through aria-current', class: '.arena-interactive', atoms: '[aria-current="page"]', ref: ITEM, refAtoms: '[data-arena-current]', properties: FILL_INK },
  { name: 'aria-pressed false is rest', class: '.arena-interactive', atoms: '[aria-pressed="false"]', ref: ITEM, refAtoms: '', properties: FILL_INK },
  { name: 'aria-current false is rest', class: '.arena-interactive', atoms: '[aria-current="false"]', ref: ITEM, refAtoms: '', properties: FILL_INK },
  { name: 'selected-hover', class: '.arena-interactive', atoms: '[aria-pressed="true"] :hover', ref: ITEM, refAtoms: '[data-arena-current] :hover', properties: FILL_INK },
  { name: 'selected-pressed', class: '.arena-interactive', atoms: '[aria-pressed="true"] :hover :active', ref: ITEM, refAtoms: '[data-arena-current] :hover :active', properties: FILL_INK },
  { name: 'disabled', class: '.arena-interactive', atoms: ':disabled', ref: ITEM, refAtoms: '[aria-disabled="true"]', properties: FILL_INK_FADE },
  { name: 'disabled through aria-disabled', class: '.arena-interactive', atoms: '[aria-disabled="true"]', ref: ITEM, refAtoms: '[aria-disabled="true"]', properties: FILL_INK_FADE },
  { name: 'disabled under the pointer and a press', class: '.arena-interactive', atoms: ':disabled :hover :active', ref: ITEM, refAtoms: '[aria-disabled="true"] :hover :active', properties: FILL_INK_FADE },
  { name: 'aria-disabled under the pointer and a press', class: '.arena-interactive', atoms: '[aria-disabled="true"] :hover :active', ref: ITEM, refAtoms: '[aria-disabled="true"] :hover :active', properties: FILL_INK_FADE },
  { name: 'selected and disabled under the pointer and a press', class: '.arena-interactive', atoms: '[aria-pressed="true"] :disabled :hover :active', ref: ITEM, refAtoms: '[data-arena-current] [aria-disabled="true"] :hover :active', properties: FILL_INK_FADE },
  { name: 'focus', class: '.arena-focus', atoms: ':focus-visible', ref: '.arena-icon-button__root', refAtoms: ':focus-visible', properties: ['outline-color', 'outline-offset', 'outline-style', 'outline-width'] },
  { name: 'invalid', class: '.arena-invalid', atoms: '[aria-invalid="true"]', ref: '.arena-input__field', refAtoms: '[data-arena-state="error"]', properties: ['border-color'] },
  { name: 'aria-invalid false draws no edge', class: '.arena-invalid', atoms: '[aria-invalid="false"]', ref: '.arena-input__field', refAtoms: '', properties: [] },
  { name: 'invalid message', class: '.arena-invalid__message', atoms: '', ref: '.arena-input__error', refAtoms: '', properties: ['color'] },
];

const LEFT_OUT: Record<string, Record<string, string>> = {
  '.arena-side-nav__item': {
    'border-color': 'a navigation item draws its edge under border-none and the class draws none',
    scale: 'the press scale is motion a component carries',
    cursor: 'the pointer and not-allowed cursors belong to the element',
    'font-weight': 'a current navigation item weight is navigation',
    '--arena-icon-ink': 'the icon ink is a channel a component hands its own glyph, and a glyph of yours takes the ink of its element',
  },
  '.arena-input__field': {
    'background-color': 'the field fill is its own',
    'box-shadow': 'the soft danger ring is a halo the class does not draw',
  },
};

const atomsOf = (text: string) => new Set(text.split(' ').filter(Boolean));
const plain = (map: ReturnType<typeof stateDeclarations>) => new Map([...map].filter(([name]) => !name.startsWith('--tw-')));

test('each state class compiles to the declarations the component draws for the same state', () => {
  const met = new Set<string>();
  for (const row of ROWS) {
    const sheet = sheetOf(SHEETS[row.ref] as string);
    const mine = plain(stateDeclarations(classes, row.class, atomsOf(row.atoms)));
    const theirs = plain(stateDeclarations(sheet, row.ref, atomsOf(row.refAtoms)));
    assert.deepEqual([...mine.keys()].sort(), row.properties, `${row.name}: properties the class draws`);
    for (const property of row.properties) {
      const left = mine.get(property)!;
      const right = theirs.get(property);
      assert.ok(right, `${row.name}: ${row.ref} draws ${property}`);
      assert.equal(roleValue(left.value, vars), roleValue(right.value, vars), `${row.name}: ${property} value`);
      assert.deepEqual(left.media, right.media, `${row.name}: ${property} media`);
    }
    const rest = plain(stateDeclarations(sheet, row.ref, new Set()));
    for (const [property, held] of theirs) {
      if (roleValue(held.value, vars) === roleValue(rest.get(property)?.value ?? '', vars)) continue;
      if (row.properties.includes(property)) continue;
      const reason = LEFT_OUT[row.ref]?.[property];
      assert.ok(reason, `${row.name}: ${row.ref} changes ${property} and the class neither draws nor leaves it out`);
      met.add(`${row.ref} ${property}`);
    }
  }
  for (const [ref, entries] of Object.entries(LEFT_OUT))
    for (const property of Object.keys(entries)) assert.ok(met.has(`${ref} ${property}`), `${ref} ${property}: left out and no row meets it`);
});

test('the state classes read roles and the levels roles combine with, and no var() of theirs falls back', () => {
  const roles = JSON.parse(readFileSync(join(repoRoot, 'contracts/design/roles.json'), 'utf8'));
  const names = new Set<string>(Object.keys(roles).filter((key) => !key.startsWith('$')));
  for (const role of Object.values(roles) as { $extensions?: Record<string, { combines?: { with: string }[] }> }[])
    for (const one of role.$extensions?.['com.dravensoft.arena']?.combines ?? []) names.add(one.with);
  const reads = [...classes.matchAll(/var\(\s*(--[\w-]+)([^)]*)\)/g)];
  assert.ok(reads.length > 0, 'the classes read roles');
  for (const [text, name, rest] of reads) {
    assert.ok(names.has((name as string).slice(2)), `${text} names a role or a level`);
    assert.equal(/,/.test(rest as string), false, `${text} carries no fallback`);
  }
});

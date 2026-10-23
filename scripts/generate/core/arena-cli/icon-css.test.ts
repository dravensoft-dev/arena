import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, drawnGlyphs, fillSourceGlyphs, mergeShipped, WEIGHT_CLASSES } from './icon-css.ts';
import type { IconScan, ShippedIconMap } from './icon-css.ts';
import { resolve } from './components.ts';
import type { ComponentMap } from './components.ts';

const list = (found: IconScan, fillSources = new Set<string>()) => drawnGlyphs(found, fillSources).map(({ weight, glyphs }) => [weight, [...glyphs].sort()]);

test('a weight and a glyph in one class list are read as that pair, and no weight but fill gains it', () => {
  assert.deepEqual(list(scan('<i class="ph-bold ph-bell"></i>')), [['bold', ['ph-bell']]]);
});

const NAV: ComponentMap = {
  match: 'symbol', draws: { ArenaButton: 'button', ArenaSideNavItem: 'side-nav-item' }, needs: {},
};
const drawsFill = (source: string) => (resolve(NAV, [source], '@dravensoft/arena-react')?.keys ?? []).includes('ArenaSideNavItem');

test('fill takes fill pairs, loose names and the glyphs beside a fill-swapping component, and nothing else', () => {
  const button = "import { ArenaButton } from '@dravensoft/arena-react';\n<ArenaButton icon=\"ph-bold ph-gear\" />";
  const nav = "import { ArenaSideNavItem } from '@dravensoft/arena-react';\n<ArenaSideNavItem icon=\"ph-bold ph-house\" active />";
  const found = scan(button);
  scan(nav, found);
  scan('<i class="ph-fill ph-info"></i> icon: "ph-rocket"', found);
  assert.deepEqual(list(found, fillSourceGlyphs([button], drawsFill)), [
    ['regular', ['ph-rocket']],
    ['bold', ['ph-gear', 'ph-house', 'ph-rocket']],
    ['fill', ['ph-info', 'ph-rocket']],
  ]);
  assert.deepEqual(list(found, fillSourceGlyphs([button, nav], drawsFill)), [
    ['regular', ['ph-rocket']],
    ['bold', ['ph-gear', 'ph-house', 'ph-rocket']],
    ['fill', ['ph-house', 'ph-info', 'ph-rocket']],
  ]);
});

test('only the drawn components of a shipped map are merged into the scan', () => {
  const map: ShippedIconMap = {
    components: {
      ArenaAlert: { pairs: { fill: ['ph-info'] }, loose: [] },
      ArenaButton: { pairs: { bold: ['ph-plus'] }, loose: [] },
    },
    fills: [],
  };
  assert.deepEqual(list(mergeShipped(map, scan('<i class="ph-bold ph-bell"></i>'), new Set(['ArenaButton']))),
    [['bold', ['ph-bell', 'ph-plus']]]);
  assert.deepEqual(list(mergeShipped(map, scan('<i class="ph-bold ph-bell"></i>'), null)),
    [['bold', ['ph-bell', 'ph-plus']], ['fill', ['ph-info']]]);
});

test('the regular weight is read only when a glyph sits beside it', () => {
  assert.deepEqual(list(scan('const ph = 1;')), []);
  assert.deepEqual(list(scan('<i class="ph ph-bell"></i>')), [['regular', ['ph-bell']]]);
});

test('a weight named on its own ships nothing, because a list of weights is not a rendering', () => {
  assert.deepEqual(list(scan("export const ARENA_WEIGHTS = ['ph-thin', 'ph-light', 'ph-bold'];")), []);
});

test('a word merely ending in ph is not a class list', () => {
  assert.deepEqual(list(scan('paragraph-two graph-bar morph-target')), []);
});

test('a glyph with no weight beside it reaches every weight, because the weight is decided elsewhere', () => {
  const found = scan('<i class="ph-bold ph-bell"></i>');
  scan("icon: 'ph-rocket-launch'", found);
  assert.deepEqual(list(found), [
    ['regular', ['ph-rocket-launch']],
    ['bold', ['ph-bell', 'ph-rocket-launch']],
    ['fill', ['ph-rocket-launch']],
  ]);
});

test('a loose glyph alone ships nothing, not even a fill sheet, because no weight names a font to draw it with', () => {
  assert.deepEqual(list(scan("icon: 'ph-rocket-launch'")), []);
});

test('one scan accumulates across sources, which is how two trees become one set', () => {
  const found = scan('<i class="ph-bold ph-bell"></i>');
  scan('<i class="ph-fill ph-moon"></i>', found);
  assert.deepEqual(list(found), [['bold', ['ph-bell']], ['fill', ['ph-moon']]]);
});

test('the module keeps the scan and the merge and carries nothing that cuts a font sheet', async () => {
  const names = Object.keys(await import('./icon-css.ts')).sort();
  assert.deepEqual(names, ['ARENA_WEIGHTS', 'SYMBOL_REF', 'WEIGHT_CLASSES', 'drawnGlyphs', 'fillSourceGlyphs', 'glyphNames',
    'iconNames', 'mergeShipped', 'scan', 'shippedNames']);
});

test('the class a weight is written with is the one Phosphor ships, and regular carries no suffix', () => {
  assert.equal(WEIGHT_CLASSES.regular, 'ph');
  assert.equal(WEIGHT_CLASSES.duotone, 'ph-duotone');
});

test('a sprite symbol reference is read as its weight and glyph, and never as a loose name', () => {
  const found = scan('<svg><use href="x.svg#ph-bold-house"></use></svg><use href="#ph-regular-bell"></use>');
  assert.deepEqual(list(found), [['regular', ['ph-bell']], ['bold', ['ph-house']]]);
  assert.deepEqual([...found.loose], []);
});

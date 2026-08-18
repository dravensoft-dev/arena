import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  playgroundPage, sheetLinks, surfacesDrawn, toggleDock, UP, PHOSPHOR_WEIGHTS,
} from './playground-page.ts';

const page = (over = {}) => playgroundPage({
  component: 'ArenaCard', banner: '<!-- b -->\n', mount: '<div id="root"></div>', script: 'X.js', ...over,
});

test('every page links the shared chrome, which is what makes the frame the same in every layer', () => {
  const out = page();
  assert.match(out, new RegExp(`${UP}intro/styles\\.css`));
  assert.match(out, new RegExp(`${UP}intro/toggle\\.css`));
  assert.match(out, new RegExp(`${UP}intro/playground\\.css`));
  for (const weight of PHOSPHOR_WEIGHTS) assert.match(out, new RegExp(`src/${weight}/style\\.css`));
});

test('all three toggles are static markup outside any framework, so a re-render cannot drop them', () => {
  const dock = toggleDock();
  assert.match(dock, /class="dtoggle themebtn"/);
  assert.match(dock, /id="density"/);
  assert.match(page(), /dtoggle-dock/);
});

test('the theme and density scripts load, or the URL stops reproducing the view', () => {
  assert.match(page(), new RegExp(`<script src="${UP}intro/theme\\.js">`));
  assert.match(page(), new RegExp(`<script src="${UP}intro/density\\.js">`));
});

test('a page declares no card, because its height moves with every knob', () => {
  assert.doesNotMatch(page(), /@dsCard/);
});

test('only the mount, the head and the script differ between two layers\' pages', () => {
  const a = page({ mount: '<div id="root"></div>', script: 'a.js', head: '<link rel="stylesheet" href="x.css">\n' });
  const b = page({ mount: '<demo-root></demo-root>', script: 'b.js' });
  const strip = (s: string) => s.replace(/<div id="root"><\/div>|<demo-root><\/demo-root>/, 'MOUNT')
    .replace(/src="[ab]\.js"/, 'src="SCRIPT"')
    .replace(/<link rel="stylesheet" href="x\.css">\n/, '');
  assert.equal(strip(a), strip(b));
});

test('the banner is the first line, and the depth to intro/ is the same for every component directory', () => {
  assert.ok(page().startsWith('<!-- b -->\n'));
  assert.equal(UP, '../../../../../');
});

const NOTHING_COMPOSED = new Map();

test('a compound child draws the surface its parent manifest describes, not one of its own', () => {
  assert.deepEqual(surfacesDrawn({ component: 'ArenaTableRow', uses: ['ArenaTable', 'ArenaTableCell'] }, NOTHING_COMPOSED), ['ArenaTable']);
  assert.deepEqual(surfacesDrawn({ component: 'ArenaTab', uses: ['ArenaTabs'] }, NOTHING_COMPOSED), ['ArenaTabs']);
});

test('a component a page composes brings its own sheet, so nothing renders unstyled', () => {
  assert.deepEqual(
    surfacesDrawn({ component: 'ArenaTooltip', uses: ['ArenaIconButton'] }, NOTHING_COMPOSED),
    ['ArenaIconButton', 'ArenaTooltip'],
  );
});

test('a surface a component renders INSIDE itself is linked too, since no fixture can name it', () => {
  const graph = new Map([['ArenaTable', new Set(['ArenaPagination'])]]);
  assert.deepEqual(surfacesDrawn({ component: 'ArenaTable', uses: [] }, graph), ['ArenaPagination', 'ArenaTable']);
});

test('a hand-drawn chart contributes no sheet, and anything else with no surface is an error', () => {
  assert.deepEqual(surfacesDrawn({ component: 'ArenaBarChart', uses: [] }, NOTHING_COMPOSED), []);
  assert.throws(
    () => surfacesDrawn({ component: 'ArenaBadge', uses: ['Nonexistent'] }, NOTHING_COMPOSED),
    /render it unstyled/,
  );
});

test('every page links the preflight, because a form control without it falls back to the browser\'s own size', () => {
  const links = sheetLinks({ component: 'ArenaBadge', uses: [] }, NOTHING_COMPOSED);
  assert.equal(links.split('\n').length, 2);
  assert.match(links, new RegExp(`${UP}frameworks/tailwind/consume/Preflight\\.generated\\.css`));
  assert.match(links, /consume\/components\/display\/arena-badge\/ArenaBadge\.styles\.generated\.css/);
});

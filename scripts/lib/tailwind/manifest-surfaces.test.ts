/* Both maps are asserted by name, so changing either is changing this file. The two
 * resolutions that matter are the ones a gate acts on: a component with no manifest of its
 * own resolves to the one that draws its surface, and a component that draws by hand
 * resolves to nothing at all and is out of every scope built from inScope(). */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAND_DRAWN, MANIFEST_COVERS, categoryOf, coveredContracts, coveringManifest, everyComponent,
  hasOwnManifest, inScope, manifestFor, surfaceProblems,
} from './manifest-surfaces.ts';

test('MANIFEST_COVERS names the eight manifests that draw more than their own component', () => {
  assert.deepEqual([...MANIFEST_COVERS.keys()].sort(), [
    'ArenaBottomNav', 'ArenaCalendar', 'ArenaConfirmDialog', 'ArenaErrorState', 'ArenaRadio', 'ArenaSideNav', 'ArenaTable', 'ArenaTabs',
  ]);
});

test('HAND_DRAWN names the seven SVG charts and nothing else', () => {
  assert.deepEqual([...HAND_DRAWN.keys()].sort(), ['ArenaBarChart', 'ArenaDoughnutChart', 'ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart']);
});

test('every entry in either map carries a reason, because a reason is the whole entry', () => {
  for (const [name, { reason }] of MANIFEST_COVERS) assert.ok(reason.trim().length > 40, name);
  for (const [name, reason] of HAND_DRAWN) assert.ok(reason.trim().length > 40, name);
});

test('a component with no manifest of its own resolves to the one that draws its surface', () => {
  assert.equal(hasOwnManifest('ArenaRadioGroup'), false);
  assert.equal(manifestFor('ArenaRadioGroup'), 'ArenaRadio');
  assert.equal(manifestFor('ArenaCalendarEvent'), 'ArenaCalendar');
  assert.equal(manifestFor('ArenaTableCell'), 'ArenaTable');
  assert.equal(manifestFor('ArenaSideNavCollapsible'), 'ArenaSideNav');
  assert.equal(manifestFor('ArenaTab'), 'ArenaTabs');
  assert.equal(manifestFor('ArenaBottomNavItem'), 'ArenaBottomNav');
});

test('a component with its own manifest resolves to itself even where another names it', () => {
  assert.equal(hasOwnManifest('ArenaButton'), true);
  assert.equal(coveringManifest('ArenaButton'), 'ArenaConfirmDialog');
  assert.equal(manifestFor('ArenaButton'), 'ArenaButton',
    'ArenaConfirmDialog types ArenaButton\'s slot out by hand; that does not take ArenaButton\'s own manifest away');
});

test('every component in scope resolves to a manifest, so no name is left with nothing to render', () => {
  const orphans = inScope().filter((name) => manifestFor(name) === null);
  assert.deepEqual(orphans, []);
});

test('the scope is every component but the ones that draw by hand', () => {
  assert.equal(everyComponent().length, 67);
  assert.equal(inScope().length, 60);
  assert.equal(inScope().some((n) => HAND_DRAWN.has(n)), false);
});

test('a hand-drawn component resolves to no manifest at all', () => {
  for (const name of HAND_DRAWN.keys()) {
    assert.equal(hasOwnManifest(name), false, name);
    assert.equal(manifestFor(name), null, name);
  }
});

test('coveredContracts answers with the component itself where no manifest names it', () => {
  assert.deepEqual(coveredContracts('ArenaBadge'), ['ArenaBadge']);
  assert.deepEqual(coveredContracts('ArenaRadio'), ['ArenaRadio', 'ArenaRadioGroup']);
});

test('categoryOf reads Components.json rather than the tree', () => {
  assert.equal(categoryOf('ArenaRadioGroup'), 'forms');
  assert.equal(categoryOf('ArenaSideNavItem'), 'navigation');
  assert.equal(categoryOf('Nonesuch'), null);
});

test('the real tree agrees with both maps', () => {
  assert.deepEqual(surfaceProblems(), []);
});

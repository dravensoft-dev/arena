import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNPINNED, collect, pinsIn, staleUnpinnedProblems, unpaidProblems, zeroWalkProblems,
} from './check-safe-area.ts';

test('a slot pinned to an edge and paying its inset is not a problem', () => {
  const { found } = pinsIn('X', { slots: { root: 'fixed bottom-0 pb-[var(--pad-safe-bottom)]' } });
  assert.deepEqual(found.map((p) => [p.edge, p.names]), [['bottom', true]]);
  assert.deepEqual(unpaidProblems(found), []);
});

test('a slot pinned to an edge and paying nothing is, and the message names the edge', () => {
  const { found } = pinsIn('X', { slots: { root: 'sticky top-0 z-nav' } });
  const problems = unpaidProblems(found);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /X\.root pins to the top of the viewport and names no --pad-safe-top/);
  assert.match(problems[0] ?? '', /a bar beside the notch and a bar under it/);
});

test('a slot is read composed, because that is how a variant reaches its base', () => {
  const composed = pinsIn('X', {
    slots: { root: 'fixed start-0 end-0' },
    variants: { placement: { bottom: { root: 'bottom-0 pb-[var(--pad-safe-bottom)]' } } },
  });
  assert.deepEqual(composed.found.map((p) => [p.edge, p.names]), [['bottom', true]]);

  const split = pinsIn('X', { slots: { root: 'bottom-0' } });
  assert.deepEqual(split.found, [], 'an edge with nothing pinning it is not a pinned slot');
});

test('a surface covering every edge is covered rather than pinned', () => {
  const { found, covered } = pinsIn('X', { slots: { scrim: 'fixed inset-0 bg-scrim' } });
  assert.deepEqual(found, []);
  assert.deepEqual(covered, ['X.scrim']);
});

test('a recorded surface is excused, and one nothing walked fails', () => {
  const { found } = pinsIn('X', { slots: { root: 'fixed top-0' } });
  assert.deepEqual(unpaidProblems(found, new Map([['X.root', 'on the record']])), []);
  const stale = staleUnpinnedProblems([], [], new Map([['Ghost.root', 'on the record']]));
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /outlived what it excused/);
});

test('a walk over no manifest, or one finding no pin at all, is a failure', () => {
  assert.deepEqual(zeroWalkProblems(1, 1), []);
  assert.match(zeroWalkProblems(0, 1)[0] ?? '', /failure rather than a clean pass/);
  assert.match(zeroWalkProblems(1, 0)[0] ?? '', /reading the wrong shape/);
});

test('the tree passes its own claim, over more than nothing', () => {
  const { files, pins, covered, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0);
  assert.ok(pins.length > 0, 'a bottom bar, a sheet and a toast host are all pinned');
  assert.ok(covered.length > 0, 'every dialog draws a scrim over the whole viewport');
  assert.ok(UNPINNED.size > 0);
});

test('the bar under the notch and the bar over the home indicator both pay', () => {
  const { pins } = collect();
  const at = (component: string, edge: string) =>
    pins.find((p) => p.component === component && p.edge === edge);
  assert.equal(at('ArenaAppBar', 'top')?.names, true);
  assert.equal(at('ArenaBottomNav', 'bottom')?.names, true);
});

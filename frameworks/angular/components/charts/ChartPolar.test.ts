/* The polar grid a radar draws on. It starts at 12 o'clock and runs clockwise, the same
 * way arenaDoughnutSlices does, so two radial charts on one page do not begin in
 * different places. A gauge keeps that origin and direction and adds an offset: a
 * scale has two ends, so its dial opens at the bottom, from 7:30 to 4:30 clockwise.
 * What this suite cannot see is whether the axes are legible at the count given: past
 * eight or so the labels collide, and that is on the by-hand list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaPolarAngle, arenaPolarPoint, arenaPolarIndex, arenaPolarAnchor, arenaRadarRings,
  arenaRadarRadius, arenaRadarLabelRadius, arenaGaugeAngle, arenaGaugePoint, arenaGaugeAnchor, arenaGaugeRadii,
} from './ChartPolar';
import { arenaNiceDomain } from './ChartScales';
import { chartPadLeft } from '../../Tokens.generated';

test('the first axis stands at 12 o\'clock, where the ring already starts', () => {
  assert.equal(arenaPolarAngle(0, 5), -Math.PI / 2);
  const point = arenaPolarPoint(100, 100, 40, 0, 5);
  assert.ok(Math.abs(point.x - 100) < 1e-9, `got x ${point.x}`);
  assert.ok(Math.abs(point.y - 60) < 1e-9, `straight up is a smaller y, got ${point.y}`);
});

test('the axes run clockwise and divide the turn evenly', () => {

  const quarter = arenaPolarPoint(100, 100, 40, 1, 4);
  assert.ok(Math.abs(quarter.x - 140) < 1e-9, `the second of four is due right, got x ${quarter.x}`);
  assert.ok(Math.abs(quarter.y - 100) < 1e-9, `got y ${quarter.y}`);
});

test('a full turn of axes closes, so the last one does not overlap the first', () => {
  const count = 6;
  const first = arenaPolarPoint(0, 0, 10, 0, count);
  const past = arenaPolarPoint(0, 0, 10, count, count);
  assert.ok(Math.abs(first.x - past.x) < 1e-9 && Math.abs(first.y - past.y) < 1e-9,
    'index count must land back on index 0, or the axes do not tile the circle');
});

test('a radius of zero puts every axis on the centre, which is what a value of zero means', () => {
  for (const index of [0, 1, 2, 3]) {
    const point = arenaPolarPoint(50, 50, 0, index, 4);
    assert.ok(Math.abs(point.x - 50) < 1e-9 && Math.abs(point.y - 50) < 1e-9, `axis ${index}`);
  }
});

test('a pointer anywhere on an axis reads that axis, and the seam does not read as -1', () => {

  const count = 5;
  for (let index = 0; index < count; index += 1) {
    const on = arenaPolarPoint(100, 100, 60, index, count);
    assert.equal(arenaPolarIndex(100, 100, on.x, on.y, count), index, `axis ${index}`);
  }
});

test('a pointer just short of 12 o\'clock wraps to the first axis rather than off the end', () => {

  const count = 4;
  const nearlyRound = arenaPolarPoint(100, 100, 60, 3.6, count);
  assert.equal(arenaPolarIndex(100, 100, nearlyRound.x, nearlyRound.y, count), 0);
});

test('the centre itself reads an axis rather than throwing, because a pointer can rest there', () => {
  const index = arenaPolarIndex(100, 100, 100, 100, 5);
  assert.ok(index >= 0 && index < 5, `got ${index}`);
});

test('no axes read as no axis, rather than as the first one', () => {
  assert.equal(arenaPolarIndex(0, 0, 10, 10, 0), -1);
  assert.equal(arenaPolarAngle(0, 0), -Math.PI / 2, 'the angle still answers, so a lone centre draws');
});

test('a ring is drawn per tick above the centre, and never one at the centre itself', () => {

  const domain = arenaNiceDomain(0, 100);
  const rings = arenaRadarRings(domain);
  assert.ok(rings.length > 0, 'a grid of no rings is a grid nobody can read a value against');
  assert.ok(rings.every((value) => value > 0), `a ring of radius zero is the centre point, got ${rings.join(', ')}`);
  assert.ok(Math.abs((rings[rings.length - 1] as number) - domain.max) < 1e-9,
    'the outermost ring is the domain, so the polygon never crosses a ring that is not there');
});

test('a domain with no step draws no rings rather than looping forever', () => {
  assert.deepEqual(arenaRadarRings({ min: 0, max: 0, step: 0 }), []);
});

test('an axis label is anchored away from the centre, so a full-value vertex does not sit on it', () => {

  assert.equal(arenaPolarAnchor(0, 4), 'middle', 'straight up, centred over its own axis');
  assert.equal(arenaPolarAnchor(1, 4), 'start', 'due east, so the text runs outward');
  assert.equal(arenaPolarAnchor(2, 4), 'middle', 'straight down');
  assert.equal(arenaPolarAnchor(3, 4), 'end', 'due west, so the text runs outward the other way');
});

test('every axis of an odd count is anchored on the side it points to', () => {
  for (const index of [1, 2]) assert.equal(arenaPolarAnchor(index, 5), 'start', `axis ${index} points east`);
  for (const index of [3, 4]) assert.equal(arenaPolarAnchor(index, 5), 'end', `axis ${index} points west`);
});

test('the labels ring sits outside the grid, which is what stops a vertex landing on one', () => {

  const grid = arenaRadarRadius(600, 280);
  const labels = arenaRadarLabelRadius(600, 280);
  assert.ok(labels > grid, `labels at ${labels} must be outside a grid of ${grid}`);
  assert.ok(grid > 0, 'the grid still has a radius to draw on');
});

test('the grid leaves room for a label rather than reaching the edge of its box', () => {

  const grid = arenaRadarRadius(600, 280);
  assert.ok(arenaRadarLabelRadius(600, 280) <= 280 / 2, 'the label ring must stay inside the shorter axis of the box');
  assert.ok(grid < 280 / 2, 'a grid that reached the edge would leave the labels nowhere to go');
});

test('the grid stays positive in a box too small to hold a label at all', () => {
  for (const size of [0, 1, 28, 56]) assert.ok(arenaRadarRadius(size, size) > 0, `at ${size}px`);
});

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('a gauge sweeps 270 degrees clockwise, from the 7:30 position to the 4:30 position', () => {
  const start = arenaGaugePoint(100, 100, 40, 0);
  const end = arenaGaugePoint(100, 100, 40, 1);
  const top = arenaGaugePoint(100, 100, 40, 1 / 3);
  assert.ok(near(arenaGaugeAngle(1) - arenaGaugeAngle(0), (Math.PI * 3) / 2), 'the sweep is three quarters of a turn');
  assert.ok(start.x < 100 && start.y > 100 && near(100 - start.x, start.y - 100), `the minimum sits at 7:30, got ${start.x},${start.y}`);
  assert.ok(end.x > 100 && end.y > 100 && near(end.x - 100, end.y - 100), `the maximum sits at 4:30, got ${end.x},${end.y}`);
  assert.ok(near(start.y, end.y) && near(start.x + end.x, 200), 'the two ends mirror each other across the vertical');
  assert.ok(top.x < 100 && top.y < 100, `a third of the way is past 9 o'clock and before 12, got ${top.x},${top.y}`);
  assert.ok(near(arenaGaugePoint(100, 100, 40, 0.5).x, 100) && near(arenaGaugePoint(100, 100, 40, 0.5).y, 60),
    'half the scale stands at 12 o\'clock');
});

test('a gauge keeps the polar origin, so its angle composes with the arc and point helpers', () => {
  const turn = (angle: number) => ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  assert.ok(near(turn(arenaGaugeAngle(0.5)), turn(arenaPolarAngle(0, 4))), 'the midpoint is the polar origin at 12 o\'clock');
  assert.ok(near(arenaGaugeAngle(0), -Math.PI / 2 + (Math.PI * 5) / 4), 'the start is 225 degrees past 12 o\'clock');
});

test('a label beside the left half of the dial ends at its tick, one on the right starts there, the top one is centred', () => {
  assert.equal(arenaGaugeAnchor(0), 'end');
  assert.equal(arenaGaugeAnchor(0.5), 'middle');
  assert.equal(arenaGaugeAnchor(1), 'start');
});

test('the dial fits its box: the band ring outside the track, and the open bottom inside the height', () => {
  for (const [width, height] of [[600, 200], [240, 200], [390, 200], [600, 120]]) {
    const { cy, band, track, label } = arenaGaugeRadii(width, height);
    assert.ok(band.outer > band.inner && band.inner > track.outer && track.outer > track.inner && track.inner > 0,
      `${width}x${height}: the rings nest from the band ring in, got ${JSON.stringify({ band, track })}`);
    assert.ok(label > band.outer, `${width}x${height}: a tick label stands outside the band ring`);
    assert.ok(cy - label >= 0, `${width}x${height}: the top label stays inside the box`);
    assert.ok(cy + band.outer * Math.SQRT1_2 <= height, `${width}x${height}: the open bottom stays inside the box`);
    assert.ok(width / 2 - band.outer >= chartPadLeft - 1e-9, `${width}x${height}: the dial leaves room beside it for the end labels`);
  }
});

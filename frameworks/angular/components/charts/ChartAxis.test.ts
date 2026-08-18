import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CHART_HEIGHT, ARENA_PAD, arenaValueWriter } from '../../DataVisuals';
import { arenaPlotBox, arenaAxisTicks, arenaAxisModel, arenaTickLabelX, arenaCategoryAnchor, arenaCategoryLabelY, arenaDoughnutRadii, arenaValueGutter } from './ChartAxis';
import { arenaLinearScale, arenaNiceDomain, arenaDomainTicks } from './ChartScales';
import { chartTickChar, chartLabelGap } from '../../Tokens.generated';

test('the tick label ends one label gap left of the plot, inside the left pad', () => {
  assert.equal(arenaTickLabelX(), ARENA_PAD.l - 8);
  assert.ok(arenaTickLabelX() > 0, 'the label must not sit off the left edge of the box');
});

test('the gutter holds the widest tick the axis will write, whatever writes it', () => {
  const domain = arenaNiceDomain(0, 100);
  const suffixed = arenaValueGutter(domain, arenaValueWriter({ suffix: ' pts' }));
  const bare = arenaValueGutter(domain, String);
  assert.ok(suffixed > bare, 'a suffix is part of the label, so it is part of the room it needs');

  for (const write of [String, arenaValueWriter({ suffix: ' pts' }), arenaValueWriter({ prefix: 'Bs. ' })]) {
    const gutter = arenaValueGutter(domain, write);
    const widest = Math.max(...arenaDomainTicks(domain).map((value) => write(value).length));
    assert.ok(gutter - chartLabelGap >= widest * chartTickChar,
      `a ${widest}-character tick does not fit a ${gutter}px gutter, so it renders clipped`);
    assert.equal(arenaTickLabelX(gutter) - widest * chartTickChar >= 0, true,
      'the label is anchored at its right end, so its left edge is where clipping starts');
  }
});

test('the gutter never narrows below the pad, so a short axis draws what it always drew', () => {
  for (const max of [1, 8, 100, 2000]) {
    const domain = arenaNiceDomain(0, max);
    assert.ok(arenaValueGutter(domain, String) >= ARENA_PAD.l, `at a maximum of ${max}`);
  }
  assert.equal(arenaValueGutter(arenaNiceDomain(0, 100), String), ARENA_PAD.l,
    'three digits and a gap fit the pad, which is why the charts that shipped before this draw '
    + 'the same bytes they drew');
});

test('a wider gutter takes its room from the plot rather than from the box', () => {
  const wide = arenaValueGutter(arenaNiceDomain(0, 100), arenaValueWriter({ suffix: ' points' }));
  const box = arenaPlotBox(600, 280, wide);
  assert.equal(box.x, wide);
  assert.equal(box.x + box.w, 600 - ARENA_PAD.r, 'the plot still ends one right pad from the edge');
});

test('the category label sits one label gap above the bottom edge of the box', () => {
  assert.equal(arenaCategoryLabelY(ARENA_CHART_HEIGHT), ARENA_CHART_HEIGHT - 8);
});

test('the plot box is the container inset by the pads on all four sides', () => {
  const box = arenaPlotBox(600, 280);
  assert.equal(box.x, ARENA_PAD.l);
  assert.equal(box.y, ARENA_PAD.t);
  assert.equal(box.w, 600 - ARENA_PAD.l - ARENA_PAD.r);
  assert.equal(box.h, 280 - ARENA_PAD.t - ARENA_PAD.b);
});

test('the plot box floors at 1px on both axes, so an unmeasured container still lays out', () => {
  for (const width of [0, ARENA_PAD.l + ARENA_PAD.r, -100])
    assert.ok(arenaPlotBox(width, 280).w >= 1, `width ${width}`);
  for (const height of [0, ARENA_PAD.t + ARENA_PAD.b, -100])
    assert.ok(arenaPlotBox(600, height).h >= 1, `height ${height}`);
});

test('an axis tick carries its value, its position on the scale and the written label', () => {
  const scale = arenaLinearScale(0, 100, 252, 8);
  const ticks = arenaAxisTicks(scale, [0, 50, 100], (value) => `${value}%`);
  assert.deepEqual(ticks, [
    { value: 0, y: 252, label: '0%' },
    { value: 50, y: 130, label: '50%' },
    { value: 100, y: 8, label: '100%' },
  ]);
});

test('a tick is placed by the scale itself, never floored the way a datum is', () => {

  const scale = arenaLinearScale(-50, 50, 252, 8);
  const [below] = arenaAxisTicks(scale, [-50], String);
  assert.equal(below?.y, 252, 'a tick below zero sits where the scale puts it');
});

test('no ticks produce no lines, rather than one at the origin', () => {
  assert.deepEqual(arenaAxisTicks(arenaLinearScale(0, 100, 252, 8), [], String), []);
});

test('the axis model puts zeroY on the plot floor while the domain starts at zero', () => {
  const domain = arenaNiceDomain(0, 128);
  const model = arenaAxisModel(arenaLinearScale(domain.min, domain.max, 252, 8), domain, String);
  assert.equal(model.zeroY, 252, 'the strong rule is the plot floor, which is what it always was');
  assert.equal(model.ticks[0]?.y, 252, 'and the first tick lands on it');
});

test('the axis model lifts zeroY off the floor the moment a value goes negative', () => {

  const domain = arenaNiceDomain(-20, 60);
  const model = arenaAxisModel(arenaLinearScale(domain.min, domain.max, 252, 8), domain, String);
  assert.ok(model.zeroY < 252 && model.zeroY > 8, `zeroY was ${model.zeroY}, not inside the plot`);
  assert.ok(model.ticks.some((tick) => Math.abs(tick.y - model.zeroY) < 1e-9),
    'the zero line must coincide with a tick, which is the whole point of the domain');
});

test('an all-negative domain puts zeroY at the plot ceiling', () => {
  const domain = arenaNiceDomain(-30, 0);
  const model = arenaAxisModel(arenaLinearScale(domain.min, domain.max, 252, 8), domain, String);
  assert.equal(model.zeroY, 8);
});

test('the ring fits the smaller of the plot\'s two axes, inset so its stroke is not clipped', () => {

  assert.equal(arenaDoughnutRadii(600, 280, 'doughnut').outer, 280 / 2 - 8);

  assert.equal(arenaDoughnutRadii(100, 280, 'doughnut').outer, 100 / 2 - 8);
});

test('the hole is 62% of the outer radius, so it scales with the ring instead of swallowing it', () => {
  const { outer, inner } = arenaDoughnutRadii(600, 280, 'doughnut');
  assert.ok(Math.abs(inner / outer - 0.62) < 1e-9);
});

test('both radii stay positive in a plot too small to hold the inset', () => {

  for (const plot of [0, 1, 8, 16]) {
    const { outer, inner } = arenaDoughnutRadii(plot, ARENA_CHART_HEIGHT, 'doughnut');
    assert.ok(outer > 0, `outer radius was ${outer} at plot width ${plot}`);
    assert.ok(inner > 0, `inner radius was ${inner} at plot width ${plot}`);
  }
});

test('the ring stays inside the plot box it is drawn in', () => {
  for (const plot of [120, 300, 600]) {
    const { outer } = arenaDoughnutRadii(plot, ARENA_CHART_HEIGHT, 'doughnut');

    assert.ok(outer * 2 <= plot, `a ${outer * 2}px ring does not fit a ${plot}px plot`);
    assert.ok(outer * 2 <= ARENA_CHART_HEIGHT, `a ${outer * 2}px ring does not fit a ${ARENA_CHART_HEIGHT}px plot height`);
  }
});

test('a pie is the same circle as the doughnut, with the hole taken to nothing', () => {

  const ring = arenaDoughnutRadii(600, 280, 'doughnut');
  const pie = arenaDoughnutRadii(600, 280, 'pie');
  assert.equal(pie.outer, ring.outer, 'the shape decides the hole and nothing else, so the ring inset still applies');
  assert.equal(pie.inner, 0);
});

test('the hole is the shape and never a caller-supplied ratio, so only the two shapes exist', () => {

  for (const plot of [120, 300, 600]) {
    assert.equal(arenaDoughnutRadii(plot, ARENA_CHART_HEIGHT, 'pie').inner, 0, `at plot width ${plot}`);
  }
});

test('a label at either end of a category axis runs inwards from its point', () => {
  assert.equal(arenaCategoryAnchor(0, 5), 'start',
    'the first label is centred on a point one half-label from the value gutter');
  assert.equal(arenaCategoryAnchor(4, 5), 'end',
    'the last label is centred on a point one half-label from the right pad');
  for (const index of [1, 2, 3]) assert.equal(arenaCategoryAnchor(index, 5), 'middle');
});

test('a lone label is centred, because neither edge is the one it overflows', () => {
  assert.equal(arenaCategoryAnchor(0, 1), 'middle');
  assert.equal(arenaCategoryAnchor(0, 0), 'middle');
});

test('an index outside the count is centred rather than anchored to an edge it is not at', () => {
  assert.equal(arenaCategoryAnchor(7, 5), 'middle');
  assert.equal(arenaCategoryAnchor(-1, 5), 'middle');
});

test('the anchor is a decision about an index, so it holds for any face the consumer declares', () => {
  const anchors = Array.from({ length: 4 }, (_, i) => arenaCategoryAnchor(i, 4));
  assert.deepEqual(anchors, ['start', 'middle', 'middle', 'end'],
    'nothing here reads a width, which is what the value gutter can do and this cannot: a bottom '
    + 'label is set in the body face, and that face is the consumer\'s own');
});

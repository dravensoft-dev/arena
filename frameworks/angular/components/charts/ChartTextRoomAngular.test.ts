import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_PAD, ARENA_TEXT_ROOM, arenaPad, arenaPlotWidth, arenaTextRoom, arenaValueWriter } from '../../DataVisuals';
import {
  arenaCategoryGutter, arenaCategoryLabelX, arenaFunnelBox, arenaHeatmapBox, arenaHeatmapHeight, arenaHeatmapWidth,
  arenaLabelStride, arenaPlotBox, arenaPlotBoxH, arenaTextGutter, arenaValueGutter,
} from './ChartAxis';
import { arenaGaugeRadii, arenaGaugeWordY, arenaRadarRadius } from './ChartPolar';
import { arenaHeatLegendStrip, arenaLegendStrip } from './ChartLegend';
import { arenaNiceDomain } from './ChartScales';
import {
  chartHeatmapRowH, chartLabelGap, chartLegendStrip, chartPadBottom, chartPadCategory, chartPadLeft, chartTickChar,
} from '../../Tokens.generated';

test('the value gutter doubles its character room at a doubled text scale', () => {
  const domain = arenaNiceDomain(0, 1000);
  const write = arenaValueWriter({ suffix: ' points' });
  const widest = Math.max(...[0, 250, 500, 750, 1000].map((value) => write(value).length));
  const wide = arenaValueGutter(domain, write, arenaTextRoom(2));
  assert.equal(wide, Math.ceil(widest * chartTickChar * 2) + chartLabelGap);
  assert.ok(wide > arenaValueGutter(domain, write));
});

test('the default room draws what it drew', () => {
  assert.deepEqual(ARENA_TEXT_ROOM, arenaTextRoom(1));
  assert.deepEqual(ARENA_PAD, arenaPad());
  assert.equal(ARENA_PAD.b, chartPadBottom);
  assert.equal(ARENA_PAD.l, chartPadLeft);
  assert.equal(arenaPlotBox(400, 200).h, 200 - ARENA_PAD.t - chartPadBottom);
  assert.equal(arenaPlotBox(400, 200).x, chartPadLeft);
  assert.equal(arenaPlotBoxH(400, 200).x, chartPadCategory);
  assert.equal(arenaCategoryLabelX(), chartPadCategory - chartLabelGap);
  assert.equal(arenaCategoryGutter(100).w, chartPadCategory);
  assert.equal(arenaHeatmapHeight(3), 3 * chartHeatmapRowH + ARENA_PAD.t + chartPadBottom + chartLegendStrip);
  assert.equal(arenaHeatLegendStrip(300).stripH, chartLegendStrip);
  assert.equal(arenaLegendStrip(300, 2).stripH, chartLegendStrip);
  assert.equal(arenaTextGutter(['1234567890']), Math.max(chartPadLeft, Math.ceil(10 * chartTickChar) + chartLabelGap));
  assert.equal(arenaFunnelBox(400, 200, 40).x, chartPadCategory);
  assert.equal(arenaHeatmapBox(400, 200).x, chartPadCategory);
  assert.equal(arenaHeatmapWidth(100, 50, 20), chartPadCategory + ARENA_PAD.r + 20 * 50);
  assert.equal(arenaLabelStride(10, ['abcdef']), Math.max(1, Math.ceil((Math.ceil(6 * chartTickChar) + chartLabelGap) / 10)));
  assert.equal(arenaRadarRadius(300, 300), Math.max(1, 150 - chartPadBottom));
  assert.equal(arenaGaugeRadii(400, 300).label, arenaGaugeRadii(400, 300, ARENA_TEXT_ROOM).label);
});

test('a heatmap row grows with the text', () => {
  const room = arenaTextRoom(2);
  assert.equal(arenaHeatmapHeight(3, room), 3 * chartHeatmapRowH * 2 + ARENA_PAD.t + chartPadBottom * 2 + chartLegendStrip * 2);
  assert.ok(arenaHeatmapHeight(3, room) > arenaHeatmapHeight(3));
});

test('the category gutter, the plot padding and the legend strip follow the scale; marks and gaps stay put', () => {
  const room = arenaTextRoom(1.5);
  assert.equal(arenaPlotBoxH(600, 300, room).x, chartPadCategory * 1.5);
  assert.equal(arenaPlotBox(600, 300, undefined, room).x, chartPadLeft * 1.5);
  assert.equal(arenaPlotBox(600, 300, undefined, room).h, 300 - ARENA_PAD.t - chartPadBottom * 1.5);
  assert.equal(arenaLegendStrip(300, 2, false, room).stripH, chartLegendStrip * 1.5);
  assert.equal(arenaCategoryLabelX(room), chartPadCategory * 1.5 - chartLabelGap);
});

test('a point-spaced plot reserves the scaled left pad, a category gutter and a heatmap minimum width follow the room', () => {
  const room = arenaTextRoom(2);
  assert.equal(arenaPlotWidth(100, 10, 30, room), chartPadLeft * 2 + ARENA_PAD.r + 30 * 9);
  assert.equal(arenaPlotWidth(100, 10, 30), chartPadLeft + ARENA_PAD.r + 30 * 9);
  assert.equal(arenaCategoryGutter(120, room).w, chartPadCategory * 2);
  assert.equal(arenaCategoryGutter(120, room).h, 120);
  assert.equal(arenaHeatmapWidth(100, 50, 20, room), chartPadCategory * 2 + ARENA_PAD.r + 20 * 50);
});

test('the gauge word sits where it sat at the default and drops with the growth of the reading', () => {
  assert.equal(arenaGaugeWordY(100), 100 + chartLabelGap);
  assert.equal(arenaGaugeWordY(100, arenaTextRoom(1)), 100 + chartLabelGap);
  assert.ok(arenaGaugeWordY(100, arenaTextRoom(2)) > 100 + chartLabelGap);
  assert.ok(Math.abs(arenaGaugeWordY(100, arenaTextRoom(3)) - arenaGaugeWordY(100, arenaTextRoom(2)) - (arenaGaugeWordY(100, arenaTextRoom(2)) - arenaGaugeWordY(100))) < 1e-9);
});

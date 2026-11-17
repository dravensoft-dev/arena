import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARENA_PAD, ARENA_TEXT_ROOM, arenaPad, arenaPlotWidth, arenaTextRoom, arenaValueWriter } from '../../DataVisuals.ts';
import {
  arenaCategoryGutter, arenaCategoryLabelX, arenaFunnelBox, arenaHeatmapBox, arenaHeatmapHeight, arenaHeatmapWidth,
  arenaLabelStride, arenaPlotBox, arenaPlotBoxH, arenaTextGutter, arenaValueGutter,
} from './ChartAxis.ts';
import { arenaGaugeRadii, arenaFitLabel, arenaRadarFitLabel, arenaRadarLabelChar, arenaGaugeWordY, arenaRadarLabelRoom, arenaRadarLabelRadius, arenaRadarRadius } from './ChartPolar.ts';
import { arenaHeatLegendStrip, arenaLegendStrip } from './ChartLegend.ts';
import { arenaNiceDomain } from './ChartScales.ts';
import {
  chartGaugeReadingDescent, chartHeatmapRowH, chartLabelGap, chartLegendStrip, chartPadBottom, chartPadCategory, chartPadLeft, chartPadRight, chartPadTop, chartTickChar, chartLabelChar,
} from '../../Tokens.generated.js';

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
  assert.equal(arenaHeatmapHeight(3, room), 3 * chartHeatmapRowH * 2 + chartPadTop * 2 + chartPadBottom * 2 + chartLegendStrip * 2);
  assert.ok(arenaHeatmapHeight(3, room) > arenaHeatmapHeight(3));
});

test('the category gutter, the plot padding and the legend strip follow the scale; marks and gaps stay put', () => {
  const room = arenaTextRoom(1.5);
  assert.equal(arenaPlotBoxH(600, 300, room).x, chartPadCategory * 1.5);
  assert.equal(arenaPlotBox(600, 300, undefined, room).x, chartPadLeft * 1.5);
  assert.equal(arenaPlotBox(600, 300, undefined, room).h, 300 - chartPadTop * 1.5 - chartPadBottom * 1.5);
  assert.equal(arenaLegendStrip(300, 2, false, room).stripH, chartLegendStrip * 1.5);
  assert.equal(arenaCategoryLabelX(room), chartPadCategory * 1.5 - chartLabelGap);
});

test('a point-spaced plot reserves the scaled left pad, a category gutter and a heatmap minimum width follow the room', () => {
  const room = arenaTextRoom(2);
  assert.equal(arenaPlotWidth(100, 10, 30, room), chartPadLeft * 2 + chartPadRight * 2 + 30 * 9);
  assert.equal(arenaPlotWidth(100, 10, 30), chartPadLeft + ARENA_PAD.r + 30 * 9);
  assert.equal(arenaCategoryGutter(120, room).w, chartPadCategory * 2);
  assert.equal(arenaCategoryGutter(120, room).h, 120);
  assert.equal(arenaHeatmapWidth(100, 50, 20, room), chartPadCategory * 2 + chartPadRight * 2 + 20 * 50);
});

test('the gauge word sits where it sat at the default and drops with the growth of the reading', () => {
  assert.equal(arenaGaugeWordY(100), 100 + chartLabelGap);
  assert.equal(arenaGaugeWordY(100, arenaTextRoom(1)), 100 + chartLabelGap);
  assert.ok(arenaGaugeWordY(100, arenaTextRoom(2)) > 100 + chartLabelGap);
  assert.ok(Math.abs(arenaGaugeWordY(100, arenaTextRoom(3)) - arenaGaugeWordY(100, arenaTextRoom(2)) - (arenaGaugeWordY(100, arenaTextRoom(2)) - arenaGaugeWordY(100))) < 1e-9);
});

test('the top and right pads hold half a tick label, so they grow with the text', () => {
  const room = arenaTextRoom(2);
  assert.deepEqual(arenaPad(room), { t: chartPadTop * 2, r: chartPadRight * 2, b: chartPadBottom * 2, l: chartPadLeft * 2 });
  assert.equal(arenaPlotBox(600, 300, undefined, room).y, chartPadTop * 2);
  assert.equal(arenaPlotBox(600, 300, undefined, room).w, 600 - chartPadLeft * 2 - chartPadRight * 2);
  assert.equal(arenaPlotBoxH(600, 300, room).y, chartPadTop * 2);
  assert.equal(arenaFunnelBox(600, 300, 40, room).y, chartPadTop * 2);
  assert.equal(arenaHeatmapBox(600, 300, room).w, 600 - chartPadCategory * 2 - chartPadRight * 2);
  assert.equal(ARENA_PAD.t, chartPadTop);
  assert.equal(ARENA_PAD.r, chartPadRight);
});

test('a radar spoke label that fits is drawn whole, and a longer one is cut to a prefix and an ellipsis', () => {
  assert.equal(arenaFitLabel('Latency', 100, 6), 'Latency');
  assert.equal(arenaFitLabel('Throughput', 60, 6), 'Throughput');
  assert.equal(arenaFitLabel('Throughput', 59, 6), 'Throughp\u2026');
  assert.equal(arenaFitLabel('Throughput', 30, 6), 'Thro\u2026');
  assert.equal(arenaFitLabel('Throughput', 0, 6), '\u2026');
  assert.equal(arenaFitLabel('', 0, 6), '');
  assert.equal(arenaFitLabel('', 0, 0), '');
});

test('the room beside a spoke label is measured to the frame edge on the side it is anchored to', () => {
  assert.equal(arenaRadarLabelRoom(233, 300, 'start'), 67);
  assert.equal(arenaRadarLabelRoom(40, 300, 'end'), 40);
  assert.equal(arenaRadarLabelRoom(100, 300, 'middle'), 200);
  assert.equal(arenaRadarLabelRoom(320, 300, 'start'), 0);
});

test('at the default room the radar demo labels are drawn whole at the frame the sinks use', () => {
  const labels = ['Latency', 'Throughput', 'Accuracy', 'Cost', 'Coverage', 'Uptime'];
  const width = 300;
  const r = arenaRadarLabelRadius(width, 214);
  labels.forEach((text, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / labels.length;
    const x = width / 2 + r * Math.cos(angle);
    const anchor = Math.abs(Math.cos(angle)) < 1e-6 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
    assert.equal(arenaFitLabel(text, arenaRadarLabelRoom(x, width, anchor), arenaRadarLabelChar()), text);
  });
  const big = arenaTextRoom(2);
  const rr = arenaRadarLabelRadius(width, 300, big);
  assert.notEqual(arenaFitLabel('Throughput', arenaRadarLabelRoom(width / 2 + rr * Math.cos(-Math.PI / 2 + Math.PI * 2 / 6), width, 'start'), arenaRadarLabelChar(big)), 'Throughput');
});

test('the radar label character width is the label token at the text scale, so fitting is on at every size', () => {
  assert.equal(arenaRadarLabelChar(), chartLabelChar);
  assert.equal(arenaRadarLabelChar(arenaTextRoom(2)), chartLabelChar * 2);
  assert.equal(arenaRadarLabelChar(arenaTextRoom(1.01)), chartLabelChar * 1.01);
  assert.equal(arenaFitLabel('Throughput', 0, arenaRadarLabelChar()), '\u2026');
});

test('a label is never cut below the width it is drawn at by default, so the cut grows from nothing as the text grows', () => {
  const room = 44;
  assert.equal(arenaRadarFitLabel('Throughput', room, arenaTextRoom(1)), 'Throughput');
  const slight = arenaRadarFitLabel('Throughput', room, arenaTextRoom(1.01));
  assert.ok(slight.endsWith('\u2026') && slight.length >= 'Throughput'.length - 2);
  const doubled = arenaRadarFitLabel('Throughput', room, arenaTextRoom(2));
  assert.ok(doubled.endsWith('\u2026') && doubled.length < slight.length);
  assert.equal(arenaRadarFitLabel('Throughput', 300, arenaTextRoom(2)), 'Throughput');
});

test('a label of wide glyphs is kept in the room at the default size and cut to it at a doubled one', () => {
  const label = 'WWWWWWWWWW';
  const room = 110;
  assert.equal(arenaRadarFitLabel(label, room, arenaTextRoom(1)), label);
  const doubled = arenaRadarFitLabel(label, room, arenaTextRoom(2));
  assert.ok(doubled.endsWith('\u2026'));
  assert.ok(doubled.length < label.length);
  assert.ok(Math.ceil((doubled.length - 1) * chartLabelChar * 2) <= room);
});

test('the gauge reading descent is 0.4 of the size the reading is set in', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('./arena-gauge-chart/ArenaGaugeChart.tsx'), /fontSize: 'var\(--dz-text-lg\)'/,
    'the gauge reading is no longer set in --dz-text-lg, so the descent token has nothing to follow');
  const { dz } = JSON.parse(read('../../../../contracts/design/spacing.json'));
  assert.equal(dz['text-lg'].$value.unit, 'px');
  assert.equal(chartGaugeReadingDescent, Number((0.4 * dz['text-lg'].$value.value).toFixed(2)));
});

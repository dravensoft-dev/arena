import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaLegendColumnWidth, arenaLegendPlotWidth, arenaLegendStacked, arenaLegendShows, arenaLegendStrip, arenaHeatLegendStrip,
} from './ChartLegend';
import { chartLegendStrip } from '../../Tokens.generated';

test('the legend takes 34% of a mid-size container', () => {
  assert.ok(Math.abs(arenaLegendColumnWidth(400) - 136) < 1e-9);
});

test('the legend never falls below its floor, however narrow the container', () => {

  for (const width of [0, 1, 100, 352]) assert.equal(arenaLegendColumnWidth(width), 120, `at width ${width}`);
});

test('the legend never exceeds its ceiling, however wide the container', () => {
  for (const width of [530, 600, 4000]) assert.equal(arenaLegendColumnWidth(width), 180, `at width ${width}`);
});

test('the plot is what is left after the legend and the gap between them', () => {
  assert.equal(arenaLegendPlotWidth(600), 600 - 180 - 16);
});

test('the plot width stays positive even in a container narrower than the legend alone', () => {
  for (const width of [0, 1, 50, 120]) {
    const plot = arenaLegendPlotWidth(width);
    assert.ok(plot >= 1, `plot width was ${plot} at container width ${width}`);
  }
});

test('the plot and the legend and the gap never claim more than the container has', () => {
  for (const width of [200, 400, 600, 1200]) {
    const used = arenaLegendPlotWidth(width) + arenaLegendColumnWidth(width) + 16;
    assert.ok(used <= width + 1e-9, `the layout claimed ${used} of a ${width}px container`);
  }
});

test('an explicit layout is obeyed at every width, because the caller measured something this cannot', () => {

  for (const width of [100, 400, 4000]) {
    assert.equal(arenaLegendStacked('stacked', width), true, `stacked at ${width}`);
    assert.equal(arenaLegendStacked('inline', width), false, `inline at ${width}`);
  }
});

test('auto stacks exactly while the legend column is narrower than its ceiling', () => {

  assert.equal(arenaLegendStacked('auto', 400), true, 'a 136px column stacks');
  assert.equal(arenaLegendStacked('auto', 4000), false, 'a column at the 180px ceiling goes inline');
});

test('the auto threshold is the ceiling itself, so a legend at its widest is the inline one', () => {
  const atCeiling = [...Array(40).keys()].map((i) => 500 + i * 10).find((w) => arenaLegendColumnWidth(w) === 180);
  assert.ok(atCeiling !== undefined, 'no width in the sweep reached the ceiling');
  assert.equal(arenaLegendStacked('auto', atCeiling), false);
});

test('a cartesian legend appears at two series and not at one, because one series is already named twice', () => {

  assert.equal(arenaLegendShows(0), false, 'no series');
  assert.equal(arenaLegendShows(1), false, 'the chart label and the table column already carry the name');
  for (const count of [2, 3, 8]) assert.equal(arenaLegendShows(count), true, `${count} series`);
});

test('the strip comes out of the plot, so the component is its height either way', () => {

  for (const count of [1, 2, 5]) {
    const strip = arenaLegendStrip(280, count);
    assert.equal(strip.plotH + strip.stripH, 280, `${count} series did not add up`);
  }
});

test('one series costs the plot nothing, which is what keeps every existing chart drawing what it drew', () => {
  const strip = arenaLegendStrip(280, 1);
  assert.equal(strip.stripH, 0);
  assert.equal(strip.plotH, 280);
});

test('two series pay exactly the strip token, once, however many more series follow', () => {

  const two = arenaLegendStrip(280, 2);
  assert.equal(two.stripH, 26);
  assert.equal(two.plotH, 254);
  assert.equal(arenaLegendStrip(280, 8).stripH, two.stripH, 'a strip is one row whatever it holds');
});

test('the plot keeps a positive height even when the strip is taller than the chart', () => {

  for (const height of [0, 1, 26, 27]) {
    const strip = arenaLegendStrip(height, 3);
    assert.ok(strip.plotH >= 1, `plot height was ${strip.plotH} at chart height ${height}`);
  }
});

test('the heat legend strip always comes out of the height, however few series the chart has', () => {
  for (const height of [40, 100, 280, 1000]) {
    const strip = arenaHeatLegendStrip(height);
    assert.equal(strip.stripH, chartLegendStrip);
    assert.equal(strip.plotH + strip.stripH, height, `at height ${height}`);
  }
});

test('the heat legend strip leaves at least one pixel of plot at any height', () => {
  for (const height of [0, 1, chartLegendStrip, chartLegendStrip + 1]) assert.ok(arenaHeatLegendStrip(height).plotH >= 1, `at height ${height}`);
});

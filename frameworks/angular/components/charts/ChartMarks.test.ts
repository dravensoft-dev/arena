import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CHART_HEIGHT, ARENA_PAD } from '../../DataVisuals';
import { arenaBarPath, arenaArcPath, arenaCurveTangents, arenaCurvePath, arenaCurveAreaPath, arenaLinePoints, arenaLineAreaPath, arenaFunnelRect, arenaFunnelConnector } from './ChartMarks';
import { arenaDoughnutSlices } from './ChartScales';
import { arenaDoughnutRadii } from './ChartAxis';

const BASELINE = ARENA_PAD.t + 244;

function controlPoints(d: string): [number, number][] {
  return [...d.matchAll(/Q(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

test('arenaBarPath is square at the zero line and rounded only at the data end', () => {
  const [x, w, yValue, yZero, r] = [10, 30, 20, 120, 6];
  const d = arenaBarPath(x, w, yValue, yZero, r);

  assert.ok(d.startsWith(`M${x},${yZero} `), `starts at the zero line: ${d}`);
  assert.ok(d.includes(`L${x + w},${yZero} Z`), `closes along the zero line: ${d}`);

  const points = controlPoints(d);
  assert.equal(points.length, 2, 'exactly two rounded corners');
  for (const [, py] of points) assert.equal(py, yValue, 'a curve control point is on the data end');
});

test('a bar below the zero line rounds its BOTTOM, because that is where its data ends', () => {

  const [x, w, yZero, yValue, r] = [10, 30, 120, 200, 6];
  const d = arenaBarPath(x, w, yValue, yZero, r);

  assert.ok(d.startsWith(`M${x},${yZero} `), `starts at the zero line: ${d}`);
  const points = controlPoints(d);
  assert.equal(points.length, 2);
  for (const [, py] of points) assert.equal(py, yValue, 'the curve sits on the data end, which is now the bottom');
});

test('the two directions are mirror images, so neither is the special case', () => {
  const up = controlPoints(arenaBarPath(0, 20, 40, 100, 4)).map(([, y]) => y);
  const down = controlPoints(arenaBarPath(0, 20, 160, 100, 4)).map(([, y]) => y);
  assert.deepEqual(up, [40, 40]);
  assert.deepEqual(down, [160, 160]);
});

test('a bar of no height still emits a path, so its hit target survives', () => {

  const d = arenaBarPath(10, 30, 120, 120, 6);
  assert.ok(d.startsWith('M10,120 '), d);
  assert.ok(d.endsWith('Z'), d);
  assert.ok(!d.includes('NaN'), d);
});

test('arenaBarPath never rounds wider than half the bar or taller than the bar', () => {

  assert.equal(arenaBarPath(0, 10, 0, 100, 999), arenaBarPath(0, 10, 0, 100, 5), 'clamped to w / 2');
  assert.equal(arenaBarPath(0, 100, 0, 3, 999), arenaBarPath(0, 100, 0, 3, 3), 'clamped to the height');
});

test('arenaBarPath with no radius is a plain rectangle path', () => {
  const [x, w, yValue, yZero] = [0, 10, 0, 40];
  const d = arenaBarPath(x, w, yValue, yZero, -5);

  const points = controlPoints(d);
  assert.equal(points.length, 2, 'exactly two corners');
  const corners = [[x, yValue], [x + w, yValue]];
  points.forEach(([px, py], i) => {
    assert.deepEqual([px, py], corners[i], `control point sits on the corner: ${d}`);
    assert.ok(d.includes(`${px},${py} ${px},${py}`), `endpoint collapses onto the same corner: ${d}`);
  });
  assert.ok(d.startsWith(`M${x},${yZero} `));
});

function subpathCount(d: string): number {
  return (d.match(/M/g) ?? []).length;
}

test('arenaArcPath draws an ordinary segment as a single subpath', () => {
  const d = arenaArcPath(50, 50, 40, 20, 0, Math.PI / 2);
  assert.equal(subpathCount(d), 1);
});

test('arenaArcPath splits a full circle into two arcs rather than a degenerate one', () => {

  const full = arenaArcPath(50, 50, 40, 20, 0, Math.PI * 2);
  assert.equal(subpathCount(full), 2, 'two halves, not one degenerate arc');
  const [first, second] = full.split(' M').map((s, i) => (i === 0 ? s : `M${s}`));

  assert.equal(first.match(/^M(-?[\d.]+),(-?[\d.]+)/)?.[0], 'M90,50');
  assert.ok(second.startsWith('M10,50'), `the second half starts opposite: ${second}`);
});

test('arenaArcPath treats a sweep beyond a full turn as a full circle too', () => {
  assert.equal(subpathCount(arenaArcPath(50, 50, 40, 20, 0, Math.PI * 2 + 0.5)), 2);
});

test('arenaArcPath sets the large-arc flag only past a half turn', () => {
  const small = arenaArcPath(50, 50, 40, 20, 0, Math.PI / 2);
  const large = arenaArcPath(50, 50, 40, 20, 0, Math.PI * 1.5);
  assert.match(small, /A40,40 0 0 1 /);
  assert.match(large, /A40,40 0 1 1 /);
});

test('arenaArcPath sweeps the outer edge forward and the inner edge back', () => {

  const d = arenaArcPath(50, 50, 40, 20, 0, Math.PI / 2);
  assert.match(d, /A40,40 0 0 1 .* A20,20 0 0 0 .*Z$/);
});

test('arenaArcPath places its corners on the two radii at the two angles', () => {
  const d = arenaArcPath(0, 0, 10, 5, 0, Math.PI / 2);

  assert.ok(d.startsWith('M10,0 '), d);
  assert.ok(d.endsWith('5,0 Z'), d);
});

test('a full-circle slice is drawn as two arcs, because one would collapse to nothing', () => {

  const [only] = arenaDoughnutSlices([42]);
  const { outer, inner } = arenaDoughnutRadii(400, ARENA_CHART_HEIGHT, 'doughnut');
  const d = arenaArcPath(200, ARENA_CHART_HEIGHT / 2, outer, inner, only.from, only.to);
  assert.equal(subpathCount(d), 2, `a full circle must be two subpaths: "${d}"`);
  assert.ok(!d.includes('NaN'), `the path is not a real path: "${d}"`);
});

test('the polyline is the coordinate pairs in series order, space separated', () => {
  assert.equal(arenaLinePoints([{ x: 1, y: 2 }, { x: 3, y: 4 }]), '1,2 3,4');
});

test('an empty series produces an empty polyline rather than a stray coordinate', () => {
  assert.equal(arenaLinePoints([]), '');
});

test('the area path closes the series down to the baseline at both ends', () => {
  const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
  const d = arenaLineAreaPath(points, BASELINE);

  assert.equal(d, `M10,${BASELINE} L10,20 L30,40 L50,60 L50,${BASELINE} Z`);
});

test('the area path traces the same coordinates the polyline does', () => {
  const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }];
  const d = arenaLineAreaPath(points, BASELINE);
  for (const point of points)
    assert.ok(d.includes(`${point.x},${point.y}`), `the area path is missing point ${point.x},${point.y}`);
});

test('an empty series paints no area at all, rather than an M-only path', () => {
  assert.equal(arenaLineAreaPath([], BASELINE), '');
});

test('a single point still closes into a real (zero-width) region', () => {
  assert.equal(arenaLineAreaPath([{ x: 10, y: 20 }], BASELINE), `M10,${BASELINE} L10,20 L10,${BASELINE} Z`);
});

test('a wedge with no hole runs through the centre instead of emitting a zero-radius arc', () => {

  const path = arenaArcPath(100, 100, 80, 0, 0, Math.PI / 2);
  assert.ok(path.startsWith('M100,100 L'), `a solid wedge starts at the centre, got ${path}`);
  assert.doesNotMatch(path, /A0,0/, 'an arc of radius zero is a command that says nothing and asks a renderer to guess');
  assert.equal((path.match(/A/g) ?? []).length, 1, 'a wedge has one arc, its outer edge');
});

test('a hole of zero closes the wedge, so a solid slice is still one filled region', () => {
  const path = arenaArcPath(100, 100, 80, 0, 0, Math.PI / 2);
  assert.ok(path.trimEnd().endsWith('Z'), `the path does not close, got ${path}`);
});

test('a full circle with no hole is still split in two, because one arc cannot draw 360 degrees', () => {

  const path = arenaArcPath(100, 100, 80, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
  assert.equal((path.match(/A/g) ?? []).length, 2, 'a lone slice worth the whole total needs two half arcs');
  assert.equal((path.match(/M100,100/g) ?? []).length, 2, 'each half is its own wedge from the centre');
});

test('a doughnut path is untouched by the branch a pie needed', () => {

  const path = arenaArcPath(100, 100, 80, 50, 0, Math.PI / 2);
  assert.ok(path.startsWith('M180,100'), `a ring still starts on its outer edge, got ${path}`);
  assert.equal((path.match(/A/g) ?? []).length, 2, 'a ring has two arcs, outer and inner');
});

function sampleCurve(points: { x: number; y: number }[], steps: number): { x: number; y: number }[] {

  const m = arenaCurveTangents(points);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = (b.x - a.x) / 3;
    const p1 = { x: a.x + dx, y: a.y + m[i]! * dx };
    const p2 = { x: b.x - dx, y: b.y - m[i + 1]! * dx };
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const u = 1 - t;
      out.push({
        x: u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y,
      });
    }
  }
  return out;
}

test('a curve never leaves the band its own two points define, which is what stops it inventing data', () => {

  const points = [{ x: 0, y: 100 }, { x: 50, y: 100 }, { x: 100, y: 20 }, { x: 150, y: 90 }, { x: 200, y: 88 }];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    for (const sample of sampleCurve([a, b], 20)) {
      assert.ok(sample.y >= lo - 1e-9 && sample.y <= hi + 1e-9,
        `between (${a.x},${a.y}) and (${b.x},${b.y}) the curve reached ${sample.y}`);
    }
  }
});

test('a spike does not dig a valley beside it, because a turning point gets a flat tangent', () => {

  const points = [{ x: 0, y: 100 }, { x: 50, y: 20 }, { x: 100, y: 100 }];
  const m = arenaCurveTangents(points);
  assert.equal(m[1], 0, 'the tangent at a local extreme must be flat or the curve overshoots past it');
  for (const sample of sampleCurve(points, 40)) {
    assert.ok(sample.y <= 100 + 1e-9, `the curve rose past both ends, to ${sample.y}`);
    assert.ok(sample.y >= 20 - 1e-9, `the curve dipped below the peak value, to ${sample.y}`);
  }
});

test('a curve over values that never cross zero does not cross it either', () => {

  const zero = 200;
  const points = [{ x: 0, y: 190 }, { x: 40, y: 30 }, { x: 80, y: 195 }, { x: 120, y: 60 }];
  for (const sample of sampleCurve(points, 40)) {
    assert.ok(sample.y < zero, `the curve reached ${sample.y}, at or past the zero line at ${zero}`);
  }
});

test('two points curve into the straight line they always were', () => {
  const points = [{ x: 0, y: 10 }, { x: 100, y: 90 }];
  for (const sample of sampleCurve(points, 20)) {
    const straight = 10 + (sample.x / 100) * 80;
    assert.ok(Math.abs(sample.y - straight) < 1e-6, `at x ${sample.x} the curve was ${sample.y}, the line ${straight}`);
  }
});

test('a flat run stays flat rather than rippling between equal values', () => {
  const points = [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }, { x: 150, y: 20 }];
  for (const sample of sampleCurve(points.slice(0, 3), 20)) {
    assert.ok(Math.abs(sample.y - 50) < 1e-9, `a run of equal values rippled to ${sample.y}`);
  }
});

test('a curve path starts where the line does and carries one cubic per gap', () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 40 }, { x: 100, y: 20 }];
  const path = arenaCurvePath(points);
  assert.ok(path.startsWith('M0,10'), `got ${path}`);
  assert.equal((path.match(/C/g) ?? []).length, 2);
});

test('a curve with no points and a curve with one draw nothing rather than a stray move', () => {
  assert.equal(arenaCurvePath([]), '');
  assert.equal(arenaCurvePath([{ x: 5, y: 5 }]), 'M5,5');
  assert.equal(arenaCurveAreaPath([], 100), '');
});

test('a curved area closes to the baseline at both ends, as the straight one does', () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 40 }];
  const area = arenaCurveAreaPath(points, 200);
  assert.ok(area.startsWith('M0,200 L0,10'), `got ${area}`);
  assert.ok(area.endsWith('L50,200 Z'), `got ${area}`);
});

const edge = (y: number, size: number) => ({ y, width: size });
const box = (x: number, y: number, size: number, high: number) => [x, y, size, high].join(' ');

test('a funnel rectangle is centred on the axis and keeps the width and height it is given', () => {
  const rect = arenaFunnelRect(300, 40, 24, 100);
  assert.equal([rect.x, rect.y, rect.width, rect.height].join(' '), box(250, 40, 100, 24));
  assert.equal(arenaFunnelRect(300, 40, 24, 0).x, 300, 'a zero width sits on the axis');
});

test('a funnel connector\'s four corners sit at the two edges\' ends', () => {
  const d = arenaFunnelConnector(300, edge(64, 200), edge(80, 60));
  assert.equal(d, 'M200,64 L400,64 L330,80 L270,80 Z');
  const points = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(points.length, 4);
  assert.deepEqual(points.map(([x]) => (x as number) - 300), [-100, 100, 30, -30], 'symmetric about the axis');
});

test('a connector to a zero-width edge closes to a point on the axis', () => {
  assert.equal(arenaFunnelConnector(100, edge(0, 40), edge(10, 0)), 'M80,0 L120,0 L100,10 L100,10 Z');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintedOutsiders, outsiderLines, readingProblems, main, node, SINK, type IslandReading } from './check-palette-islands.ts';

const LIGHT = ['rgb(255, 255, 255)', 'rgb(10, 10, 10)', 'rgb(1, 2, 3)'];
const DARK = ['rgb(20, 16, 16)', 'rgb(243, 237, 229)', 'rgb(1, 2, 3)'];

const island = (painted: IslandReading['painted'], over: Partial<IslandReading> = {}): IslandReading => ({
  palette: 'light', island: LIGHT, outer: DARK, painted, bubbles: 1, elements: 9, ...over,
});

test('a painted colour found only in the outer palette is an outsider', () => {
  const found = paintedOutsiders(new Set(LIGHT), new Set(DARK), new Set(['rgb(20, 16, 16)', 'rgb(255, 255, 255)']));
  assert.deepEqual(found, ['rgb(20, 16, 16)']);
});

test('a colour both palettes hold is ignored, since the island owns it as much as the page does', () => {
  assert.deepEqual(paintedOutsiders(new Set(LIGHT), new Set(DARK), new Set(['rgb(1, 2, 3)'])), []);
});

test('a colour in neither palette is not an outsider, since it came from neither', () => {
  assert.deepEqual(paintedOutsiders(new Set(LIGHT), new Set(DARK), new Set(['rgb(9, 9, 9)'])), []);
});

test('a finding names the layer, the page, the selector, the property and the colour', () => {
  const lines = outsiderLines('angular', 'dark', island([
    { selector: 'overlay span[data-arena-part="tooltip.bubble"]', property: 'background-color', colour: 'rgb(243, 237, 229)' },
    { selector: 'div.x', property: 'color', colour: 'rgb(10, 10, 10)' },
  ]));
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /^angular palettes\?theme=dark overlay span\[data-arena-part="tooltip\.bubble"\] background-color rgb\(243, 237, 229\)/);
});

test('an island with no tooltip, no paint, or two palettes that agree is a problem and not a pass', () => {
  const page = (one: IslandReading) => ({ layer: 'react', theme: 'dark', islands: [one] });
  const painted = [{ selector: 'div', property: 'color', colour: 'rgb(10, 10, 10)' }];
  assert.deepEqual(readingProblems(page(island(painted))), []);
  assert.match(readingProblems(page(island(painted, { bubbles: 0 })))[0] ?? '', /no tooltip opened/);
  assert.match(readingProblems(page(island([])))[0] ?? '', /no painted colour/);
  assert.match(readingProblems(page(island(painted, { outer: [] })))[0] ?? '', /resolved to no colour/);
  assert.match(readingProblems(page(island(painted, { outer: ['rgb(1, 2, 3)'] })))[0] ?? '', /hold the same colours/);
  assert.match(readingProblems({ layer: 'react', theme: 'dark', islands: [] })[0] ?? '', /no palette island/);
});

test('main exits 1 with a message naming layer, sink, theme, selector, property and colour', async () => {
  const lines: string[] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => { lines.push(args.join(' ')); };
  let code = 0;
  try {
    const problems = readingProblems({ layer: 'angular', theme: 'light', islands: [island([
      { selector: 'span.bubble', property: 'background-color', colour: 'rgb(20, 16, 16)' },
    ])] });
    await main(async () => ({ problems, pages: 1, islands: 1 }), ((c: number) => { code = c; return undefined as never; }));
  } finally {
    console.error = realError;
  }
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /angular palettes\?theme=light span\.bubble background-color rgb\(20, 16, 16\)/);
});

test('main exits 0 silently on a clean sweep', async () => {
  let code = -1;
  await main(async () => ({ problems: [], pages: 4, islands: 8 }), ((c: number) => { code = c; return undefined as never; }));
  assert.equal(code, -1);
});

test('the gate sits in the browser pool and reads the sink it draws', () => {
  assert.equal(SINK, 'palettes');
  assert.ok(node.reads.some((one) => one.includes('kitchen-sink/palettes')));
});

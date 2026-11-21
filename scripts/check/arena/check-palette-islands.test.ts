import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintedOutsiders, outsiderLines, readingProblems, readIslandProblems, main, node, type IslandReading } from './check-palette-islands.ts';

const LIGHT = ['rgb(255, 255, 255)', 'rgb(10, 10, 10)', 'rgb(1, 2, 3)'];
const DARK = ['rgb(20, 16, 16)', 'rgb(243, 237, 229)', 'rgb(1, 2, 3)'];

const island = (painted: IslandReading['painted'], over: Partial<IslandReading> = {}): IslandReading => ({
  palette: 'light', island: LIGHT, outer: DARK, painted, bubbles: 1, elements: 9, nested: [], waits: { opened: true, closed: true }, ...over,
});

test('paintedOutsiders keeps a painted colour found only in the outer palette, and ignores one both palettes hold or neither holds', () => {
  const rows: { name: string; painted: string[]; expected: string[] }[] = [
    { name: 'a painted colour found only in the outer palette is an outsider', painted: ['rgb(20, 16, 16)', 'rgb(255, 255, 255)'], expected: ['rgb(20, 16, 16)'] },
    { name: 'a colour both palettes hold is ignored, since the island owns it as much as the page does', painted: ['rgb(1, 2, 3)'], expected: [] },
    { name: 'a colour in neither palette is not an outsider, since it came from neither', painted: ['rgb(9, 9, 9)'], expected: [] },
  ];
  for (const row of rows) assert.deepEqual(paintedOutsiders(new Set(LIGHT), new Set(DARK), new Set(row.painted)), row.expected, row.name);
});

test('a finding names the layer, the page, the selector, the property and the colour', () => {
  const lines = outsiderLines('angular', 'dark', island([
    { selector: 'overlay span[data-arena-part="tooltip.bubble"]', property: 'background-color', colour: 'rgb(243, 237, 229)' },
    { selector: 'div.x', property: 'color', colour: 'rgb(10, 10, 10)' },
  ]));
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /^angular palettes\?theme=dark overlay span\[data-arena-part="tooltip\.bubble"\] background-color rgb\(243, 237, 229\)/);
});

const painted = [{ selector: 'div', property: 'color', colour: 'rgb(10, 10, 10)' }];
const readingPage = (one: IslandReading) => ({ layer: 'react', theme: 'dark', islands: [one] });

test('an island with no tooltip, no paint, no palette, two palettes that agree or a probe that moves inside the opposite class is a problem and not a pass', () => {
  const rows: { name: string; page: ReturnType<typeof readingPage>; count?: number; patterns?: RegExp[]; oneProblem?: RegExp[] }[] = [
    { name: 'a complete island is clean', page: readingPage(island(painted)), count: 0 },
    { name: 'no tooltip opened', page: readingPage(island(painted, { bubbles: 0 })), patterns: [/no tooltip opened/] },
    { name: 'no painted colour', page: readingPage(island([])), patterns: [/no painted colour/] },
    { name: 'an outer palette that resolved to no colour', page: readingPage(island(painted, { outer: [] })), patterns: [/resolved to no colour/] },
    { name: 'palettes that agree hold nothing the other lacks', page: readingPage(island(painted, { outer: ['rgb(1, 2, 3)'] })), patterns: [/holds nothing the other lacks/] },
    { name: 'a page with no island', page: { layer: 'react', theme: 'dark', islands: [] }, patterns: [/no palette island/] },
    { name: 'the palettes must each hold a colour the other lacks, not only the island one',
      page: readingPage(island(painted, { island: ['rgb(1, 2, 3)'], outer: ['rgb(1, 2, 3)', 'rgb(9, 9, 9)'] })), patterns: [/holds nothing the other lacks/] },
    { name: 'a colour that changes when the probe sits inside the opposite class is named',
      page: readingPage(island(painted, { nested: ['--mute'] })), oneProblem: [/--mute/, /opposite/] },
  ];
  for (const row of rows) {
    const problems = readingProblems(row.page);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    (row.patterns ?? []).forEach((pattern) => assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`));
    if (row.oneProblem) assert.ok(problems.some((one) => row.oneProblem!.every((pattern) => pattern.test(one))), `${row.name}: one problem names ${row.oneProblem}`);
  }
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
  assert.ok(node.reads.some((one) => one.includes('kitchen-sink/palettes')));
});

test('a bubble that did not open or close is a problem naming the island', () => {
  assert.deepEqual(readIslandProblems('react palettes?theme=dark light island', { opened: true, closed: true }), []);
  assert.match(readIslandProblems('x', { opened: false, closed: true })[0] ?? '', /bubble did not open/);
  assert.match(readIslandProblems('x', { opened: true, closed: false })[0] ?? '', /bubble did not close/);
});

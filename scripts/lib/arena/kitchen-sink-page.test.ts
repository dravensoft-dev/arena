/* The readiness signal is run here rather than read, because what it has to get right is an
 * order of events and a string match would pass on any spelling of the wrong one. The document
 * is a stub with one moving part, `document.fonts`, since that is the only thing the signal
 * asks about; frames are microtasks so a turn can be driven to exhaustion. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READY, READY_SIGNAL, SPRITE, kitchenSinkPage, entryFile, bodyClass, varsStyle, KS } from './kitchen-sink-page.ts';

type Fonts = { status: string; ready: Promise<void> };
type Use = { getBBox: () => { width: number; height: number } };

const FRAME_BUDGET = 500;

function harness(fonts: Fonts, uses: Use[] = []) {
  const marks = new Set<string>();
  const document = {
    fonts,
    querySelectorAll: () => uses,
    documentElement: {
      setAttribute: (name: string) => { marks.add(name); },
      hasAttribute: (name: string) => marks.has(name),
    },
  };
  let frames = 0;
  const requestAnimationFrame = (fn: () => void) => {
    if (frames >= FRAME_BUDGET) return;
    frames += 1;
    queueMicrotask(fn);
  };
  const run = new Function('document', 'requestAnimationFrame', `return ${READY_SIGNAL}`);
  void run(document, requestAnimationFrame);
  return { painted: () => marks.has(READY), frames: () => frames };
}

async function turns(count = 40) {
  for (let i = 0; i < count; i += 1) await Promise.resolve();
}

test('a page whose fonts finish after the first resolution waits for them, and only then paints', async () => {
  let settle = () => {};
  const fonts: Fonts = { status: 'loading', ready: new Promise<void>((done) => { settle = done; }) };
  const { painted } = harness(fonts);

  settle();
  await turns();
  assert.equal(painted(), false,
    'document.fonts.ready answers for the loads in flight when it is read, and mounting the page '
    + 'is what starts the rest, so the first resolution is a snapshot taken before the question');

  fonts.status = 'loaded';
  fonts.ready = Promise.resolve();
  await turns();
  assert.equal(painted(), true, 'once the set is loaded and two frames have passed, the page has painted');
});

test('a page whose fonts never settle never says it painted, so the gate reports that and not a difference', async () => {
  const fonts: Fonts = { status: 'loading', ready: Promise.resolve() };
  const { painted, frames } = harness(fonts);
  await turns(FRAME_BUDGET * 4);
  assert.ok(frames() >= FRAME_BUDGET, 'the wait has to keep asking, or the case below proves nothing');
  assert.equal(painted(), false,
    'a signal that gave up and marked the page anyway would hand the comparison a half-drawn '
    + 'capture, which reads as two layers disagreeing rather than as one page that never finished');
});

test('a page with nothing to load paints on the first pass, since a wait needs something to wait for', async () => {
  const { painted } = harness({ status: 'loaded', ready: Promise.resolve() });
  await turns();
  assert.equal(painted(), true);
});

test('the signal is an expression, because both layers embed it inside one', () => {
  assert.doesNotThrow(() => new Function(`return ${READY_SIGNAL}`),
    'react emits it as a statement and angular inside a .then() arrow, and a statement fits neither');
});

test('the page carries the theme control the query parameter needs, and the scope class it is named for', () => {
  const page = kitchenSinkPage({
    sink: 'editorial', up: '../../../../', banner: '', mount: '<div id="root"></div>',
    script: './editorial.sink.entry.generated.js',
  });
  assert.match(page, /class="dtoggle themebtn"/,
    'intro/theme.js applies nothing until it finds one, so a page without it ignores ?theme=');
  assert.match(page, /<html lang="en" class="arena-editorial">/);
});

test('an entry file is named for its arrangement and its layer, so one page never loads the other\'s', () => {
  assert.equal(entryFile('editorial', 'tsx'), 'editorial.sink.entry.generated.tsx');
  assert.equal(entryFile('editorial', 'ts'), 'editorial.sink.entry.generated.ts');
});

test('a staged component gets the stage class and every other one the plain body', () => {
  assert.equal(bodyClass(true), KS.stage);
  assert.equal(bodyClass(false), KS.body);
});

test('a fixture\'s vars are written as the style of the wrapper, and a fixture without any writes none', async () => {
  const { tile } = await import('../react/kitchen-sink-react.ts');
  const { angularSinkEntry } = await import('../angular/kitchen-sink-angular.ts');
  const vars = { '--arena-column-status-align': 'right', '--arena-column-status-width': '8rem' };
  const node = { text: 'x' };
  const item = (own?: Record<string, string>, label = 'ArenaTable') =>
    ({ component: 'ArenaTable', label, node, staged: false, ...(own ? { vars: own } : {}) });
  assert.equal(varsStyle(vars), '--arena-column-status-align: right; --arena-column-status-width: 8rem');
  assert.equal(varsStyle(undefined), '');
  const react = tile(item(vars), new Map(), 0);
  assert.ok(react.includes(`<div className="${KS.body}" style={${JSON.stringify(vars)} as React.CSSProperties}>`), react);
  assert.doesNotMatch(tile(item(), new Map(), 0), /style=/);
  const entry = (own?: Record<string, string>) => angularSinkEntry(
    { sink: 's', note: '', uses: [], sections: [{ title: 't', items: [item(own)] }] }, new Map(), new Map(), '', '');
  assert.ok(entry(vars).includes(`<div class="${KS.body}" style="${varsStyle(vars)}">`));
  assert.doesNotMatch(entry(), new RegExp(`class="${KS.body}" style=`));
});

test('a tile is labelled with its item as the arrangement spells it, a variant included, in both layers', async () => {
  const { tile } = await import('../react/kitchen-sink-react.ts');
  const { angularSinkEntry } = await import('../angular/kitchen-sink-angular.ts');
  const item = { component: 'ArenaGaugeChart', variant: 'at-min', label: 'ArenaGaugeChart:at-min', node: { text: 'x' }, staged: false };
  assert.ok(tile(item, new Map(), 0).includes(`<span className="${KS.label}">ArenaGaugeChart:at-min</span>`));
  const entry = angularSinkEntry(
    { sink: 'charts', note: '', uses: [], sections: [{ title: 't', items: [item] }] }, new Map(), new Map(), '', '');
  assert.ok(entry.includes(`<span class="${KS.label}">ArenaGaugeChart:at-min</span>`), entry);
});

test('the kitchen-sink ready signal waits for the sprite', async () => {
  const use = { box: 0, getBBox() { return { width: this.box, height: this.box }; } };
  const fonts: Fonts = { status: 'loaded', ready: Promise.resolve() };
  const { painted } = harness(fonts, [use]);
  await turns();
  assert.equal(painted(), false, 'an svg use with no box has not fetched its symbol, and a capture would show nothing');
  assert.ok(SPRITE.ms > 0 && SPRITE.why.length > 0, 'the wait is bounded by a deadline that carries its reason');

  use.box = 24;
  await turns();
  assert.equal(painted(), true, 'once every use has a box the page has painted');
});

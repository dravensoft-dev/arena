/* The readiness signal is run here rather than read, because what it has to get right is an
 * order of events and a string match would pass on any spelling of the wrong one. The document
 * is a stub with one moving part, `document.fonts`, since that is the only thing the signal
 * asks about; frames are microtasks so a turn can be driven to exhaustion. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READY, READY_SIGNAL, kitchenSinkPage, entryFile, bodyClass, KS } from './kitchen-sink-page.ts';

type Fonts = { status: string; ready: Promise<void> };

const FRAME_BUDGET = 500;

function harness(fonts: Fonts) {
  const marks = new Set<string>();
  const document = {
    fonts,
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
    extension: 'editorial', up: '../../../../', banner: '', mount: '<div id="root"></div>',
    script: './editorial.sink.entry.generated.js',
  });
  assert.match(page, /class="dtoggle themebtn"/,
    'intro/theme.js applies nothing until it finds one, so a page without it ignores ?theme=');
  assert.match(page, /<html lang="en" class="arena-editorial">/);
});

test('an entry file is named for its voice and its layer, so one page never loads the other\'s', () => {
  assert.equal(entryFile('editorial', 'tsx'), 'editorial.sink.entry.generated.tsx');
  assert.equal(entryFile('editorial', 'ts'), 'editorial.sink.entry.generated.ts');
});

test('a staged component gets the stage class and every other one the plain body', () => {
  assert.equal(bodyClass(true), KS.stage);
  assert.equal(bodyClass(false), KS.body);
});

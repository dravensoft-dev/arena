import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaDialog } from './ArenaDialog.tsx';
import manifest from './ArenaDialog.manifest.generated.ts';
import family from '../../../../tailwind/vocabulary/arena-dialog-width/DialogWidth.family.json' with { type: 'json' };

const TITLE = 'Delete project';

test('the content slot renders as children, and the footer slot as its own row', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE} footer={<button type="button">Confirm</button>}>
      <p>This cannot be undone.</p>
    </ArenaDialog>,
  );
  assert.match(html, /<p>This cannot be undone\.<\/p>/);
  assert.match(html, /<button type="button">Confirm<\/button>/);
});

test('an absent footer renders no action row at all', () => {
  const withFooter = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE} footer={<button type="button">Confirm</button>}><p>b</p></ArenaDialog>,
  );
  const without = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>,
  );

  assert.equal((withFooter.match(/\barena-dialog__foot\b/g) || []).length, 1);
  assert.equal((without.match(/\barena-dialog__foot\b/g) || []).length, 0,
    'an empty action row shipped with no footer passed');
});

test('title is drawn, and the panel names itself with the element that carries it', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>,
  );
  const labelledBy = /aria-labelledby="([^"]+)"/.exec(html);
  assert.ok(labelledBy, 'the panel declared no aria-labelledby');

  const id = labelledBy[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titled = new RegExp(`<div id="${id}"[^>]*>${TITLE}</div>`);
  assert.match(html, titled, 'aria-labelledby did not point at the element drawing the title');
});

test('eyebrow is drawn above the title when given, and nothing is drawn when it is not', () => {
  const withEyebrow = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE} eyebrow="Confirm"><p>b</p></ArenaDialog>,
  );
  assert.match(withEyebrow, />Confirm</);
  assert.ok(withEyebrow.indexOf('>Confirm<') < withEyebrow.indexOf(`>${TITLE}<`),
    'the eyebrow was drawn after the title');
  const without = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>,
  );
  assert.doesNotMatch(without, /text-transform:uppercase/, 'an empty eyebrow row was drawn');
});

test('the panel carries no inline width, because the width is a family its class reads', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>,
  );
  assert.match(html, /\barena-dialog__panel\b/);
  assert.doesNotMatch(html, /style="/, 'a width written inline would beat the class and the property');
});

test('the panel slot reads the family channel, then its axis, then the default option\'s value', () => {
  const [, channel, value] = /^\[(--[\w-]+):(.+)\]$/.exec(family.variants[family.default as keyof typeof family.variants]) ?? [];
  assert.ok(channel && value);
  assert.ok(manifest.slots.panel.split(' ').includes(`w-[var(${channel},var(${family.axis},${value}))]`));
});

test('open governs whether anything renders at all', () => {
  assert.equal(
    renderToStaticMarkup(<ArenaDialog open={false} onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>),
    '',
    'a closed dialog rendered markup',
  );
  assert.notEqual(
    renderToStaticMarkup(<ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>),
    '',
  );
});

test('ArenaDialog drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaDialog open onClose={() => {}} title={TITLE} style={{ color: '#ff00ff' }}><p>b</p></ArenaDialog>,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered panel -- the R4 escape is back');
});

test('ArenaDialog drops a consumer attribute -- no {...rest} spread reaches the panel', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE} data-stray="x"><p>b</p></ArenaDialog>,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered panel -- a {...rest} escape is back');
});

test('title is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaDialog open onClose={() => {}}><p>b</p></ArenaDialog>),
    /ArenaDialog: `title` is required/,
  );
});

test('open is required and its absence throws, while false renders nothing and does not', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaDialog title={TITLE}><p>b</p></ArenaDialog>),
    /ArenaDialog: `open` is required/,
  );
  assert.doesNotThrow(
    () => renderToStaticMarkup(<ArenaDialog open={false} title={TITLE}><p>b</p></ArenaDialog>),
  );
});

test('the footer wraps, because the slot takes one control per element', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open title={TITLE} onClose={() => {}}
      footer={<><button type="button">Cancel</button><button type="button">Charge in full</button><button type="button">Record</button></>}>
      <p>b</p>
    </ArenaDialog>,
  );
  assert.match(html, /\barena-dialog__foot\b/,
    'three buttons at 390px overflow the panel without it, and the row is what has to wrap '
    + 'because the consumer passes siblings rather than a wrapper of their own; ArenaPageHead and '
    + 'ArenaChartCard already do this, and a third action row behaving differently is worse than none');
});

test('the panel pops with the shared utility, so nothing injects keyframes for it', () => {
  const html = renderToStaticMarkup(<ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>);
  assert.match(html, /\barena-dialog__panel\b/,
    'an entrance keeps its fade and drops its travel under reduced motion, and the utility is where that is said');
});

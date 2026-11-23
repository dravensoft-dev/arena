import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaDialog } from './ArenaDialog.tsx';
import manifest from './ArenaDialog.manifest.generated.ts';

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
  assert.doesNotMatch(without, /data-arena-part="dialog\.eyebrow"/, 'an empty eyebrow row was drawn');
});

test('the panel carries no inline width, because the width is a family its class reads', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>,
  );
  assert.match(html, /\barena-dialog__panel\b/);
  assert.doesNotMatch(html, /style="/, 'a width written inline would beat the class and the property');
});

test('the panel slot reads the width through the channel of the family the dialog answers', () => {
  const axis = `--arena-${manifest.answers.find((name) => name === 'dialog-width')}`;
  const token = manifest.slots.panel.split(' ').find((name) => name.includes(`var(${axis},`));
  assert.ok(token, `the panel slot reads no ${axis}`);
  assert.match(token, new RegExp(`^w-\\[var\\(--[\\w-]+,var\\(${axis},var\\(--dialog-width-md\\)\\)\\)\\]$`));
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

test('the footer draws its foot slot class', () => {
  const html = renderToStaticMarkup(
    <ArenaDialog open title={TITLE} onClose={() => {}}
      footer={<><button type="button">Cancel</button><button type="button">Charge in full</button><button type="button">Record</button></>}>
      <p>b</p>
    </ArenaDialog>,
  );
  assert.match(html, /\barena-dialog__foot\b/, 'the footer row did not draw its foot slot class');
});

test('the panel draws its panel slot class', () => {
  const html = renderToStaticMarkup(<ArenaDialog open onClose={() => {}} title={TITLE}><p>b</p></ArenaDialog>);
  assert.match(html, /\barena-dialog__panel\b/, 'the panel did not draw its panel slot class');
});

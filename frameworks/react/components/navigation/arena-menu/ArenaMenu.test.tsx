import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaMenu } from './ArenaMenu.tsx';

test('a closed ArenaMenu draws its trigger and no panel', () => {
  const html = renderToStaticMarkup(
    <ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />,
  );
  assert.match(html, /<button type="button" aria-haspopup="menu" aria-expanded="false">Open<\/button>/,
    'the popup state must sit on the real trigger button -- ARIA is not inherited from an ancestor');
  assert.doesNotMatch(html, /<span[^>]*aria-haspopup/, 'a wrapping span carried it');
  assert.doesNotMatch(html, /role="menu"/, 'the panel rendered before anything opened it');

  assert.equal((html.match(/Rename/g) || []).length, 0, 'an entry was drawn while the menu was closed');
});

test('ArenaMenu drops a consumer style object', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaMenu trigger={<button type="button">Open</button>} items={[]} style={{ color: '#ff00ff' }} />,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root');
});

test('ArenaMenu drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaMenu trigger={<button type="button">Open</button>} items={[]} data-stray="x" />,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('items is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaMenu trigger={<button type="button">Open</button>} />),
    /ArenaMenu: `items` is required/,
  );
});

test('an empty items array renders rather than throwing', () => {
  assert.doesNotThrow(
    () => renderToStaticMarkup(<ArenaMenu trigger={<button type="button">Open</button>} items={[]} />),
  );
});

test('a trigger that cannot carry attributes throws rather than silently losing them', () => {
  assert.throws(
    () => renderToStaticMarkup(<ArenaMenu trigger={<>Open</>} items={[]} />),
    /ArenaMenu: `trigger` must be a single element/,
    'a fragment passes isValidElement and swallows the clone, which is the silent half',
  );
  assert.throws(
    () => renderToStaticMarkup(<ArenaMenu trigger="Open" items={[]} />),
    /ArenaMenu: `trigger` must be a single element/,
  );
});

test('an item selects the disabled and destructive groups, and align end the panel group', async () => {
  const { arenaMenuStyles } = await import('../../../ArenaStyles.generated.ts').then(async (m) => ({ arenaMenuStyles: m.arenaStyles((await import('./ArenaMenu.classes.generated.ts')).default) }));
  assert.equal(arenaMenuStyles({ align: 'end' }).$data.panel()['data-arena-align'], 'end');
  assert.equal(arenaMenuStyles().$data.panel()['data-arena-align'], 'start');
  assert.deepEqual(arenaMenuStyles({ disabled: true }).$data.item(), { 'data-arena-disabled': '' });
  assert.deepEqual(arenaMenuStyles({ destructive: true }).$data.item(), { 'data-arena-destructive': '' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaAppLogo } from './ArenaAppLogo.tsx';

const MARK = <img src="../../../../../assets/rotor-crimson.svg" alt="" />;

test('throws without a mark', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaAppLogo name="Draven" />), /mark.*required/);
});

test('throws without a name', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaAppLogo mark={MARK} />), /required/);
});

test('throws when given neither', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaAppLogo />), /required/);
});

test('a size class reaches the root, and the lock-up writes no inline style', () => {
  for (const size of ['sm', 'md', 'lg', 'xl']) {
    const html = renderToStaticMarkup(<ArenaAppLogo className={`arena-size-${size}` as 'arena-size-sm'} mark={MARK} name="Draven" />);
    assert.match(html, new RegExp(`data-arena-part="app-logo"[^>]*\\barena-size-${size}\\b|\\barena-size-${size}\\b[^>]*data-arena-part="app-logo"`));
    assert.doesNotMatch(html, /style="/, 'the lock-up writes no inline style at all');
  }
});

test('dim renders the second half of the wordmark in --mute', () => {
  const html = renderToStaticMarkup(<ArenaAppLogo mark={MARK} name="Draven" dim="soft" />);
  assert.match(html, /soft/);
  assert.match(html, /\barena-app-logo__dim\b/);
});

test('without dim the wordmark is one ink', () => {
  const html = renderToStaticMarkup(<ArenaAppLogo mark={MARK} name="Dravensoft" />);
  assert.doesNotMatch(html, /\barena-app-logo__dim\b/);
});

test('an orientation class reaches the root', () => {
  const vertical = renderToStaticMarkup(<ArenaAppLogo className="arena-orientation-vertical" mark={MARK} name="Draven" />);
  assert.match(vertical, /\barena-orientation-vertical\b/);
  assert.doesNotMatch(vertical, /data-arena-orientation/);
});

test('the mark fills its sized slot through the slot, so nothing is cloned to make it', () => {
  const html = renderToStaticMarkup(<ArenaAppLogo mark={MARK} name="Draven" />);
  assert.match(html, /arena-app-logo__mark/, 'the slot sizes whatever child it is given');
  assert.match(html, /<img src="[^"]*" alt=""\/>/,
    'and the element the consumer passed reaches the page untouched');
});

test('a non-element mark passes through untouched too', () => {
  const html = renderToStaticMarkup(<ArenaAppLogo mark="M" name="Draven" />);
  assert.match(html, />M</);
});

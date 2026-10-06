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

test('a size picks both halves of the lock-up from the logo scale', () => {
  const html = renderToStaticMarkup(<ArenaAppLogo size="sm" mark={MARK} name="Draven" />);
  assert.match(html, /data-arena-part="app-logo.mark"[^>]*\bdata-arena-size="sm"/);
  assert.match(html, /data-arena-part="app-logo.name"[^>]*\bdata-arena-size="sm"/);
});

test('every step in the repertoire resolves, and none writes a number', () => {
  for (const size of ['sm', 'md', 'lg', 'xl']) {
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    const html = renderToStaticMarkup(<ArenaAppLogo size={size} mark={MARK} name="Draven" />);
    assert.match(html, new RegExp(`\\barena-app-logo__mark--size-${size}\\b`));
    assert.match(html, new RegExp(`\\barena-app-logo__name--size-${size}\\b`));

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

test('vertical orientation stacks the mark above the name and widens the gap', () => {
  const vertical = renderToStaticMarkup(<ArenaAppLogo orientation="vertical" mark={MARK} name="Draven" />);
  assert.match(vertical, /data-arena-part="app-logo"[^>]*\bdata-arena-orientation="vertical"/);
  assert.match(vertical, /data-arena-part="app-logo"[^>]*\bdata-arena-orientation="vertical"/);

  const horizontal = renderToStaticMarkup(<ArenaAppLogo mark={MARK} name="Draven" />);
  assert.match(horizontal, /data-arena-part="app-logo"[^>]*\bdata-arena-orientation="horizontal"/);
  assert.match(horizontal, /data-arena-part="app-logo"[^>]*\bdata-arena-orientation="horizontal"/);
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

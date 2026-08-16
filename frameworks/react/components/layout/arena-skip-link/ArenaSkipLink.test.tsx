/* Three of the link's four details are assertable from the markup: the element, where it points
 * and the guard on its words. The fourth, that it is the first focusable thing in the document,
 * is the consumer's placement and no component suite can see it, so the prompt carries it as the
 * one instruction the component cannot follow for itself. Visibility is CSS and is checked in a
 * real browser instead, which is why nothing here reads a class. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSkipLink } from './ArenaSkipLink.tsx';
import { ARENA_MAIN_ID } from '../arena-main/ArenaMain.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('it is a real anchor, so its role and its keyboard are the platform\'s', () => {
  const html = render(<ArenaSkipLink label="Skip to content" />);
  assert.match(html, /^<a /, 'a skip link that is not an anchor answers no key the platform gives it');
  assert.doesNotMatch(html, /role=/, 'naming a role on an anchor takes the anchor\'s own away');
  assert.match(html, />Skip to content<\/a>$/);
});

test('it points at the landmark by the constant both sides read', () => {
  assert.match(
    render(<ArenaSkipLink label="Skip to content" />),
    new RegExp(`href="#${ARENA_MAIN_ID}"`),
    'the id is written on the landmark from the same constant, so nothing is coordinated at the call site',
  );
});

test('a label of nothing but spaces is refused, the way every name only a human can supply is', () => {
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaSkipLink />), /`label` is required/);
  assert.throws(() => render(<ArenaSkipLink label="   " />), /`label` is required/,
    'a link that appears with no words is a link nobody can act on, and a blank string satisfies '
    + 'a falsiness test while naming nothing');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaAlert } from './ArenaAlert.tsx';

test('tone=danger renders role=alert; every other tone renders role=status', () => {
  const danger = renderIcons(<ArenaAlert tone="danger">Renew the certificate</ArenaAlert>);
  assert.match(danger, /role="alert"/);

  const info = renderIcons(<ArenaAlert tone="info">All good</ArenaAlert>);
  assert.match(info, /role="status"/);
});

test('actionLabel renders an action button with that label; absent renders no action', () => {
  const withAction = renderIcons(
    <ArenaAlert tone="warning" actionLabel="Go to production" onAction={() => {}}>Changes here don't affect real users.</ArenaAlert>
  );
  assert.match(withAction, /<button/);
  assert.match(withAction, /Go to production/);

  const withoutAction = renderIcons(<ArenaAlert tone="warning">No action here.</ArenaAlert>);
  assert.doesNotMatch(withoutAction, /<button/);
});

test('dismissible gates the close button; absent (even with onClose) renders no close button', () => {
  const dismissible = renderIcons(<ArenaAlert dismissible onClose={() => {}}>Dismiss me</ArenaAlert>);
  assert.match(dismissible, /aria-label="Dismiss"/);

  const notDismissible = renderIcons(<ArenaAlert onClose={() => {}}>Cannot dismiss me</ArenaAlert>);
  assert.doesNotMatch(notDismissible, /aria-label="Dismiss"/);
});

test('icon overrides the tone default glyph', () => {
  const html = renderIcons(<ArenaAlert tone="success" icon="ph-fill ph-rocket">Shipped</ArenaAlert>);
  assert.deepEqual(symbols(html).filter((id) => id !== 'bold-x'), ['fill-rocket'], 'the icon the consumer named is drawn');
  assert.doesNotMatch(html, /check-circle/);
});

test('the wrapper of the tone glyph is hidden from assistive technology', () => {
  const html = renderIcons(<ArenaAlert tone="info">All good</ArenaAlert>);
  assert.match(html, /<span[^>]*data-arena-part="alert\.icon"[^>]*aria-hidden="true"|<span[^>]*aria-hidden="true"[^>]*data-arena-part="alert\.icon"/);
});

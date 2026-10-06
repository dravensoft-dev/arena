import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaToast, ARENA_TOAST_DISMISS } from './ArenaToast.tsx';
import { dismissDefault, dismissActionable } from '../../../Tokens.generated.js';

test('actionLabel renders a real button carrying that label', () => {
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" actionLabel="Undo" onAction={() => {}} />);
  assert.match(html, /<button[^>]*>Undo<\/button>/, 'actionLabel did not render an action button');
});

test('a handler with no actionLabel renders no action button -- the label is what draws it', () => {
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" onAction={() => {}} />);
  assert.doesNotMatch(html, /<button/, 'an action button rendered from onAction alone, with no label to put in it');
});

test('dismissible shows the x, and it is the standard ph-x glyph', () => {
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" dismissible onClose={() => {}} />);
  assert.match(html, /aria-label="Close"/, 'dismissible did not render the close button');
  assert.match(html, /ph-bold ph-x/, 'the close button did not use the standard ph-x dismiss glyph');
});

test('onClose without dismissible shows no x -- the listener no longer gates the button', () => {
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" onClose={() => {}} />);
  assert.doesNotMatch(html, /<button/, 'the x rendered from an onClose listener alone -- the pre-EJ gate is back');
});

test('persist renders the Pinned marker, and its absence renders none', () => {
  const pinned = renderToStaticMarkup(<ArenaToast title="Pipeline failed" persist />);
  assert.match(pinned, />Pinned</, 'persist did not render the Pinned marker');
  assert.match(pinned, /data-persist=""/);
  const transient = renderToStaticMarkup(<ArenaToast title="Pipeline failed" />);
  assert.doesNotMatch(transient, />Pinned</, 'a transient toast drew the Pinned marker');
  assert.doesNotMatch(transient, /data-persist/);
});

test('the danger tone announces assertively as an alert', () => {
  const html = renderToStaticMarkup(<ArenaToast tone="danger" title="Pipeline failed" />);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="assertive"/);
  assert.match(html, /data-arena-part="toast"[^>]*\bdata-arena-tone="danger"/, 'the danger tone did not reach the side bar');
});

test('every other tone announces politely as a status', () => {
  for (const tone of ['neutral', 'success']) {
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    const html = renderToStaticMarkup(<ArenaToast tone={tone} title="Deployment archived" />);
    assert.match(html, /role="status"/, `tone="${tone}" announced as an alert`);
    assert.match(html, /aria-live="polite"/, `tone="${tone}" announced assertively`);
    assert.match(html, new RegExp(`data-arena-part="toast"[^>]*\\bdata-arena-tone="${tone}"`), `tone="${tone}" did not reach the side bar`);
  }

  assert.match(renderToStaticMarkup(<ArenaToast title="Deployment archived" />), /role="status"/);
});

test('ArenaToast drops a consumer style object -- the ...style escape is gone', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaToast drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(<ArenaToast title="Deployment archived" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('ARENA_TOAST_DISMISS carries the two token intervals, and the actionable one is the longer', () => {
  assert.deepEqual({ ...ARENA_TOAST_DISMISS }, { default: dismissDefault, actionable: dismissActionable });
  assert.ok(ARENA_TOAST_DISMISS.actionable > ARENA_TOAST_DISMISS.default,
    'a notice carrying a button asks the reader to decide rather than only to read, so it lives longer');
});

test('a gold toast is a toast with the arena-accent-gold class, and carries no gold tone', () => {
  const html = renderToStaticMarkup(<ArenaToast className="arena-accent-gold" title="Deployment archived" />);
  assert.match(html, /\bclass="[^"]*\barena-accent-gold\b[^"]*"[^>]*data-arena-part="toast"/);
  assert.doesNotMatch(html, /data-arena-tone="gold"/);
});

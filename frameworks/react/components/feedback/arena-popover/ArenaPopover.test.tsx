/* A server render of a popover is its trigger alone, open or not: the panel is placed by script, so
 * a panel drawn before hydration would sit where no script put it. The trigger still says what it
 * opens, and a closed one points at nothing, because a reference to a panel that is not there is
 * an overclaim rather than a promise. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaPopover } from './ArenaPopover.tsx';

const one = (open: boolean) => (
  <ArenaPopover label="Filters" open={open} trigger={<button type="button">Filters</button>}>
    <p>Only failing builds.</p>
  </ArenaPopover>
);

test('a closed popover draws its trigger, marked as opening a dialog, and no panel', () => {
  const html = renderToStaticMarkup(one(false));
  assert.match(html, /<button type="button" aria-haspopup="dialog" aria-expanded="false">Filters<\/button>/,
    'the popup state must sit on the real trigger button');
  assert.doesNotMatch(html, /aria-controls/, 'a closed trigger named a panel that is not there');
  assert.doesNotMatch(html, /role="dialog"|Only failing builds/, 'the content rendered while closed');
});

test('an open popover rendered on the server still draws no panel', () => {
  const html = renderToStaticMarkup(one(true));
  assert.doesNotMatch(html, /role="dialog"/, 'the server drew a panel no script has placed');
  assert.match(html, /aria-expanded="false"/, 'the trigger claimed a panel the page does not hold');
});

test('label is required and guarded after trimming, whether or not the panel is open', () => {
  for (const label of ['', '   ']) {
    assert.throws(
      () => renderToStaticMarkup(<ArenaPopover label={label} trigger={<button type="button">Filters</button>}><p>x</p></ArenaPopover>),
      /ArenaPopover: `label` is required/,
    );
  }
});

test('a fragment or a string is refused as the trigger, because neither takes the popup state', () => {
  assert.throws(() => renderToStaticMarkup(<ArenaPopover label="Filters" trigger="Filters"><p>x</p></ArenaPopover>),
    /single element/);
  assert.throws(() => renderToStaticMarkup(
    <ArenaPopover label="Filters" trigger={<><button type="button">Filters</button></>}><p>x</p></ArenaPopover>), /single element/);
});

test('ArenaPopover drops a consumer attribute and a consumer style', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaPopover label="Filters" trigger={<button type="button">Filters</button>} data-stray="x" style={{ color: '#ff00ff' }}><p>x</p></ArenaPopover>,
  );
  assert.doesNotMatch(html, /data-stray|#ff00ff/, 'a {...rest} escape reached the rendered root');
});

function Forwarding({ children, ...rest }: { children?: React.ReactNode }) {
  return <button type="button" {...rest}>{children}</button>;
}

test('a component trigger that forwards its props draws the popup state on its button on the server', () => {
  const html = renderToStaticMarkup(
    <ArenaPopover label="Filters" open={false} trigger={<Forwarding>Filters</Forwarding>}><p>x</p></ArenaPopover>,
  );
  const button = html.match(/<button[^>]*>/)![0];
  assert.match(button, /aria-haspopup="dialog"/);
  assert.match(button, /aria-expanded="false"/);
  assert.doesNotMatch(html, /aria-controls/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaIconButton } from './ArenaIconButton.tsx';

test('ArenaIconButton draws the Phosphor class it is given and hides it from assistive technology', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="New" />);
  assert.match(html, /class="ph-bold ph-plus"/);
  assert.match(html, /aria-hidden="true"/);
});

test('ArenaIconButton names itself with label, and drops the title once the label is visible', () => {
  const hidden = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="New" />);
  assert.match(hidden, /aria-label="New"/);
  assert.match(hidden, /title="New"/);
  const shown = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="New" showLabel />);
  assert.match(shown, /aria-label="New"/);
  assert.doesNotMatch(shown, /title="New"/);
});

test('ArenaIconButton defaults its native type to button and honours an override', () => {
  assert.match(renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" />), /type="button"/);
  assert.match(renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" type="submit" />), /type="submit"/);
});

test('ArenaIconButton throws when icon is absent, matching the contract required flag', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaIconButton label="New" />),
    /ArenaIconButton: `icon` is required/,
  );
});

test('ArenaIconButton throws when label is absent, matching the contract required flag', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaIconButton icon="ph-x" />),
    /ArenaIconButton: `label` is required/,
  );
});

test('ArenaIconButton drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaIconButton icon="ph-x" label="L" style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('tabStop defaults to true and emits no tabindex at all', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="Add" />);
  assert.doesNotMatch(html, /tabindex/i, 'a default ArenaIconButton wrote a tabindex it does not need');
});

test('tabStop={false} takes the control out of the page Tab sequence', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="Add" tabStop={false} />);
  assert.match(html, /tabindex="-1"/, 'tabStop={false} did not write tabindex="-1"');
});

test('tabStop is not forwarded to the DOM as an unknown attribute', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="Add" tabStop={false} />);
  assert.doesNotMatch(html, /tabstop/i, 'the tabStop prop leaked into the markup');
});

test('no pressed member means no aria-pressed at all -- a plain button is not an unpressed toggle', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-plus" label="Add" />);
  assert.doesNotMatch(html, /aria-pressed/, 'a control that is not a toggle announced itself as one that is off');
});

test('pressed={false} is a toggle in its off state, and says so', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-push-pin" label="Pin this view" pressed={false} />);
  assert.match(html, /aria-pressed="false"/);
});

test('pressed keeps the label, because a toggle that renames itself is announced as another control', () => {
  const on = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-push-pin" label="Pin this view" pressed />);
  const off = renderToStaticMarkup(<ArenaIconButton icon="ph-bold ph-push-pin" label="Pin this view" pressed={false} />);
  assert.match(on, /aria-pressed="true"/);
  assert.match(on, /aria-label="Pin this view"/);
  assert.match(off, /aria-label="Pin this view"/);
  assert.notEqual(on, off, 'the on state is not drawn differently from the off state');
});

test('the pressed tint is a variant of the manifest, and absent means not a toggle at all', () => {
  const off = renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" />);
  assert.doesNotMatch(off, /data-arena-part="icon-button"[^>]*\bdata-arena-pressed=""/);
  assert.doesNotMatch(off, /aria-pressed/);

  const on = renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" pressed />);
  assert.match(on, /data-arena-part="icon-button"[^>]*\bdata-arena-pressed=""/);
  assert.match(on, /data-arena-part="icon-button"[^>]*\bdata-arena-pressed=""/);
  assert.match(on, /aria-pressed="true"/);
});

test('ghost and solid are classes of the emphasis family, and the component writes no variant attribute', () => {
  const ghost = renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" className="arena-emphasis-ghost" />);
  assert.match(ghost, /\bclass="[^"]*\barena-emphasis-ghost\b[^"]*"[^>]*data-arena-part="icon-button"/);
  assert.doesNotMatch(ghost, /data-arena-variant/);

  const solid = renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" className="arena-emphasis-solid" />);
  assert.match(solid, /\bclass="[^"]*\barena-emphasis-solid\b[^"]*"[^>]*data-arena-part="icon-button"/);
  assert.doesNotMatch(solid, /data-arena-variant/);
});

test('the disabled look is selected by the native attribute, so nothing is recomputed to draw it', () => {
  const html = renderToStaticMarkup(<ArenaIconButton icon="ph-x" label="L" disabled />);
  assert.match(html, /arena-icon-button__root/);
  assert.match(html, /\bdisabled=""/);
});

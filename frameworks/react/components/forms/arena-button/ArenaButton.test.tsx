import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaButton } from './ArenaButton.tsx';

test('ArenaButton renders its content slot', () => {
  assert.match(renderToStaticMarkup(<ArenaButton>Deploy</ArenaButton>), /Deploy/);
});

test('ArenaButton draws icon before the label and iconRight after it', () => {
  const html = renderToStaticMarkup(
    <ArenaButton icon="ph-bold ph-plus" iconRight="ph-bold ph-caret-down">Deploy</ArenaButton>
  );
  assert.match(html, /ph-bold ph-plus[\s\S]*Deploy[\s\S]*ph-bold ph-caret-down/);
});

test('ArenaButton replaces the leading icon with the spinner while loading', () => {
  const html = renderToStaticMarkup(<ArenaButton icon="ph-bold ph-plus" loading>Deploy</ArenaButton>);
  assert.match(html, /arena-button__spinner/);
  assert.doesNotMatch(html, /ph-bold ph-plus/);
});

test('ArenaButton is disabled while loading, without being passed disabled', () => {
  assert.match(renderToStaticMarkup(<ArenaButton loading>Deploy</ArenaButton>), /disabled/);
});

test('ArenaButton defaults its native type to button and honours an override', () => {
  assert.match(renderToStaticMarkup(<ArenaButton>x</ArenaButton>), /type="button"/);
  assert.match(renderToStaticMarkup(<ArenaButton type="submit">x</ArenaButton>), /type="submit"/);
});

test('ArenaButton renders danger as outline, never filled', () => {
  const html = renderToStaticMarkup(<ArenaButton destructive>Delete</ArenaButton>);
  assert.match(html, /data-arena-part="button"[^>]*\bdata-arena-destructive=""/);
  assert.doesNotMatch(html, /data-arena-variant/, 'emphasis is a class the adopter writes, never an attribute');
  assert.doesNotMatch(html, /(?<!:)\bbg-error\b/,
    'an unmodified bg-error fills the danger surface; only the hover: form may tint it');
});

test('ArenaButton drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaButton style={{ color: '#ff00ff' }} data-stray="x">x</ArenaButton>
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('tabStop defaults to true and emits no tabindex at all', () => {
  const html = renderToStaticMarkup(<ArenaButton>Save</ArenaButton>);
  assert.doesNotMatch(html, /tabindex/i, 'a default ArenaButton wrote a tabindex it does not need');
});

test('tabStop={false} takes the control out of the page Tab sequence', () => {
  const html = renderToStaticMarkup(<ArenaButton tabStop={false}>Save</ArenaButton>);
  assert.match(html, /tabindex="-1"/, 'tabStop={false} did not write tabindex="-1"');
});

test('tabStop is not forwarded to the DOM as an unknown attribute', () => {
  const html = renderToStaticMarkup(<ArenaButton tabStop={false}>Save</ArenaButton>);
  assert.doesNotMatch(html, /tabstop/i, 'the tabStop prop leaked into the markup');
});

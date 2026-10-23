import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaButton } from './ArenaButton.tsx';

test('ArenaButton renders its content slot', () => {
  assert.match(renderIcons(<ArenaButton>Deploy</ArenaButton>), /Deploy/);
});

test('ArenaButton draws icon before the label and iconRight after it', () => {
  const html = renderIcons(
    <ArenaButton icon="ph-bold ph-plus" iconRight="ph-bold ph-caret-down">Deploy</ArenaButton>
  );
  assert.deepEqual(symbols(html), ['bold-plus', 'bold-caret-down']);
});

test('ArenaButton replaces the leading icon with the spinner while loading', () => {
  const html = renderIcons(<ArenaButton icon="ph-bold ph-plus" loading>Deploy</ArenaButton>);
  assert.match(html, /arena-button__spinner/);
  assert.deepEqual(symbols(html), []);
});

test('ArenaButton is disabled while loading, without being passed disabled', () => {
  assert.match(renderIcons(<ArenaButton loading>Deploy</ArenaButton>), /disabled/);
});

test('ArenaButton defaults its native type to button and honours an override', () => {
  assert.match(renderIcons(<ArenaButton>x</ArenaButton>), /type="button"/);
  assert.match(renderIcons(<ArenaButton type="submit">x</ArenaButton>), /type="submit"/);
});

test('ArenaButton renders danger as outline, never filled', () => {
  const html = renderIcons(<ArenaButton destructive>Delete</ArenaButton>);
  assert.match(html, /data-arena-part="button"[^>]*\bdata-arena-destructive=""/);
  assert.doesNotMatch(html, /data-arena-variant/, 'emphasis is a class the adopter writes, never an attribute');
  assert.doesNotMatch(html, /(?<!:)\bbg-error\b/,
    'an unmodified bg-error fills the danger surface; only the hover: form may tint it');
});

test('ArenaButton drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderIcons(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaButton style={{ color: '#ff00ff' }} data-stray="x">x</ArenaButton>
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('tabStop defaults to true and emits no tabindex at all', () => {
  const html = renderIcons(<ArenaButton>Save</ArenaButton>);
  assert.doesNotMatch(html, /tabindex/i, 'a default ArenaButton wrote a tabindex it does not need');
});

test('tabStop={false} takes the control out of the page Tab sequence', () => {
  const html = renderIcons(<ArenaButton tabStop={false}>Save</ArenaButton>);
  assert.match(html, /tabindex="-1"/, 'tabStop={false} did not write tabindex="-1"');
});

test('tabStop is not forwarded to the DOM as an unknown attribute', () => {
  const html = renderIcons(<ArenaButton tabStop={false}>Save</ArenaButton>);
  assert.doesNotMatch(html, /tabstop/i, 'the tabStop prop leaked into the markup');
});

test('ArenaButton forwards the four trigger attributes and drops every other ARIA prop', () => {
  const html = renderIcons(
    <ArenaButton aria-haspopup="menu" aria-expanded={false} aria-controls="p" aria-describedby="d" aria-label="x" aria-pressed>Go</ArenaButton>,
  );
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="p"/);
  assert.match(html, /aria-describedby="d"/);
  assert.doesNotMatch(html, /aria-label|aria-pressed/);
});

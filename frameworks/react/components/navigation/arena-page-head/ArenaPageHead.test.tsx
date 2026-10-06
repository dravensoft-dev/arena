import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaPageHead } from './ArenaPageHead.tsx';

test('ArenaPageHead renders the title and subtitle text', () => {
  const html = renderToStaticMarkup(
    <ArenaPageHead title="Deployments" subtitle="Everything shipped in the last 30 days" />
  );
  assert.match(html, /Deployments/);
  assert.match(html, /Everything shipped in the last 30 days/);
});

test('ArenaPageHead throws when title is absent -- the fail-hard guard', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaPageHead />),
    /ArenaPageHead: `title` is required/,
  );
});

test('ArenaPageHead defaults to align="start" -- the wide layout is top-aligned', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" />);
  assert.match(html, /data-arena-part="page-head"[^>]*\bdata-arena-align="start"/);
});

test('ArenaPageHead align="center" centers the actions block against the title, wide layout', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" align="center" />);
  assert.match(html, /data-arena-part="page-head"[^>]*\bdata-arena-align="center"/);
  assert.doesNotMatch(html, /\bdata-arena-align="start"/);
});

test('ArenaPageHead no longer applies a baked bottom margin -- the parent composes spacing now', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" />);
  assert.doesNotMatch(html, /\bmb-/);
});

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

test('ArenaPageHead takes its alignment as a class on the root', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" className="arena-align-center" />);
  assert.match(html, /\bclass="[^"]*\barena-align-center\b[^"]*"[^>]*data-arena-part="page-head"/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaPageHead title="Deployments" />), /arena-align|data-arena-align/);
});

test('ArenaPageHead no longer applies a baked bottom margin -- the parent composes spacing now', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" />);
  assert.doesNotMatch(html, /\bmb-/);
});

import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('ArenaPageHead takes its alignment as a class on the root', () => {
  const html = renderToStaticMarkup(<ArenaPageHead title="Deployments" className="arena-align-center" />);
  assert.match(html, /\bclass="[^"]*\barena-align-center\b[^"]*"[^>]*data-arena-part="page-head"/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaPageHead title="Deployments" />), /arena-align|data-arena-align/);
});

test('ArenaPageHead applies no bottom margin -- the parent composes spacing', () => {
  const css = readFileSync(new URL('../../../../tailwind/consume/components/navigation/arena-page-head/ArenaPageHead.styles.generated.css', import.meta.url), 'utf8');
  assert.match(renderToStaticMarkup(<ArenaPageHead title="Deployments" />), /arena-page-head__root/);
  const rules = css.match(/\.arena-page-head__root[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(rules.length >= 3, 'the sheet has the __root rule and its :where variants');
  assert.ok(rules.some((r) => r.includes('data-arena-narrow')), 'sanity: the narrow variants are among the rules read');
  for (const rule of rules) assert.doesNotMatch(rule, /margin-bottom|margin-block/);
});

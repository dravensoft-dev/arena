import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaUnauthCard } from './ArenaUnauthCard.tsx';

test('it renders its slots and its children', () => {
  const html = renderToStaticMarkup(
    <ArenaUnauthCard brand={<span>BRAND</span>} eyebrow="Delivery console" title="Welcome back"
      footer={<a href="/reset">Forgot your password?</a>}>
      <span>FIELDS</span>
    </ArenaUnauthCard>);
  assert.match(html, /BRAND/);
  assert.match(html, /Delivery console/);
  assert.match(html, /Welcome back/);
  assert.match(html, /FIELDS/);
  assert.match(html, /Forgot your password\?/);
});

test('every slot is optional — a bare panel of children still renders', () => {
  const html = renderToStaticMarkup(<ArenaUnauthCard><span>FIELDS</span></ArenaUnauthCard>);
  assert.match(html, /FIELDS/);
});

test('it constrains its own width and does not centre itself', () => {
  const html = renderToStaticMarkup(<ArenaUnauthCard><span>x</span></ArenaUnauthCard>);
  assert.match(html, /arena-unauth-card__root/);

  const css = readFileSync(new URL('../../../../tailwind/consume/components/display/arena-unauth-card/ArenaUnauthCard.styles.generated.css', import.meta.url), 'utf8');
  const start = css.indexOf('.arena-unauth-card__root {');
  assert.ok(start >= 0, 'the sheet has no __root rule');
  const rule = css.slice(start, css.indexOf('\n  }\n', start));
  assert.match(rule, /max-width/, 'the card constrains its own width');
  assert.doesNotMatch(rule, /justify-content|align-items|min-height|margin-inline: auto/,
    'the card centres nothing; the page it sits on decides that');
});

test('eyebrow and title render as plain text', () => {
  const html = renderToStaticMarkup(
    <ArenaUnauthCard eyebrow="ARENA" title="Welcome back">
      <span>fields</span>
    </ArenaUnauthCard>,
  );
  assert.ok(html.includes('ARENA'), 'the eyebrow string is rendered');
  assert.ok(html.includes('Welcome back'), 'the title string is rendered');
  assert.ok(html.includes('fields'), 'children are rendered');
});

test('it renders ArenaCard rather than a second panel definition', () => {
  const html = renderToStaticMarkup(<ArenaUnauthCard><span>x</span></ArenaUnauthCard>);

  assert.match(
    html,
    /class="[^"]*\barena-card__root\b[^"]*"[^>]*><div class="arena-card__body"/,
    'the panel inside is ArenaCard\'s own root and body, drawn from ArenaCard\'s manifest rather than typed out here',
  );
});

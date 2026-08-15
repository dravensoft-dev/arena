import test from 'node:test';
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
  assert.doesNotMatch(html, /\bjustify-/, 'the card centres nothing; the page it sits on decides that');
  assert.doesNotMatch(html, /\bmin-h-/);
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

test('a consumer style prop and stray attributes are dropped, not spread onto the root', () => {
  const html = renderToStaticMarkup(
    <ArenaUnauthCard
      eyebrow="ARENA"
      title="Welcome back"
      // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
      style={{ color: 'rgb(255, 0, 0)' }}
      data-escape="leaked"
    >
      <span>fields</span>
    </ArenaUnauthCard>,
  );

  assert.ok(!html.includes('rgb(255, 0, 0)'), 'the consumer style value is not rendered anywhere');
  assert.ok(!html.includes('data-escape'), 'the stray attribute is not rendered anywhere');
});

test('it renders ArenaCard rather than a second panel definition', () => {
  const html = renderToStaticMarkup(<ArenaUnauthCard><span>x</span></ArenaUnauthCard>);

  assert.match(
    html,
    /class="[^"]*\barena-card__root\b[^"]*"[^>]*><div class="arena-card__body"/,
    'the panel inside is ArenaCard\'s own root and body, drawn from ArenaCard\'s manifest rather than typed out here',
  );
});

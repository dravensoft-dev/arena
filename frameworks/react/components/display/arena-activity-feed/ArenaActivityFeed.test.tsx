import type { ArenaActivityItem } from '../../../Api.generated';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaActivityFeed } from './ArenaActivityFeed.tsx';

const LABEL = 'Deployment activity';

const ITEMS: ArenaActivityItem[] = [
  { id: '1', actor: 'ana@', action: 'approved the release', target: 'build #4821', time: '2h ago' },
  { id: '2', actor: 'diego@', action: 'opened incident', target: 'checkout latency', time: '3h ago', tone: 'danger' },
];

test('the feed is a list, not a stack of divs', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={ITEMS} />);
  assert.match(html, /^<ul/);
  assert.equal(html.match(/<li/g)!.length, 2);
});

test('each part of the grammar takes its own ink', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[ITEMS[0]!]} />);
  assert.match(html, /ana@/);
  assert.match(html, /approved the release/);
  assert.match(html, /\b(?:arena-activity-feed__target|arena-activity-feed__dot--tone-gold)\b/, 'the target reads in the secondary ink');
  assert.match(html, /\barena-activity-feed__time\b/, 'the time reads muted');
});

test('tone drives the dot and defaults to accent', () => {
  assert.match(renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[ITEMS[0]!]} />), /\barena-activity-feed__dot--tone-accent\b/);
  assert.match(renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[ITEMS[1]!]} />), /\barena-activity-feed__dot--tone-danger\b/);
});

test('an unknown tone falls back to accent rather than rendering nothing', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[{ id: '3', actor: 'a', action: 'b', tone: 'chartreuse' }]} />);
  assert.match(html, /\barena-activity-feed__dot--tone-accent\b/);
});

test('an item missing a target or a time still renders', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[{ id: '4', actor: 'CI', action: 'restarted' }]} />);
  assert.match(html, /CI/);
  assert.match(html, /restarted/);
});

test('every field is drawn by Arena, and there is no per-item projection', () => {
  const html = renderToStaticMarkup(
    <ArenaActivityFeed label={LABEL} items={[{ id: 'a1', actor: 'Ada', action: 'deployed', target: 'api-7', time: '2m' }]} />,
  );
  assert.ok(html.includes('Ada'), 'the actor is rendered');
  assert.ok(html.includes('deployed'), 'the action is rendered');
  assert.ok(html.includes('api-7'), 'the target is rendered');
  assert.ok(html.includes('2m'), 'the time is rendered');
});

test('an absent items array throws rather than rendering an empty feed', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaActivityFeed label={LABEL} />), /`items` is required/);
});

test('a consumer style prop and stray attributes are dropped, not spread onto the <ul>', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaActivityFeed label={LABEL} items={[]} style={{ color: 'rgb(255, 0, 0)' }} data-escape="leaked" />,
  );
  assert.ok(!html.includes('rgb(255, 0, 0)'), 'a consumer style never reaches the <ul> (R4)');
  assert.ok(!html.includes('data-escape'), 'a stray attribute never reaches the <ul> (R4)');
});

test('an absent label throws -- a feed a reader navigates BY cannot be nameless', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaActivityFeed items={ITEMS} />),
    /ArenaActivityFeed: `label` is required/);
});

test('dateTime turns the row time into a real <time> a machine can read', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[
    { id: '1', actor: 'ana@', action: 'approved the release', time: '2h ago', dateTime: '2026-08-16T09:12:00Z' },
  ]} />);
  assert.match(html, /<time [^>]*datetime="2026-08-16T09:12:00Z"[^>]*>2h ago<\/time>/i,
    'two fields rather than one: the reader keeps "2h ago", which no parser resolves to a date, '
    + 'and the machine gets the stamp beside it. The match ignores case because this layer writes '
    + 'the idiomatic React prop and React serialises it as it was spelled; an HTML parser lowercases '
    + 'an attribute name, so the two layers reach the same DOM from different source text, which is '
    + 'what ArenaActivityFeed.cases.dom.test.tsx asserts against a parsed document rather than a string');
});

test('without dateTime the row time is drawn exactly as it was', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[
    { id: '1', actor: 'ana@', action: 'approved the release', time: '2h ago' },
  ]} />);
  assert.doesNotMatch(html, /<time/, 'a <time> with no datetime says nothing a span does not');
  assert.match(html, /<span[^>]*>2h ago<\/span>/);
});

test('Arena emits the element itself, which is what keeps the projection convention intact', () => {
  const html = renderToStaticMarkup(<ArenaActivityFeed label={LABEL} items={[
    { id: '1', actor: 'ana@', action: 'shipped', time: '<b>now</b>', dateTime: '2026-08-16T09:12:00Z' },
  ]} />);
  assert.doesNotMatch(html, /<b>now<\/b>/,
    'a field inside an array of predefined objects can only be a primitive, so a consumer cannot '
    + 'place markup inside one row of a list Arena renders. The pair of fields exists precisely so '
    + 'that convention did not have to be lifted to get a machine-readable date.');
});

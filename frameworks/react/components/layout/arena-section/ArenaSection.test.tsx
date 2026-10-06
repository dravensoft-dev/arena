/* The rhythm is a family an adopter writes as a class, so the root carries the class it is given.
 * What IS this component's is the two guards and the element it opens, and those are read out of the markup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSection } from './ArenaSection.tsx';
import classes from './ArenaSection.classes.generated.ts';
import tailwind from './ArenaSection.manifest.generated.ts';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const body = <p>One</p>;

test('a section with no title is refused, and a title of nothing but spaces is refused with it', () => {
  assert.throws(
    // @ts-expect-error the contract requires it, and the guard is what this asserts
    () => render(<ArenaSection>{body}</ArenaSection>),
    /`title` is required/,
  );
  assert.throws(() => render(<ArenaSection title="   ">{body}</ArenaSection>), /`title` is required/);
});

test('a section with no children is refused, because its heading would name nothing', () => {
  assert.throws(
    // @ts-expect-error the contract requires it, and the guard is what this asserts
    () => render(<ArenaSection title="Landed recently" />),
    /not a legal shape/,
  );
});

test('the guard counts the way the render path counts, so a false conditional is absent', () => {
  const admin = false;
  assert.throws(
    () => render(<ArenaSection title="Landed recently">{admin && <p>One</p>}</ArenaSection>),
    /not a legal shape/,
    'React.Children.count would have called a bare false one child and let this through',
  );
});

test('the title opens a level two heading, one rung under a page head', () => {
  assert.match(render(<ArenaSection title="Landed recently">{body}</ArenaSection>),
    /<h2[^>]*>Landed recently<\/h2>/);
});

test('the root is a section element and claims no landmark of its own', () => {
  const html = render(<ArenaSection title="Landed recently">{body}</ArenaSection>);
  assert.match(html, /^<section/);
  assert.doesNotMatch(html, /aria-label/,
    'a named section is a region landmark, and a page of them buries the ones that matter');
  assert.doesNotMatch(html, /role=/);
});

test('the eyebrow, the description and the action are drawn only when given', () => {
  const bare = render(<ArenaSection title="Landed recently">{body}</ArenaSection>);
  assert.doesNotMatch(bare, /This week/);
  const full = render(
    <ArenaSection title="Landed recently" eyebrow="This week" description="Since Monday"
      action={<a href="#all">See all</a>}>{body}</ArenaSection>,
  );
  for (const text of ['This week', 'Since Monday', 'See all']) assert.match(full, new RegExp(text));
});

test('a section given a rhythm option carries it on its root, and the slot reads its channel', () => {
  const html = render(<ArenaSection title="Landed recently" className="arena-rhythm-group">{body}</ArenaSection>);
  const given = (/<section[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/);
  for (const name of ['arena-rhythm-group', ...classes.slots.root.split(/\s+/)]) {
    assert.ok(given.includes(name), `the root lacks ${name}`);
  }
  assert.ok(tailwind.slots.root.includes('var(--arena-rhythm-gap,var(--arena-rhythm,var(--rhythm-component)))'));
  assert.doesNotMatch(html, /\bstyle=/);
});

test('ArenaSection drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaSection title="T" style={{ color: '#ff00ff' }}>{body}</ArenaSection>);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaSection title="T" data-stray="x">{body}</ArenaSection>);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});

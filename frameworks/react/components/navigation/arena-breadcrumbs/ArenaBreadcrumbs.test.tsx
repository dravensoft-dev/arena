import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaBreadcrumbs } from './ArenaBreadcrumbs.tsx';

const LABEL = 'Project navigation';

const ITEMS = [
  { label: 'Clients', href: '/clients' },
  { label: 'Acme Corp', href: '/clients/acme' },
  { label: 'Overview' },
];

test('the trail renders every crumb, in order', () => {
  const html = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} items={ITEMS} />);
  assert.match(html, /Clients/);
  assert.match(html, /Acme Corp/);
  assert.match(html, /Overview/);
  assert.ok(html.indexOf('Clients') < html.indexOf('Acme Corp'), 'root must render before its child');
  assert.ok(html.indexOf('Acme Corp') < html.indexOf('Overview'), 'the trail must render root-first');
});

test('the last crumb is not a link, and carries aria-current="page"', () => {
  const html = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} items={ITEMS} />);
  const lastCrumb = /<span aria-current="page"[^>]*>Overview<\/span>/.exec(html);
  assert.ok(lastCrumb, `expected the current crumb as a non-link <span aria-current="page">, got: ${html}`);
});

test('a non-current crumb renders as a real anchor carrying onNavigate\'s own call site', () => {
  const html = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} items={ITEMS} onNavigate={() => {}} />);
  assert.match(html, /<a href="\/clients"[^>]*>Clients<\/a>/);
  assert.match(html, /<a href="\/clients\/acme"[^>]*>Acme Corp<\/a>/);
});

test('with no onNavigate at all, a non-current crumb still renders as an anchor -- the callback is optional, the link is not', () => {
  const html = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} items={ITEMS} />);
  assert.match(html, /<a href="\/clients"[^>]*>Clients<\/a>/);
});

test('throws when items is absent', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} />), /items.*required/);
});

test('throws when ariaLabel is absent -- nothing can derive the name of a trail', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaBreadcrumbs items={ITEMS} />),
    /ArenaBreadcrumbs: `ariaLabel` is required/,
  );
});

test('an empty items array is supplied-but-empty and stays legal', () => {
  const html = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel={LABEL} items={[]} />);
  assert.match(html, new RegExp(`<nav aria-label="${LABEL}"`));
  assert.doesNotMatch(html, /<a /);
});

test('the last crumb and the ones before it are two slots of one recipe', () => {
  const html = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={[{ label: 'Root', href: '/a' }, { label: 'Here' }]} />,
  );
  assert.match(html, /class="[^"]*\barena-breadcrumbs__crumb\b[^"]*"[^>]*>Root/, 'a link crumb is dimmed');
  assert.match(html, /arena-breadcrumbs__crumb/, 'and lifts on hover through a modifier, not a handler');
  assert.match(html, /class="[^"]*\barena-breadcrumbs__current\b[^"]*"[^>]*>Here/, 'the current crumb is the emphatic one');
});

test('an intermediate crumb with no href is a span, never an anchor to the page itself', () => {
  const html = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={[
      { label: 'Root', href: '/a' }, { label: 'Grouping' }, { label: 'Here' },
    ]} />,
  );
  assert.doesNotMatch(html, /href="#"/,
    'an anchor to the current page is a dead edge in the crawl graph and a false keyboard target, '
    + 'and href is optional by contract, so the render has to answer for an absent one');
  assert.match(html, /<span class="[^"]*\barena-breadcrumbs__crumb\b[^"]*"[^>]*>Grouping<\/span>/,
    'it takes the crumb slot rather than the current one: it is not where the reader is');
  assert.doesNotMatch(html, /<span[^>]*aria-current[^>]*>Grouping/,
    'and it carries no aria-current, which belongs to the last crumb alone');
});

test('only a crumb that leads somewhere takes the pointer and the hover', () => {
  const html = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={[
      { label: 'Root', href: '/a' }, { label: 'Grouping' }, { label: 'Here' },
    ]} />,
  );
  assert.match(html, /<a href="\/a" class="[^"]*arena-breadcrumbs__crumb--linked-true/,
    'the affordances live on a variant rather than in the base slot');
  assert.doesNotMatch(html, /<span[^>]*crumb--linked-true[^>]*>Grouping/,
    'a cursor that changes over something nothing happens on is the same lie the href="#" was');
});

const jsonLdOf = (html: string): string => {
  const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  assert.ok(match?.[1] !== undefined, 'the trail must emit its own ld+json block');
  return match[1];
};

test('the trail publishes itself as a BreadcrumbList a machine can read', () => {
  const html = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={[
      { label: 'Projects', href: '/projects' },
      { label: 'Checkout', href: '/projects/checkout' },
      { label: 'Deployment #482' },
    ]} />,
  );
  const data = JSON.parse(jsonLdOf(html));
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'BreadcrumbList');
  assert.deepEqual(data.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Projects', item: '/projects' },
    { '@type': 'ListItem', position: 2, name: 'Checkout', item: '/projects/checkout' },
    { '@type': 'ListItem', position: 3, name: 'Deployment #482' },
  ], 'the current location IS a rung of the hierarchy and is published as one, carrying its name '
   + 'and no `item`: the consumer of a trail is told to omit that property on the last entry so the '
   + 'containing page supplies the url. Dropping the entry instead published one rung for a trail of '
   + 'two, under the documented minimum of two, so the block was refused by the very reader it was '
   + 'written for');
});

test('origin turns the published hrefs absolute without touching what is drawn', () => {
  const items = [{ label: 'Projects', href: '/projects' }, { label: 'Here' }];
  const relative = renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel="Where" items={items} />);
  const absolute = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={items} origin="https://example.com" />,
  );

  assert.equal(JSON.parse(jsonLdOf(relative)).itemListElement[0].item, '/projects',
    'absent, the relative href is published as it stands');
  assert.equal(JSON.parse(jsonLdOf(absolute)).itemListElement[0].item, 'https://example.com/projects');
  assert.equal(
    relative.replace(/<script[^]*?<\/script>/, ''),
    absolute.replace(/<script[^]*?<\/script>/, ''),
    'and nothing a person sees moves either way',
  );
});

test('a label carrying a closing script tag cannot end the block', () => {
  const html = renderToStaticMarkup(
    <ArenaBreadcrumbs ariaLabel="Where" items={[
      { label: '</script><img src=x onerror=alert(1)>', href: '/a' }, { label: 'Here' },
    ]} />,
  );
  assert.doesNotMatch(jsonLdOf(html), /<\/script>/,
    'the value comes from the consumer, so this is an injection surface: a raw < would close the '
    + 'tag and begin whatever follows it as markup');
  assert.equal(JSON.parse(jsonLdOf(html)).itemListElement[0].name, '</script><img src=x onerror=alert(1)>',
    'and the escape is the JSON one, so a parser still reads the original character back');
});

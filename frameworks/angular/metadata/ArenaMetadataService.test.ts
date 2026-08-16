/* Every case here writes into the one shared <head>, so each starts from a cleared one: a tag
 * left by the previous case reads as a tag this one wrote, and the assertion that matters most
 * is the REMOVAL, since a description left behind from the route before is worse than none.
 * The safe default is asserted first and on its own, because it is the line the whole provider
 * is worth: a route that says nothing is not indexed. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaMetadataService, ARENA_METADATA, ARENA_ROBOTS_UNTIL_SAID } from './ArenaMetadataService';
import type { ArenaMetadataConfig } from './ArenaMetadataService';

function service(config?: ArenaMetadataConfig): ArenaMetadataService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: config ? [{ provide: ARENA_METADATA, useValue: config }] : [],
  });
  return TestBed.inject(ArenaMetadataService);
}

function clean(): void {
  for (const tag of document.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]')) {
    tag.remove();
  }
  document.title = '';
}

const named = (name: string) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
const property = (p: string) => document.head.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? null;
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

test('a page that says nothing about robots is not indexed', () => {
  clean();
  service().apply({ title: 'Orders' });
  assert.equal(named('robots'), ARENA_ROBOTS_UNTIL_SAID,
    'a route is born private and a public one opts in. Nobody writes this line on their own, and '
    + 'its absence does not announce itself until a cash-register screen turns up in a search result');
  clean();
});

test('a route that opts in overrides the default, and the configuration sits between the two', () => {
  clean();
  service({ robots: 'index,follow' }).apply({ title: 'Orders' });
  assert.equal(named('robots'), 'index,follow');

  service({ robots: 'index,follow' }).apply({ title: 'Cash', robots: 'noindex,nofollow' });
  assert.equal(named('robots'), 'noindex,nofollow', 'the route is the innermost word');
  clean();
});

test('the title is composed with the suffix, and a page with no title of its own is the suffix', () => {
  clean();
  const meta = service({ suffix: 'Andina' });
  meta.apply({ title: 'Orders' });
  assert.equal(document.title, 'Orders · Andina');

  meta.apply({});
  assert.equal(document.title, 'Andina', 'a route with no title falls back to what names the site');
  clean();
});

test('with no origin there is no canonical at all, rather than a wrong one', () => {
  clean();
  service().apply({ title: 'Orders', url: '/orders' });
  assert.equal(canonical(), null,
    'an origin read off the window diverges between a server render and the client that hydrates '
    + 'it, which is the hazard a consumer-supplied value exists to remove');
  assert.equal(property('og:url'), null);
  clean();
});

test('with an origin the canonical is absolute, and the fragment is not part of it', () => {
  clean();
  const meta = service({ origin: 'https://andina.example/' });
  meta.apply({ title: 'Orders', url: '/orders?page=2#arena-main' });
  assert.equal(canonical(), 'https://andina.example/orders?page=2');
  assert.equal(property('og:url'), 'https://andina.example/orders?page=2');

  meta.apply({ title: 'One order', url: '/orders/1', canonical: '/orders' });
  assert.equal(canonical(), 'https://andina.example/orders', 'a route may name the url it prefers');
  clean();
});

test('a value the next page does not carry is removed rather than left behind', () => {
  clean();
  const meta = service({ origin: 'https://andina.example' });
  meta.apply({ title: 'Orders', description: 'Every order in the system.', image: '/orders.png', url: '/orders' });
  assert.equal(named('description'), 'Every order in the system.');
  assert.equal(property('og:image'), '/orders.png');

  meta.apply({ title: 'Cash' });
  assert.equal(named('description'), null, 'the description of the page before is a description of this one');
  assert.equal(property('og:image'), null);
  assert.equal(canonical(), null);
  clean();
});

test('the open graph pair says the same thing the page says, and never a second thing', () => {
  clean();
  service({ origin: 'https://andina.example', siteName: 'Andina', suffix: 'Andina' })
    .apply({ title: 'Orders', description: 'Every order in the system.', url: '/orders' });

  assert.equal(property('og:title'), document.title, 'a title and an og:title that disagree are two claims');
  assert.equal(property('og:description'), named('description'));
  assert.equal(property('og:url'), canonical());
  assert.equal(property('og:site_name'), 'Andina');
  assert.equal(property('og:type'), 'website');
  clean();
});

test('one tag is written per name however many pages pass through', () => {
  clean();
  const meta = service({ origin: 'https://andina.example' });
  for (const title of ['Orders', 'Cash', 'Stock']) meta.apply({ title, description: title, url: `/${title}` });

  assert.equal(document.head.querySelectorAll('meta[name="description"]').length, 1);
  assert.equal(document.head.querySelectorAll('meta[property="og:url"]').length, 1);
  assert.equal(document.head.querySelectorAll('link[rel="canonical"]').length, 1);
  clean();
});

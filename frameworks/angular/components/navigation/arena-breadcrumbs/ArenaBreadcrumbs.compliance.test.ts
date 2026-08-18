/* Both requirements of `navigation` are decidable from one element, so there is
 * no behavioural map. The landmark is a real <nav> INSIDE the fixture, taking the
 * carve-out the host rule provides for a root that must be a specific semantic
 * element -- so the subject is that element and not the fixture's own. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaBreadcrumbs } from './ArenaBreadcrumbs';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-breadcrumbs/ArenaBreadcrumbs.behaviour.json');

const CRUMBS = [{ label: 'Clients', href: '/clients' }, { label: 'Overview' }];

function render(ariaLabel: string) {
  const fixture = TestBed.createComponent(ArenaBreadcrumbs);
  fixture.componentRef.setInput('ariaLabel', ariaLabel);
  fixture.componentRef.setInput('items', CRUMBS);
  fixture.detectChanges();
  return fixture;
}

function landmark(fixture: ReturnType<typeof render>): Element {
  const nav = (fixture.nativeElement as Element).querySelector('nav');
  assert.ok(nav, 'the trail must render a real <nav>, which is what the pattern asks for when one can be used');
  return nav;
}

test('arena-breadcrumbs is a named nav landmark, and two of them are told apart', () => {
  const fixture = render('Project navigation');
  const other = render('Client navigation');
  try {
    const nav = landmark(fixture);
    assert.equal(nav.getAttribute('aria-label'), 'Project navigation',
      'the name must come from the ariaLabel input, not a constant the component owns');
    assert.equal(nav.getAttribute('role'), null,
      'a real <nav> carries the landmark natively, so role="navigation" on top of it is noise');
    assert.notEqual(landmark(other).getAttribute('aria-label'), nav.getAttribute('aria-label'),
      'two trails on one page must be distinguishable, which the retired hardcoded label made impossible');

    assertPattern({ root: fixture.nativeElement as Element, bindingPath: BINDING, subjects: { default: nav } });
  } finally {
    fixture.destroy();
    other.destroy();
  }
});

test('the host is out of layout, so the <nav> is the box a parent row lays out', () => {
  const fixture = render('Project navigation');
  try {
    assert.match((fixture.nativeElement as Element).getAttribute('style') ?? '', /display:\s*contents/,
      'a bare host that is not display:contents lays out as an inline box between the parent and the nav');
  } finally {
    fixture.destroy();
  }
});

test('an ariaLabel bound to nothing throws, because input.required only proves it was bound', () => {
  const fixture = TestBed.createComponent(ArenaBreadcrumbs);
  fixture.componentRef.setInput('ariaLabel', '   ');
  fixture.componentRef.setInput('items', CRUMBS);
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaBreadcrumbs: .ariaLabel. is required/,
      'a whitespace name satisfies roles.label mechanically while leaving the landmark unnamed');
  } finally {
    try {
      fixture.destroy();
    } catch {
      return;
    }
  }
});

test('an intermediate crumb with no href is a span, never an anchor to the page itself', () => {
  const fixture = TestBed.createComponent(ArenaBreadcrumbs);
  fixture.componentRef.setInput('ariaLabel', 'Where');
  fixture.componentRef.setInput('items', [
    { label: 'Root', href: '/a' }, { label: 'Grouping' }, { label: 'Here' },
  ]);
  fixture.detectChanges();
  const host = fixture.nativeElement as Element;

  assert.equal(host.querySelectorAll('a[href="#"]').length, 0,
    'an anchor to the current page is a dead edge in the crawl graph and a false keyboard target, '
    + 'and href is optional by contract, so the render has to answer for an absent one');

  const middle = [...host.querySelectorAll('[data-arena-part="breadcrumbs.crumb"]')]
    .find((element) => element.textContent?.trim() === 'Grouping');
  assert.ok(middle, 'it takes the crumb slot rather than the current one: it is not where the reader is');
  assert.equal(middle.tagName, 'SPAN');
  assert.equal(middle.getAttribute('aria-current'), null,
    'and it carries no aria-current, which belongs to the last crumb alone');
  assert.ok(!middle.className.includes('crumb--linked-true'),
    'a cursor that changes over something nothing happens on is the same lie the href="#" was');

  const first = host.querySelector('a[href="/a"]');
  assert.ok(first?.className.includes('crumb--linked-true'),
    'while a crumb that leads somewhere keeps the pointer and the hover');
});

function trail(items: readonly { label: string; href?: string }[], origin?: string) {
  const fixture = TestBed.createComponent(ArenaBreadcrumbs);
  fixture.componentRef.setInput('ariaLabel', 'Where');
  fixture.componentRef.setInput('items', items);
  if (origin !== undefined) fixture.componentRef.setInput('origin', origin);
  fixture.detectChanges();
  return fixture;
}

function jsonLdOf(fixture: ReturnType<typeof trail>) {
  const script = (fixture.nativeElement as Element)
    .querySelector('script[type="application/ld+json"]');
  assert.ok(script, 'the trail must emit its own ld+json block. Angular\'s template compiler drops '
    + 'a <script> written into a template and says nothing, so this element is built through the '
    + 'injected DOCUMENT instead, and this assertion is what would notice it going missing again');
  return script.textContent ?? '';
}

test('the trail publishes itself as a BreadcrumbList a machine can read', () => {
  const data = JSON.parse(jsonLdOf(trail([
    { label: 'Projects', href: '/projects' },
    { label: 'Checkout', href: '/projects/checkout' },
    { label: 'Deployment #482' },
  ])));

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
  const relative = trail(items);
  const absolute = trail(items, 'https://example.com');

  assert.equal(JSON.parse(jsonLdOf(relative)).itemListElement[0].item, '/projects',
    'absent, the relative href is published as it stands');
  assert.equal(JSON.parse(jsonLdOf(absolute)).itemListElement[0].item, 'https://example.com/projects');

  const drawn = (fixture: ReturnType<typeof trail>) =>
    (fixture.nativeElement as Element).querySelector('nav')?.outerHTML;
  assert.equal(drawn(relative), drawn(absolute), 'and nothing a person sees moves either way');
});

test('the published trail follows the items it is given', () => {
  const fixture = trail([{ label: 'Projects', href: '/projects' }, { label: 'Here' }]);
  fixture.componentRef.setInput('items', [
    { label: 'Clients', href: '/clients' }, { label: 'Acme', href: '/clients/acme' }, { label: 'Here' },
  ]);
  fixture.detectChanges();

  assert.deepEqual(JSON.parse(jsonLdOf(fixture)).itemListElement.map((e: { name: string }) => e.name),
    ['Clients', 'Acme', 'Here'],
    'the whole point of emitting this from the component is that one hierarchy is maintained '
    + 'rather than two, so a stale block would be the duplication this was meant to remove');
});

test('a label carrying a closing script tag cannot end the block', () => {
  const fixture = trail([
    { label: '</script><img src=x onerror=alert(1)>', href: '/a' }, { label: 'Here' },
  ]);
  const raw = jsonLdOf(fixture);

  assert.ok(!raw.includes('</script>'),
    'the value comes from the consumer, so this is an injection surface: a raw < would close the '
    + 'tag and begin whatever follows it as markup');
  assert.equal(JSON.parse(raw).itemListElement[0].name, '</script><img src=x onerror=alert(1)>',
    'and the escape is the JSON one, so a parser still reads the original character back');
  assert.equal((fixture.nativeElement as Element).querySelectorAll('img').length, 0);
});

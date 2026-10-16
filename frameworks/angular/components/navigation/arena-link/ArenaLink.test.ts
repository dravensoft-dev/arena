/* The link's markup and its anchor convention: a real <a href> carrying the attributes each member
 * writes, the one activation a router owns cancelled and reported, every other one left to the
 * browser, and a link a router cannot own never cancelled at all. The host draws no box, so the
 * anchor sits inline in the paragraph that holds it. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaLink } from './ArenaLink';

@Component({
  selector: 'link-test-host',
  standalone: true,
  imports: [ArenaLink],
  template: `<p>Read <arena-link [href]="href" [external]="external" [download]="download" [rel]="rel" [target]="target" (navigate)="went = went + 1">{{ text }}</arena-link> first.</p>`,
})
class LinkHost {
  href = '/notes';
  external = false;
  download = false;
  rel: readonly string[] | undefined = undefined;
  target: string | undefined = undefined;
  text = 'the release notes';
  went = 0;
}

function render(patch: Partial<LinkHost> = {}) {
  const fixture = TestBed.createComponent(LinkHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return { fixture, anchor: fixture.nativeElement.querySelector('a') as HTMLAnchorElement };
}

function press(el: Element, over: Partial<MouseEventInit> = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...over });
  el.dispatchEvent(event);
  return event;
}

function warnings(body: () => void): string[] {
  forgetArenaWarnings();
  const warn = console.warn;
  const said: string[] = [];
  console.warn = (...args: unknown[]) => { said.push(args.join(' ')); };
  try { body(); } finally { console.warn = warn; }
  return said;
}

test('it is a real anchor in the paragraph, carrying the address, the text and nothing it was not asked for', () => {
  const { fixture, anchor } = render();
  try {
    assert.equal(anchor.getAttribute('href'), '/notes');
    assert.equal(anchor.parentElement?.parentElement?.tagName, 'P', 'the host draws no box, so the anchor is inline in the sentence');
    for (const name of ['role', 'target', 'rel', 'download', 'tabindex']) assert.equal(anchor.hasAttribute(name), false, `a plain link wrote ${name}`);
    assert.equal(anchor.textContent, 'the release notes');
    assert.equal(anchor.getAttribute('data-arena-part'), 'link');
  } finally { fixture.destroy(); }
});

test('external opens a new tab safely and says so without drawing it', () => {
  const { fixture, anchor } = render({ external: true });
  try {
    assert.equal(anchor.getAttribute('target'), '_blank');
    assert.equal(anchor.getAttribute('rel'), 'noopener noreferrer', 'a new tab without noopener hands the page it opens this one');
    assert.equal(anchor.querySelector('[data-arena-part="link.external"]')?.textContent, ' (opens in a new tab)');
  } finally { fixture.destroy(); }
});

test('download writes the attribute and opens nothing', () => {
  const { fixture, anchor } = render({ download: true });
  try {
    assert.equal(anchor.getAttribute('download'), '');
    assert.equal(anchor.hasAttribute('target'), false);
  } finally { fixture.destroy(); }
});

test('rel merges the consumer\'s tokens with Arena\'s and drops an opener token, warning once', () => {
  const said = warnings(() => {
    const one = render({ rel: ['nofollow', 'UGC nofollow'] });
    try { assert.equal(one.anchor.getAttribute('rel'), 'nofollow ugc'); } finally { one.fixture.destroy(); }
    const two = render({ external: true, rel: ['nofollow', 'opener'] });
    try { assert.equal(two.anchor.getAttribute('rel'), 'nofollow noopener noreferrer'); } finally { two.fixture.destroy(); }
    const named = render({ target: 'help' });
    try {
      assert.equal(named.anchor.getAttribute('target'), 'help');
      assert.equal(named.anchor.getAttribute('rel'), 'noopener', 'a named context is another context, so it takes noopener too');
    } finally { named.fixture.destroy(); }
  });
  assert.equal(said.filter((one) => one.includes('"opener"')).length, 1, 'the opener token is dropped with one warning');
});

test('a _blank target is ignored and warned once, because a new tab is external', () => {
  const said = warnings(() => {
    const { fixture, anchor } = render({ target: '_blank' });
    try {
      assert.equal(anchor.hasAttribute('target'), false, 'a _blank target slipped past external and its noopener');
      assert.equal(anchor.hasAttribute('rel'), false);
    } finally { fixture.destroy(); }
  });
  assert.equal(said.length, 1);
  assert.match(said[0] ?? '', /^\[arena\] ArenaLink: target "_blank" is ignored/);
});

test('a primary click is cancelled and reported once, and a modified one stays the browser\'s', () => {
  const { fixture, anchor } = render();
  try {
    assert.equal(press(anchor).defaultPrevented, true, 'the anchor was left to navigate on its own, so a router never gets the chance to');
    for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])
      assert.equal(press(anchor, over).defaultPrevented, false, `${JSON.stringify(over)} was cancelled`);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.went, 1, 'only the plain click reports through navigate');
  } finally { fixture.destroy(); }
});

test('an ignored _blank target writes none, so the click is a plain one and routes', () => {
  const said = warnings(() => {
    const { fixture, anchor } = render({ target: '_blank' });
    try {
      assert.equal(anchor.hasAttribute('target'), false);
      assert.equal(press(anchor).defaultPrevented, true, 'the ignored target left the anchor to navigate on its own');
      fixture.detectChanges();
      assert.equal(fixture.componentInstance.went, 1);
    } finally { fixture.destroy(); }
  });
  assert.equal(said.length, 1, 'the ignored target warns once');
});

test('a link a router cannot own is never cancelled and reports nothing', () => {
  for (const patch of [{ external: true }, { download: true }, { target: 'help' }, { target: '_top' }]) {
    const { fixture, anchor } = render(patch);
    try {
      assert.equal(press(anchor).defaultPrevented, false, `${JSON.stringify(patch)} was cancelled`);
      fixture.detectChanges();
      assert.equal(fixture.componentInstance.went, 0, `${JSON.stringify(patch)} reported a navigation a router cannot perform`);
    } finally { fixture.destroy(); }
  }
  const self = render({ target: '_self' });
  try {
    assert.equal(press(self.anchor).defaultPrevented, true, '_self is this context, so the router still owns it');
  } finally { self.fixture.destroy(); }
});

test('a blank address and an empty text are refused, because neither is a link', () => {
  for (const patch of [{ href: '   ' }, { text: '  ' }]) {
    const fixture = TestBed.createComponent(LinkHost);
    try {
      Object.assign(fixture.componentInstance, patch);
      assert.throws(() => fixture.detectChanges(), /ArenaLink: `(href|content)` is required/);
    } finally { fixture.destroy(); }
  }
});

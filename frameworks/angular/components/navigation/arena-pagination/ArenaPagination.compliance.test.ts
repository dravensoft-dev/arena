/* Both requirements of `navigation` are decidable from one element, so there is no
 * behavioural map. Unlike arena-breadcrumbs, which binds the same pattern by putting
 * role="navigation" on its host, this component renders a real <nav> and takes its host
 * out of layout -- so the subject is the element INSIDE the fixture, not the fixture's own.
 * The two guards are asserted here because input.required only proves something was bound:
 * an empty string and a zero page count both satisfy it and neither is an ArenaPagination. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { ArenaPagination } from './ArenaPagination';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-pagination/ArenaPagination.behaviour.json');

function destroyAfterFailedRender(fixture: { destroy: () => void }) {
  try {
    fixture.destroy();
  } catch {
    return;
  }
}

function render(page: number, pageCount: number, ariaLabel = 'Deployments') {
  const fixture = TestBed.createComponent(ArenaPagination);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('pageCount', pageCount);
  fixture.componentRef.setInput('ariaLabel', ariaLabel);
  const chosen: number[] = [];
  fixture.componentInstance.valueChange.subscribe((value) => chosen.push(value));
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const read = () => {
    const nav = host.querySelector('nav') as HTMLElement;
    const buttons = Array.from(nav.querySelectorAll('button'));
    return {
      nav,
      previous: buttons[0],
      next: buttons[buttons.length - 1],
      pages: buttons.slice(1, -1),
      labels: Array.from(nav.children).map((el) => (el.textContent ?? '').trim()),
    };
  };
  return { fixture, host, read, chosen };
}

test('the landmark is a real <nav>, named by the member, and the host adds no box of its own', () => {
  const { fixture, host, read } = render(3, 12);
  try {
    const { nav } = read();
    assert.ok(nav, 'no <nav> rendered — role="navigation" on the host is the fallback, not the shape this component chose');
    assert.equal(nav.getAttribute('aria-label'), 'Deployments',
      'the name must come from the ariaLabel member, not from a constant the component owns');
    assert.match(host.getAttribute('style') ?? '', /display:\s*contents/,
      'the host renders a real <nav> inside it and must add no box, or the nav is not the flex item its parent lays out');
    assert.equal(host.getAttribute('class'), null,
      'a class on the host would mean the root slot is bound in two places at once');
  } finally {
    fixture.destroy();
  }
});

test('arena-pagination meets the navigation pattern, and two of them are told apart', () => {
  const { fixture, host, read } = render(3, 12);
  const other = render(1, 4, 'Environments');
  try {
    const { nav } = read();
    assert.notEqual(other.read().nav.getAttribute('aria-label'), nav.getAttribute('aria-label'),
      'two paginated tables in one dashboard is a routine layout and they must not share a name');

    assertPattern({ root: host, bindingPath: BINDING, subjects: { default: nav } });
  } finally {
    fixture.destroy();
    other.fixture.destroy();
  }
});

test('the window elides rather than drawing every page, and the first and last stay reachable', () => {
  const { fixture, read } = render(10, 20);
  try {
    assert.deepEqual(read().labels, ['', '1', '…', '9', '10', '11', '…', '20', ''],
      'the arrows carry an icon and no text, so the two empty strings are the arrows');
  } finally {
    fixture.destroy();
  }
});

test('twenty pages draw nine slots, not twenty — the window is the whole point of the component', () => {
  const { fixture, read } = render(10, 20);
  try {
    assert.equal(read().pages.length, 5, 'only the windowed pages are buttons; the ellipses are not');
  } finally {
    fixture.destroy();
  }
});

test('the current page is marked, and only it', () => {
  const { fixture, read } = render(10, 20);
  try {
    const { nav, pages } = read();
    const marked = pages.filter((button) => button.getAttribute('aria-current') === 'page');
    assert.equal(marked.length, 1, 'two current pages is two answers to "where am I"');
    assert.equal(marked[0].textContent?.trim(), '10');
    assertNoNode(nav.querySelector('span[aria-current]'),
      'an ellipsis is not a page and cannot be the current one');
  } finally {
    fixture.destroy();
  }
});

test('the ellipsis is not a control, so nothing lands on it in the Tab sequence', () => {
  const { fixture, read } = render(10, 20);
  try {
    const { nav } = read();
    const ellipses = Array.from(nav.querySelectorAll('span'));
    assert.equal(ellipses.length, 2);
    for (const ellipsis of ellipses) {
      assert.equal(ellipsis.tagName.toLowerCase(), 'span');
      assert.equal(ellipsis.hasAttribute('tabindex'), false);
    }
  } finally {
    fixture.destroy();
  }
});

test('the arrow that would leave the range is disabled, at each end', () => {
  const first = render(1, 20);
  const last = render(20, 20);
  const middle = render(10, 20);
  try {
    assert.equal(first.read().previous.disabled, true, 'there is no page before the first');
    assert.equal(first.read().next.disabled, false);
    assert.equal(last.read().next.disabled, true, 'there is no page after the last');
    assert.equal(last.read().previous.disabled, false);
    assert.equal(middle.read().previous.disabled, false);
    assert.equal(middle.read().next.disabled, false);
  } finally {
    first.fixture.destroy();
    last.fixture.destroy();
    middle.fixture.destroy();
  }
});

test('the arrows are named, because an icon-only control announces nothing', () => {
  const { fixture, read } = render(3, 12);
  try {
    const { previous, next } = read();
    assert.equal(previous.getAttribute('aria-label'), 'Previous');
    assert.equal(next.getAttribute('aria-label'), 'Next');
    assertSameNode(previous, read().nav.firstElementChild,
      'the previous arrow leads the strip, or the reading order does not match the visual one');
    assertSameNode(next, read().nav.lastElementChild, 'the next arrow closes the strip');
  } finally {
    fixture.destroy();
  }
});

test('change carries the chosen page, and never fires for the page already shown', () => {
  const { fixture, read, chosen } = render(10, 20);
  try {
    read().pages[0].click();
    fixture.detectChanges();
    assert.deepEqual(chosen, [1]);

    const current = read().pages.find((button) => button.getAttribute('aria-current') === 'page');
    current?.click();
    fixture.detectChanges();
    assert.deepEqual(chosen, [1], 'clicking the current page is not a page change and must report nothing');
  } finally {
    fixture.destroy();
  }
});

test('the arrows step by one, and a disabled arrow at the end reports nothing', () => {
  const { fixture, read, chosen } = render(10, 20);
  try {
    read().previous.click();
    read().next.click();
    fixture.detectChanges();
    assert.deepEqual(chosen, [9, 11]);
  } finally {
    fixture.destroy();
  }

  const last = render(20, 20);
  try {
    last.read().next.click();
    last.fixture.detectChanges();
    assert.deepEqual(last.chosen, [],
      'a page outside 1..pageCount is not a page, and the guard must hold even if the disabled attribute is bypassed');
  } finally {
    last.fixture.destroy();
  }
});

test('an ariaLabel bound to nothing throws, because input.required only proves it was bound', () => {
  const fixture = TestBed.createComponent(ArenaPagination);
  fixture.componentRef.setInput('page', 3);
  fixture.componentRef.setInput('pageCount', 12);
  fixture.componentRef.setInput('ariaLabel', '   ');
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaPagination: .ariaLabel. is required/,
      'a whitespace name satisfies roles.label mechanically while telling a screen-reader user nothing');
  } finally {
    destroyAfterFailedRender(fixture);
  }
});

test('a pageCount below one throws, because a window over nothing is not a window', () => {
  for (const pageCount of [0, -1, 2.5]) {
    const fixture = TestBed.createComponent(ArenaPagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageCount', pageCount);
    fixture.componentRef.setInput('ariaLabel', 'Deployments');
    try {
      assert.throws(() => fixture.detectChanges(), /ArenaPagination: .pageCount. is required/,
        `pageCount=${pageCount} rendered instead of throwing`);
    } finally {
      destroyAfterFailedRender(fixture);
    }
  }
});

test('one page renders the whole set with both arrows disabled, which is the smallest valid render', () => {
  const { fixture, read } = render(1, 1);
  try {
    assert.deepEqual(read().labels, ['', '1', '']);
    assert.equal(read().previous.disabled, true);
    assert.equal(read().next.disabled, true);
  } finally {
    fixture.destroy();
  }
});

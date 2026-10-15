import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaTag } from './ArenaTag';

function renderTag(removable: boolean) {
  const fixture = TestBed.createComponent(ArenaTag);
  fixture.componentRef.setInput('removable', removable);
  fixture.detectChanges();
  return fixture;
}

test('removable renders a labelled dismiss button; the default renders none', () => {
  const withRemove = renderTag(true);
  try {
    const button = (withRemove.nativeElement as Element).querySelector('button[aria-labelledby]');
    assert.ok(button, 'removable=true must render a dismiss button');
  } finally {
    withRemove.destroy();
  }

  const without = renderTag(false);
  try {
    assertNoNode((without.nativeElement as Element).querySelector('button'), 'removable=false (the default) must render no dismiss button');
  } finally {
    without.destroy();
  }
});

test('clicking the dismiss button emits remove', () => {
  const fixture = renderTag(true);
  try {
    const instance = fixture.componentInstance as unknown as { remove: { subscribe(cb: () => void): void } };
    let emitted = false;
    instance.remove.subscribe(() => {
      emitted = true;
    });

    const button = (fixture.nativeElement as Element).querySelector('button[aria-labelledby]') as HTMLElement;
    assert.ok(button, 'sanity: the dismiss button must be present to click it');
    button.dispatchEvent(new (globalThis as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent('click', { bubbles: true }));

    assert.equal(emitted, true, 'clicking the dismiss button must emit remove');
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaTag],
  template: `<arena-tag removable>Berlin</arena-tag><arena-tag removable [tabStop]="false">Lisbon</arena-tag>`,
})
class TwoTags {}

test('each remove button is named by the remove word and its own tag\'s text', () => {
  const fixture = TestBed.createComponent(TwoTags);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const names = Array.from(root.querySelectorAll('button')).map((button) => (button.getAttribute('aria-labelledby') ?? '')
      .split(' ').map((id) => root.ownerDocument.getElementById(id)?.textContent?.trim()).join(' '));
    assert.deepEqual(names, ['Remove Berlin', 'Remove Lisbon']);
    assert.equal(root.querySelector('button')?.hasAttribute('aria-label'), false);
  } finally {
    fixture.destroy();
  }
});

test('tabStop false holds the remove button out of the Tab sequence, and the default writes nothing', () => {
  const fixture = TestBed.createComponent(TwoTags);
  try {
    fixture.detectChanges();
    const [first, second] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    assert.equal(first.hasAttribute('tabindex'), false);
    assert.equal(second.getAttribute('tabindex'), '-1');
  } finally {
    fixture.destroy();
  }
});

test('the tone dot is hidden from assistive technology', () => {
  const fixture = renderTag(false);
  try {
    const dot = (fixture.nativeElement as Element).querySelector('[data-arena-part="tag.dot"]');
    assert.equal(dot?.getAttribute('aria-hidden'), 'true');
  } finally {
    fixture.destroy();
  }
});

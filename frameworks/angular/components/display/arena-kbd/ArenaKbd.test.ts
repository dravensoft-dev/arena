/* A key is named, never bound, so the markup is the whole question: one <kbd> for the combination
 * and one inside it per key, which is how HTML spells a key as it appears on a keyboard, the
 * separator drawn between caps and never heard, and a label that replaces the caps for a reader
 * when their glyphs would be read badly. The host draws no box around the element. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaKbd } from './ArenaKbd';

@Component({
  selector: 'kbd-test-host',
  standalone: true,
  imports: [ArenaKbd],
  template: '<arena-kbd [keys]="keys" [separator]="separator" [label]="label" />',
})
class KbdHost {
  keys: readonly string[] = ['Esc'];
  separator: string | undefined = undefined;
  label: string | undefined = undefined;
}

function render(patch: Partial<KbdHost> = {}) {
  const fixture = TestBed.createComponent(KbdHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-kbd') as HTMLElement;
  return { fixture, host, root: host.firstElementChild as HTMLElement };
}

const caps = (root: HTMLElement) => [...root.querySelectorAll('[data-arena-part="kbd.key"]')];

test('one key is an outer kbd holding one inner kbd', () => {
  const { fixture, host, root } = render();
  try {
    assert.match(host.getAttribute('style') ?? '', /display:\s*contents/);
    assert.equal(root.tagName, 'KBD');
    assert.equal(root.getAttribute('data-arena-part'), 'kbd');
    const keys = caps(root);
    assert.equal(keys.length, 1);
    assert.equal(keys[0]!.tagName, 'KBD', 'one structure for any length: the combination, then a cap per key');
    assert.equal(keys[0]!.textContent, 'Esc');
    assertNoNode(root.querySelector('[data-arena-part="kbd.separator"]'), 'a separator is drawn between caps, never before the first');
  } finally { fixture.destroy(); }
});

test('a combination draws its caps in the order pressed, with the separator between them and hidden', () => {
  const { fixture, root } = render({ keys: ['Ctrl', 'Shift', 'P'] });
  try {
    assert.deepEqual(caps(root).map((one) => one.textContent), ['Ctrl', 'Shift', 'P']);
    const separators = [...root.querySelectorAll('[data-arena-part="kbd.separator"]')];
    assert.equal(separators.length, 2);
    for (const one of separators) {
      assert.equal(one.getAttribute('aria-hidden'), 'true', 'a reader hears the keys, not the plus signs between them');
      assert.equal(one.textContent, '+');
    }
  } finally { fixture.destroy(); }
});

test('an empty separator glues the caps, as a Mac shortcut is printed', () => {
  const { fixture, root } = render({ keys: ['⌘', 'K'], separator: '' });
  try {
    assert.deepEqual(caps(root).map((one) => one.textContent), ['⌘', 'K']);
    assertNoNode(root.querySelector('[data-arena-part="kbd.separator"]'), 'an empty separator still drew one');
  } finally { fixture.destroy(); }
});

test('a label hides the caps from a reader and is the one spoken text', () => {
  const { fixture, root } = render({ keys: ['⌘', 'K'], label: 'Command K' });
  try {
    for (const one of caps(root))
      assert.equal(one.getAttribute('aria-hidden'), 'true', 'a cap left audible is read twice, once as a glyph and once as the label');
    assert.equal(root.querySelector('[data-arena-part="kbd.name"]')?.textContent, 'Command K');
  } finally { fixture.destroy(); }
  const bare = render({ keys: ['K'] });
  try {
    assert.equal(caps(bare.root)[0]!.hasAttribute('aria-hidden'), false, 'with no label the caps are what a reader hears');
  } finally { bare.fixture.destroy(); }
});

test('a blank label is no label, so the caps stay audible and no name is drawn', () => {
  const { fixture, root } = render({ keys: ['⌘', 'K'], label: '  ' });
  try {
    for (const one of caps(root))
      assert.equal(one.hasAttribute('aria-hidden'), false, 'a blank label hid every cap behind an empty name');
    assertNoNode(root.querySelector('[data-arena-part="kbd.name"]'), 'a blank label drew a name');
  } finally { fixture.destroy(); }
});

test('an empty list and a blank entry are refused, because a cap with nothing on it is not a key', () => {
  for (const keys of [[], ['Ctrl', '  ']]) {
    const fixture = TestBed.createComponent(KbdHost);
    try {
      fixture.componentInstance.keys = keys;
      assert.throws(() => fixture.detectChanges(), /ArenaKbd: `keys` is required/);
    } finally { fixture.destroy(); }
  }
});

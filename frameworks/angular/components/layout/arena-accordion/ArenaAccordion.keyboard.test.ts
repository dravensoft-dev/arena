/* Down, Up, Home and End are Arena's own between the headers of one accordion: APG lists none of
 * them, so the pattern does not require them and this suite proves them. A field in a panel and a
 * nested accordion keep their keys. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { ArenaAccordion } from './ArenaAccordion';
import { ArenaAccordionItem } from '../arena-accordion-item/ArenaAccordionItem';

@Component({
  selector: 'accordion-keyboard-host',
  standalone: true,
  imports: [ArenaAccordion, ArenaAccordionItem],
  template: `
    <arena-accordion defaultValue="ship">
      <arena-accordion-item value="ship" label="What ships">
        <input id="field" value="eu-west" />
        <arena-accordion defaultValue="inner-a">
          <arena-accordion-item value="inner-a" label="Inner A">a</arena-accordion-item>
          <arena-accordion-item value="inner-b" label="Inner B">b</arena-accordion-item>
        </arena-accordion>
      </arena-accordion-item>
      <arena-accordion-item value="roll" label="How it rolls out">Roll body</arena-accordion-item>
      <arena-accordion-item value="back" label="When it rolls back">Back body</arena-accordion-item>
    </arena-accordion>
  `,
})
class KeyboardHost {}

function render() {
  const fixture = TestBed.createComponent(KeyboardHost);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  const root = fixture.nativeElement as HTMLElement;
  const all = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-arena-part="accordion.trigger"]'));
  const inner = all.filter((b) => b.textContent?.trim().startsWith('Inner'));
  const outer = all.filter((b) => !inner.includes(b));
  const key = (target: HTMLElement, name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const expanded = () => outer.map((b) => b.getAttribute('aria-expanded'));
  return { fixture, root, outer, inner, key, expanded };
}

test('down, up, home and end move focus between the headers, wrapping, and toggle nothing', () => {
  const { fixture, outer, key, expanded } = render();
  try {
    const [first, second, third] = outer;
    first!.focus();
    assert.equal(key(first!, 'ArrowDown').defaultPrevented, true);
    assertSameNode(document.activeElement, second!, 'down moves to the next header');
    key(second!, 'End');
    assertSameNode(document.activeElement, third!, 'end reaches the last header');
    key(third!, 'ArrowDown');
    assertSameNode(document.activeElement, first!, 'down from the last wraps to the first');
    key(first!, 'ArrowUp');
    assertSameNode(document.activeElement, third!, 'up from the first wraps to the last');
    key(third!, 'Home');
    assertSameNode(document.activeElement, first!, 'home reaches the first header');
    assert.deepEqual(expanded(), ['true', 'false', 'false']);
    assert.ok(outer.every((b) => !b.hasAttribute('tabindex')), 'every header stays in the Tab sequence');
  } finally {
    fixture.destroy();
  }
});

test('a field in a panel and a nested accordion keep their own keys', () => {
  const { fixture, root, inner, key } = render();
  try {
    const field = root.querySelector<HTMLInputElement>('#field')!;
    field.focus();
    assert.equal(key(field, 'Home').defaultPrevented, false, 'Home in a field moves the caret, not the focus');
    assertSameNode(document.activeElement, field, 'the field keeps the focus');
    inner[0]!.focus();
    key(inner[0]!, 'ArrowDown');
    assertSameNode(document.activeElement, inner[1]!, 'the nested accordion moves between its own headers');
    key(inner[1]!, 'ArrowDown');
    assertSameNode(document.activeElement, inner[0]!, 'and wraps inside itself, never reaching the outer headers');
  } finally {
    fixture.destroy();
  }
});

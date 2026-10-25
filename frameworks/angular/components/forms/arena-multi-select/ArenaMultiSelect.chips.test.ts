/* The chip keyboard, which the combobox pattern does not cover: the field is the one tab stop, an empty
 * field's ArrowLeft or Backspace moves to the last chip and never removes silently, the arrows walk the
 * chips and ArrowRight past the last returns to the field, and removing a chip hands focus to its
 * neighbour or back to the field. Focus moves after the render, so each step flushes it. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { disposeOverlays } from '../../../test/Overlays';
import { ArenaMultiSelect } from './ArenaMultiSelect';

@Component({
  standalone: true,
  imports: [ArenaMultiSelect],
  template: `<arena-multi-select label="Cities" [options]="options" [value]="value()" [maxVisible]="maxVisible()"
                                 (valueChange)="sets.push($event.values); value.set($event.values)" />`,
})
class ChipHost {
  readonly options = [{ value: 'berlin', label: 'Berlin' }, { value: 'lisbon', label: 'Lisbon' }, { value: 'oslo', label: 'Oslo' }];
  readonly value = signal<readonly string[]>(['berlin', 'lisbon', 'oslo']);
  readonly maxVisible = signal<number | undefined>(undefined);
  readonly sets: (readonly string[])[] = [];
}

type View = { fixture: ComponentFixture<ChipHost>; host: ChipHost; input: HTMLInputElement; removes: () => HTMLElement[] };

function run(setup: (host: ChipHost) => void, body: (view: View) => void) {
  const fixture = TestBed.createComponent(ChipHost);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('[role="combobox"]') as HTMLInputElement;
  input.focus();
  const removes = () => Array.from(root.querySelectorAll<HTMLElement>('[data-arena-part="tag.close"]'));
  try { body({ fixture, host: fixture.componentInstance, input, removes }); } finally { fixture.destroy(); disposeOverlays(); }
}

function key(view: View, target: Element, name: string) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  view.fixture.detectChanges();
  return event;
}

test('the field is the one tab stop, and each remove reads the word and its own chip', () => {
  run(() => {}, (view) => {
    const root = view.fixture.nativeElement as HTMLElement;
    const tabbable = Array.from(root.querySelectorAll<HTMLElement>('input, button')).filter((one) => one.tabIndex >= 0);
    assert.deepEqual(tabbable.map((one) => one.getAttribute('role')), ['combobox']);
    const names = view.removes().map((button) => (button.getAttribute('aria-labelledby') ?? '').split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim()).join(' '));
    assert.deepEqual(names, ['Remove Berlin', 'Remove Lisbon', 'Remove Oslo']);
  });
});

test('Backspace on an empty field moves to the last chip, and the second press removes it', () => {
  run(() => {}, (view) => {
    key(view, view.input, 'Backspace');
    assertSameNode(document.activeElement, view.removes()[2]);
    assert.deepEqual(view.host.sets, []);
    key(view, view.removes()[2], 'Backspace');
    assert.deepEqual(view.host.sets, [['berlin', 'lisbon']]);
    assertSameNode(document.activeElement, view.removes()[1]);
  });
});

test('ArrowLeft walks the chips and stops at the first, and ArrowRight past the last returns to the field', () => {
  run(() => {}, (view) => {
    key(view, view.input, 'ArrowLeft');
    key(view, view.removes()[2], 'ArrowLeft');
    key(view, view.removes()[1], 'ArrowLeft');
    key(view, view.removes()[0], 'ArrowLeft');
    assertSameNode(document.activeElement, view.removes()[0]);
    key(view, view.removes()[0], 'ArrowRight');
    key(view, view.removes()[1], 'ArrowRight');
    key(view, view.removes()[2], 'ArrowRight');
    assertSameNode(document.activeElement, view.input);
  });
});

test('Delete removes the focused chip and hands focus on; the last one left hands it to the field', () => {
  run(() => {}, (view) => {
    key(view, view.input, 'ArrowLeft');
    key(view, view.removes()[2], 'ArrowLeft');
    key(view, view.removes()[1], 'ArrowLeft');
    key(view, view.removes()[0], 'Delete');
    assert.deepEqual(view.host.sets.at(-1), ['lisbon', 'oslo']);
    assertSameNode(document.activeElement, view.removes()[0]);
    key(view, view.removes()[0], 'Delete');
    key(view, view.removes()[0], 'Delete');
    assert.deepEqual(view.host.sets.at(-1), []);
    assertSameNode(document.activeElement, view.input);
  });
});

test('only the drawn chips are walked, and the rest collapse into a count', () => {
  run((host) => host.maxVisible.set(2), (view) => {
    assert.equal(view.removes().length, 2);
    const more = (view.fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="combobox.more"]');
    assert.equal(more?.textContent?.trim(), '+1');
    assert.equal(more?.getAttribute('aria-label'), '1 more selected');
    key(view, view.input, 'Backspace');
    assertSameNode(document.activeElement, view.removes()[1]);
  });
});

test('Enter and Space on a remove button are left to its own activation; a click removes that chip and walks focus', () => {
  run(() => {}, (view) => {
    view.removes()[1]!.focus();
    for (const name of ['Enter', ' ']) {
      const event = key(view, view.removes()[1]!, name);
      assert.equal(event.defaultPrevented, false, `${JSON.stringify(name)} keydown was taken`);
    }
    assert.deepEqual(view.host.sets, [], 'a keydown alone removed a chip');
    view.removes()[1]!.click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.sets, [['berlin', 'oslo']]);
    assertSameNode(document.activeElement, view.removes()[1], 'focus moves to the neighbour');
  });
});

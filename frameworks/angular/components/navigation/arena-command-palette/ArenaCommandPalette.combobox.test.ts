/* The combobox-pattern suite this component's binding requires. What is particular here is Enter: it used
 * to emit `run` alone, so a host that forgot to close left the palette over the
 * result it had just produced. It emits `close` first now -- the same event the
 * scrim click emits, so the host still owns `open` and the layer's controlled
 * idiom is intact. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaCommandPalette } from './ArenaCommandPalette';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-command-palette/ArenaCommandPalette.behaviour.json');

const COMMANDS = [
  { id: 'deploy', label: 'Deploy to production', shortcut: '⌘D' },
  { id: 'rollback', label: 'Roll back the last release' },
  { id: 'invite', label: 'Invite a teammate', hint: 'people' },
];

function press(el: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

function render() {
  const fixture = TestBed.createComponent(ArenaCommandPalette);
  fixture.componentRef.setInput('commands', COMMANDS);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    input: host.querySelector('[role="combobox"]') as HTMLElement,
    options: Array.from(host.querySelectorAll<HTMLElement>('[role="option"]')),
  };
}

test('the search field is a combobox that names the row it is on', () => {
  const { fixture, host, input, options } = render();
  try {
    assert.equal(input.getAttribute('aria-expanded'), 'true');

    const listbox = host.querySelector('[role="listbox"]') as HTMLElement;
    assert.equal(input.getAttribute('aria-controls'), listbox.getAttribute('id'),
      'aria-controls must resolve inside the render, or the evaluator counts it unmet');

    assert.equal(options.length, COMMANDS.length, 'one option per command');
    assert.equal(input.getAttribute('aria-activedescendant'), options[0].getAttribute('id'));

    press(input, 'ArrowDown');
    fixture.detectChanges();
    assert.equal(input.getAttribute('aria-activedescendant'), options[1].getAttribute('id'),
      'ArrowDown moved the highlight without moving the reference to it');

    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: input },
      behavioural: { 'keyboard.ArrowDown': true, 'keyboard.Escape': true, 'keyboard.Enter': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('Enter closes before it runs, so a host that only listens to run is not left open', () => {
  const { fixture, input } = render();
  try {
    const order: string[] = [];
    fixture.componentInstance.close.subscribe(() => order.push('close'));
    fixture.componentInstance.run.subscribe((c) => order.push(`run:${c.id}`));

    const enter = press(input, 'Enter');
    assert.equal(enter.defaultPrevented, true, 'Enter was not claimed');
    assert.deepEqual(order, ['close', 'run:deploy'],
      'close must come first, which is the order the API contract states');

    const escape = press(input, 'Escape');
    assert.equal(escape.defaultPrevented, true, 'Escape was not claimed');
    assert.deepEqual(order, ['close', 'run:deploy', 'close'], 'Escape must report through close alone');
  } finally {
    fixture.destroy();
  }
});

test('the escape cap and every shortcut are kbd elements, printed as given', () => {
  const { fixture, host } = render();
  try {
    const esc = host.querySelector<HTMLElement>('[data-arena-part="command-palette.esc"]')!;
    assert.equal(esc.tagName, 'KBD', 'the escape cap is a span, so the one cap Arena already drew is not keyboard input to a reader');
    const shortcut = host.querySelector<HTMLElement>('[data-arena-part="command-palette.shortcut"]')!;
    assert.equal(shortcut.tagName, 'KBD');
    assert.equal(shortcut.textContent, '⌘D', 'the string is printed whole, as the type field holds it');
  } finally {
    fixture.destroy();
  }
});

test('the empty line sits in the panel after the listbox, not inside it', () => {
  const fixture = TestBed.createComponent(ArenaCommandPalette);
  fixture.componentRef.setInput('commands', []);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const empty = host.querySelector('[data-arena-part="command-palette.empty"]');
  assert.ok(empty, 'no empty line was drawn');
  assert.equal(empty.parentElement?.getAttribute('data-arena-part'), 'command-palette.panel');
  assert.equal(host.querySelector('[role="listbox"] [data-arena-part="command-palette.empty"]'), null);
});

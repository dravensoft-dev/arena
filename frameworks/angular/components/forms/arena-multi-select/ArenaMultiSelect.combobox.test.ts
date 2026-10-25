/* The combobox pattern this component binds, evaluated open with document.body as the root, since the
 * list lives in the CDK's pane. Then the listbox facts and the set behaviour the pattern leaves to the
 * suite: aria-multiselectable and aria-selected, Enter toggling and closing the list with the text
 * cleared, a press toggling a row with the list kept open, the order chosen, the cap blocking and
 * announcing, the clear control, and the native change and input reaching the page. The rows are read
 * from the CDK's container, not the whole body: the document is shared across the run, and the
 * palette's keyboard suite leaves a listbox of its own in the body. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS, TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { disposeOverlays } from '../../../test/Overlays';
import type { ArenaValueSet } from '../../../Api.generated';
import { ArenaMultiSelect } from './ArenaMultiSelect';
import manifest from '../arena-combobox/ArenaCombobox.classes.generated';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-multi-select/ArenaMultiSelect.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaMultiSelect],
  template: `
    <div (change)="leaked.push('change')" (input)="leaked.push('input')">
      <arena-multi-select label="Regions" name="regions" [options]="options" [value]="value()" [max]="max()" [disabled]="off()" [clearable]="true"
                          (valueChange)="sets.push($event.values); value.set($event.values)" (search)="searches.push($event)" />
    </div>
  `,
})
class MultiHost {
  readonly options = [
    { value: 'eu-west', label: 'Europe West' },
    { value: 'eu-north', label: 'Europe North' },
    { value: 'us-east', label: 'US East' },
  ];
  readonly value = signal<readonly string[]>([]);
  readonly max = signal<number | undefined>(undefined);
  readonly off = signal(false);
  readonly sets: (readonly string[])[] = [];
  readonly searches: string[] = [];
  readonly leaked: string[] = [];
}

type View = { fixture: ComponentFixture<MultiHost>; host: MultiHost; input: HTMLInputElement; root: HTMLElement };

function run(setup: (host: MultiHost) => void, body: (view: View) => void) {
  const fixture = TestBed.createComponent(MultiHost);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('[role="combobox"]') as HTMLInputElement;
  input.focus();
  try { body({ fixture, host: fixture.componentInstance, input, root }); } finally { fixture.destroy(); disposeOverlays(); }
}

function type(view: View, text: string) {
  view.input.value = text;
  view.input.dispatchEvent(new Event('input', { bubbles: true }));
  view.fixture.detectChanges();
}

function key(view: View, name: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  view.input.dispatchEvent(event);
  view.fixture.detectChanges();
  return event;
}

const overlay = (): ParentNode => document.querySelector('.cdk-overlay-container') ?? document.body;
const options = () => Array.from(overlay().querySelectorAll<HTMLElement>('[role="option"]'));
const activeRow = (input: HTMLElement) => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent?.trim();

function enterAcceptsAndCloses(): boolean {
  let verdict = false;
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    key(view, 'ArrowDown');
    const open = view.input.getAttribute('aria-expanded') === 'true';
    key(view, 'Enter');
    verdict = open && view.host.sets.length === 1
      && view.input.getAttribute('aria-expanded') === 'false' && !view.input.hasAttribute('aria-controls');
  });
  return verdict;
}

test('Enter accepts the cursor row and closes the popup, as the pattern says', () => {
  assert.equal(enterAcceptsAndCloses(), true);
});

test('arena-multi-select meets the combobox pattern it binds, open', () => {
  const enter = enterAcceptsAndCloses();
  run((host) => host.value.set(['us-east']), (view) => {
    key(view, 'ArrowDown');
    assertPattern({
      root: document.body,
      bindingPath: BINDING,
      subjects: { default: view.input },
      behavioural: { 'keyboard.ArrowDown': true, 'keyboard.Escape': true, 'keyboard.Enter': enter },
    });
  });
});

test('aria-expanded toggles, and aria-controls names the list only while it is there', () => {
  run((host) => host.value.set(['us-east']), (view) => {
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.hasAttribute('aria-controls'), false);
    key(view, 'ArrowDown');
    const listbox = overlay().querySelector<HTMLElement>('[role="listbox"]')!;
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
    assert.equal(listbox.getAttribute('aria-multiselectable'), 'true');
    assert.equal(view.input.getAttribute('aria-controls'), listbox.id);
    assert.deepEqual(options().map((row) => row.getAttribute('aria-selected')), ['false', 'false', 'true']);
    assert.equal(key(view, 'Escape').defaultPrevented, true);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assertNoNode(overlay().querySelector('[role="listbox"]'));
  });
});

test('Enter toggles the cursor row, clears the text and closes the list; '
  + 'the cursor opens again on the chosen row', () => {
  run(() => {}, (view) => {
    type(view, 'north');
    key(view, 'Enter');
    assert.deepEqual(view.host.sets, [['eu-north']]);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false', 'the list stayed open after Enter');
    assert.equal(view.input.value, '');
    assert.deepEqual(view.host.searches, ['north', '']);
    key(view, 'ArrowDown');
    assert.equal(options().length, 3);
    assert.equal(activeRow(view.input), 'Europe North');
    key(view, 'Enter');
    assert.deepEqual(view.host.sets[1], []);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
  });
});

test('the set keeps the order chosen, whatever the order of the options', () => {
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    options()[2].click();
    view.fixture.detectChanges();
    options()[0].click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.sets.at(-1), ['us-east', 'eu-west']);
    assertSameNode(document.activeElement, view.input);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true', 'a press on a row closed the list');
  });
});

test('at the cap the unchosen rows are unavailable, choosing one is blocked and announced, '
  + 'and removing still works', () => {
  run((host) => { host.value.set(['eu-west', 'us-east']); host.max.set(2); }, (view) => {
    key(view, 'ArrowDown');
    assert.equal(options()[1].getAttribute('aria-disabled'), 'true');
    assert.equal(options()[0].hasAttribute('aria-disabled'), false);
    key(view, 'ArrowDown');
    key(view, 'Enter');
    assert.deepEqual(view.host.sets, []);
    assert.equal(view.root.querySelector('[role="status"]')?.textContent?.trim(), 'Maximum of 2 selected.');
    assert.equal(view.input.getAttribute('aria-expanded'), 'true', 'a blocked Enter closed the list');
    key(view, 'ArrowUp');
    key(view, 'Enter');
    assert.deepEqual(view.host.sets, [['us-east']]);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
  });
});

test('the clear control empties the set and leaves focus in the field', () => {
  run((host) => host.value.set(['eu-west', 'us-east']), (view) => {
    const clear = view.root.querySelector('[data-arena-part="combobox.clear"]') as HTMLButtonElement;
    assert.equal(clear.getAttribute('tabindex'), '-1');
    clear.click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.sets, [[]]);
    assertSameNode(document.activeElement, view.input);
    assertNoNode(view.root.querySelector('[data-arena-part="combobox.clear"]'));
  });
});

test('typing narrows the list, reports the text and announces the count', () => {
  run(() => {}, (view) => {
    type(view, 'europe');
    assert.equal(options().length, 2);
    assert.deepEqual(view.host.searches, ['europe']);
    assert.equal(view.root.querySelector('[role="status"]')?.textContent?.trim(), 'Options available: 2.');
  });
});

test('every chosen value is submitted as a hidden input, and the native input and change reach the page', () => {
  run((host) => host.value.set(['eu-west', 'us-east']), (view) => {
    const hidden = Array.from(view.root.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));
    assert.deepEqual(hidden.map((one) => [one.name, one.value]), [['regions', 'eu-west'], ['regions', 'us-east']]);
    assert.deepEqual(hidden.map((one) => one.disabled), [false, false]);
    type(view, 'nor');
    view.input.dispatchEvent(new Event('change', { bubbles: true }));
    key(view, 'Enter');
    assert.deepEqual(view.host.leaked, ['input', 'change']);
  });
});

test('the change carries the whole set as an object', () => {
  run(() => {}, (view) => {
    const seen: ArenaValueSet[] = [];
    view.fixture.debugElement.query((node) => node.name === 'arena-multi-select').componentInstance.valueChange
      .subscribe((set: ArenaValueSet) => seen.push(set));
    type(view, 'us');
    key(view, 'Enter');
    assert.deepEqual(seen, [{ values: ['us-east'] }]);
  });
});

test('the panel class grows it to fill the overlay pane, so it is as wide as the field', () => {
  run(() => {}, (view) => {
    type(view, 'e');
    const panel = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
    const source = join(TAILWIND_COMPONENTS, 'forms/arena-combobox/ArenaCombobox.manifest.json');
    const slots = JSON.parse(readFileSync(source, 'utf8')).slots;
    assert.ok(panel.classList.contains(manifest.slots.panel));
    assert.ok(slots.panel.split(' ').includes('grow'));
    assert.equal(panel.style.flexGrow, '');
  });
});

test('a press on the panel itself or on the empty row never blurs the field or closes the list', () => {
  run(() => {}, (view) => {
    type(view, 'zzz');
    const panel = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
    const empty = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.empty"]')!;
    assert.ok(panel && empty, 'the panel and the empty row are drawn');
    for (const target of [panel, empty]) {
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      view.fixture.detectChanges();
      assert.equal(event.defaultPrevented, true);
      assertSameNode(document.activeElement, view.input);
      assert.equal(view.input.getAttribute('aria-expanded'), 'true');
    }
  });
});

test('a disabled multi-select submits nothing', () => {
  run((host) => { host.value.set(['eu-west', 'us-east']); host.off.set(true); }, (view) => {
    const hidden = Array.from(view.root.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));
    assert.equal(hidden.length, 2);
    assert.deepEqual(hidden.map((one) => one.disabled), [true, true]);
  });
});

const status = (view: View) => view.root.querySelector('[role="status"]')?.textContent ?? '';

test('a blocked choice said twice reads differently, so the live region speaks the second attempt', () => {
  run((host) => { host.value.set(['eu-west', 'us-east']); host.max.set(2); }, (view) => {
    key(view, 'ArrowDown');
    key(view, 'ArrowDown');
    key(view, 'Enter');
    const first = status(view);
    key(view, 'Enter');
    assert.notEqual(status(view), first, 'the second blocked Enter set the same text');
    assert.equal(status(view).trim(), first.trim());
  });
});

test('the cap notice goes when a chip is removed or the set is cleared', () => {
  const blocked = (view: View) => {
    key(view, 'ArrowDown');
    key(view, 'ArrowDown');
    key(view, 'Enter');
    assert.equal(status(view).trim(), 'Maximum of 2 selected.');
  };
  run((host) => { host.value.set(['eu-west', 'us-east']); host.max.set(2); }, (view) => {
    blocked(view);
    view.root.querySelector<HTMLElement>('[data-arena-part="tag.close"]')!.click();
    view.fixture.detectChanges();
    assert.equal(status(view).trim(), '', 'a removal left the notice');
  });
  run((host) => { host.value.set(['eu-west', 'us-east']); host.max.set(2); }, (view) => {
    blocked(view);
    view.root.querySelector<HTMLElement>('[data-arena-part="combobox.clear"]')!.click();
    view.fixture.detectChanges();
    assert.equal(status(view).trim(), '', 'clearing left the notice');
  });
});

test('each Enter guard holds alone: the open composition, isComposing and keyCode 229', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    assert.equal(activeRow(view.input), 'US East');
    view.input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    key(view, 'Enter');
    assert.deepEqual(view.host.sets, [], 'an open composition did not hold the Enter alone');
    view.input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    key(view, 'Enter', { isComposing: true });
    assert.deepEqual(view.host.sets, [], 'isComposing did not hold the Enter alone');
    key(view, 'Enter', { keyCode: 229 });
    assert.deepEqual(view.host.sets, [], 'the Safari Enter after compositionend toggled the cursor row');
    key(view, 'Enter');
    assert.deepEqual(view.host.sets, [['us-east']]);
  });
});

test('Enter on an open list with no cursor row is claimed, so the surrounding form does not submit', () => {
  run(() => {}, (view) => {
    type(view, 'zz');
    assert.equal(key(view, 'Enter').defaultPrevented, true);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
  });
});

test('a press on the field outside the input opens the list and keeps the focus there; '
  + 'a chip button keeps its own press', () => {
  run((host) => host.value.set(['eu-west']), (view) => {
    for (const part of ['combobox.caret', 'combobox.chips']) {
      const target = view.root.querySelector(`[data-arena-part="${part}"]`)!;
      assert.ok(target, part);
      view.input.blur();
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.dispatchEvent(press);
      view.fixture.detectChanges();
      assert.equal(press.defaultPrevented, true, `${part} let the press move focus away`);
      assertSameNode(document.activeElement, view.input);
      assert.equal(view.input.getAttribute('aria-expanded'), 'true');
      key(view, 'Escape');
    }
    const remove = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    view.root.querySelector('[data-arena-part="tag.close"]')!.dispatchEvent(remove);
    assert.equal(remove.defaultPrevented, false, 'the press on a remove button was taken');
  });
});

test('a press on the status icon opens the list and keeps the focus in the input', () => {
  const fixture = TestBed.createComponent(ArenaMultiSelect);
  fixture.componentRef.setInput('label', 'Regions');
  fixture.componentRef.setInput('options', [{ value: 'eu-west', label: 'Europe West' }]);
  fixture.componentRef.setInput('error', 'Pick one');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('[role="combobox"]') as HTMLInputElement;
  try {
    const target = el.querySelector('[data-arena-part="combobox.status-icon"]')!;
    assert.ok(target);
    input.blur();
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    target.dispatchEvent(press);
    fixture.detectChanges();
    assert.equal(press.defaultPrevented, true);
    assertSameNode(document.activeElement, input);
    assert.equal(input.getAttribute('aria-expanded'), 'true');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a dismissal that does not blur the input closes the list, clears the text and resets the query', () => {
  run(() => {}, (view) => {
    type(view, 'nor');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    view.fixture.detectChanges();
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.value, '', 'the draft outlived the dismissal');
    assert.deepEqual(view.host.searches, ['nor', '']);
  });
});

test('search is told the empty text whenever the control empties the query it last reported', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    key(view, 'Enter');
    assert.deepEqual(view.host.searches, ['us', '']);
    key(view, 'ArrowDown');
    key(view, 'Escape');
    assert.deepEqual(view.host.searches, ['us', ''], 'an empty query was reported again');
    type(view, 'eu');
    options()[0].click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.searches, ['us', '', 'eu', ''], 'a toggle left the host on the old text');
    type(view, 'eu');
    view.input.blur();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.searches, ['us', '', 'eu', '', 'eu', '']);
  });
});

@Component({
  standalone: true,
  imports: [ArenaMultiSelect],
  template: `
    <arena-multi-select label="Cities" filter="none" [options]="shown()" [value]="value()"
                        (valueChange)="value.set($event.values)" (search)="shown.set($event === '' ? all : [{ value: 'fr-pa', label: 'Paris' }])" />
  `,
})
class RemoteHost {
  readonly all = [{ value: 'de-be', label: 'Berlin' }, { value: 'pt-li', label: 'Lisbon' }];
  readonly shown = signal<{ value: string; label: string }[]>(this.all);
  readonly value = signal<readonly string[]>(['de-be']);
}

test('remote mode keeps a chip\'s label after options stops holding its value', () => {
  const fixture = TestBed.createComponent(RemoteHost);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('[role="combobox"]') as HTMLInputElement;
  const view = { fixture, input } as unknown as View;
  const chips = () => Array.from(el.querySelectorAll('arena-tag')).map((tag) => tag.textContent?.replace('Remove', '').trim());
  try {
    input.focus();
    assert.deepEqual(chips(), ['Berlin']);
    type(view, 'pa');
    assert.deepEqual(options().map((row) => row.textContent?.trim()), ['Paris']);
    assert.deepEqual(chips(), ['Berlin'], 'the chip fell back to its raw value');
    key(view, 'ArrowDown');
    key(view, 'Enter');
    fixture.componentInstance.shown.set([]);
    fixture.detectChanges();
    assert.deepEqual(chips(), ['Berlin', 'Paris'], 'a chosen row lost its label once options went empty');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a value held twice is one chip, one hidden input and one removal', () => {
  run((host) => host.value.set(['eu-west', 'eu-west']), (view) => {
    assert.equal(view.root.querySelectorAll('[data-arena-part="tag.close"]').length, 1);
    assert.equal(view.root.querySelectorAll('input[type="hidden"]').length, 1);
    view.root.querySelector<HTMLElement>('[data-arena-part="tag.close"]')!.click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.sets, [[]]);
  });
});

test('a press with a button other than the main one does not open the list or hold the focus', () => {
  run(() => {}, (view) => {
    const caret = view.root.querySelector('[data-arena-part="combobox.caret"]')!;
    view.input.blur();
    for (const button of [1, 2]) {
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button });
      caret.dispatchEvent(press);
      view.fixture.detectChanges();
      assert.equal(press.defaultPrevented, false, `button ${button} was taken`);
      assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    }
    const main = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
    caret.dispatchEvent(main);
    view.fixture.detectChanges();
    assert.equal(main.defaultPrevented, true);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
  });
});

test('options that repeat a value draw every row and key without a warning', () => {
  const noise: string[] = [];
  const { error, warn } = console;
  console.error = console.warn = (...args: unknown[]) => { noise.push(args.map(String).join(' ')); };
  try {
    run((host) => host.options.push(host.options[0]), (view) => {
      key(view, 'ArrowDown');
      assert.equal(options().length, 4);
    });
  } finally {
    console.error = error;
    console.warn = warn;
  }
  assert.deepEqual(noise, []);
});

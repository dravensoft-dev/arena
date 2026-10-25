/* The combobox pattern this component binds, evaluated open with document.body as the root, since the
 * list lives in the CDK's pane while the field stays in the fixture. Then what the pattern leaves to the
 * suite, read from the DOM after each event: aria-expanded toggles, typing narrows and reports, the
 * cursor stops at the ends, Enter chooses, Escape and leaving restore, an emptied field clears or
 * restores, a composition is never filtered half-typed, and the native change and input reach the page.
 * The rows are read from the CDK's container, not the whole body: the document is shared across the run, and
 * the palette's keyboard suite leaves a listbox of its own in the body. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertPattern, ANGULAR_COMPONENTS, TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { disposeOverlays, overlayPanes } from '../../../test/Overlays';
import type { ArenaComboboxFilter } from '../../../Api.generated';
import { ArenaCombobox } from './ArenaCombobox';
import manifest from './ArenaCombobox.classes.generated';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-combobox/ArenaCombobox.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaCombobox],
  template: `
    <div id="outside" (change)="leaked.push('change')" (input)="leaked.push('input')">
      <arena-combobox label="Region" name="region" [options]="options" [value]="value()" [required]="required()"
                      [loading]="loading()" [filter]="filter()" [disabled]="disabled()"
                      (valueChange)="changes.push($event); value.set($event)" (search)="searches.push($event)" />
    </div>
  `,
})
class ComboboxHost {
  readonly options = [
    { value: 'eu-west', label: 'Europe West' },
    { value: 'eu-north', label: 'Europe North' },
    { value: 'us-east', label: 'US East' },
  ];
  readonly value = signal('eu-west');
  readonly required = signal(false);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly filter = signal<ArenaComboboxFilter>('local');
  readonly changes: string[] = [];
  readonly searches: string[] = [];
  readonly leaked: string[] = [];
}

type View = { fixture: ComponentFixture<ComboboxHost>; host: ComboboxHost; input: HTMLInputElement };

function render(setup: (host: ComboboxHost) => void = () => {}): View {
  const fixture = TestBed.createComponent(ComboboxHost);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('[role="combobox"]') as HTMLInputElement;
  input.focus();
  return { fixture, host: fixture.componentInstance, input };
}

function run(setup: (host: ComboboxHost) => void, body: (view: View) => void) {
  const view = render(setup);
  try { body(view); } finally { view.fixture.destroy(); disposeOverlays(); }
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
const rows = () => Array.from(overlay().querySelectorAll<HTMLElement>('[role="option"]')).map((row) => row.textContent?.trim());
const activeRow = (input: HTMLElement) => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent?.trim();

test('arena-combobox meets the combobox pattern it binds, open', () => {
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    assertPattern({
      root: document.body,
      bindingPath: BINDING,
      subjects: { default: view.input },
      behavioural: { 'keyboard.ArrowDown': true, 'keyboard.Escape': true, 'keyboard.Enter': true },
    });
  });
});

test('aria-expanded toggles, and aria-controls names the list only while it is there', () => {
  run(() => {}, (view) => {
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.hasAttribute('aria-controls'), false);
    key(view, 'ArrowDown');
    const listbox = overlay().querySelector<HTMLElement>('[role="listbox"]')!;
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
    assert.equal(view.input.getAttribute('aria-controls'), listbox.id);
    assert.equal(listbox.getAttribute('aria-label'), 'Region');
    const escape = key(view, 'Escape');
    assert.equal(escape.defaultPrevented, true);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.hasAttribute('aria-controls'), false);
    assertNoNode(overlay().querySelector('[role="listbox"]'));
  });
});

test('typing opens the list, keeps the rows whose label holds the text, and reports the text', () => {
  run(() => {}, (view) => {
    type(view, 'europe');
    assert.deepEqual(rows(), ['Europe West', 'Europe North']);
    assert.equal(activeRow(view.input), 'Europe West');
    assert.deepEqual(view.host.searches, ['europe']);
    assert.deepEqual(view.host.changes, []);
  });
});

test('ArrowDown opens on the chosen row with every option, and the arrows stop at both ends', () => {
  run((host) => host.value.set('eu-north'), (view) => {
    key(view, 'ArrowDown');
    assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East']);
    assert.equal(activeRow(view.input), 'Europe North');
    key(view, 'ArrowDown');
    key(view, 'ArrowDown');
    assert.equal(activeRow(view.input), 'US East');
    key(view, 'ArrowUp');
    key(view, 'ArrowUp');
    key(view, 'ArrowUp');
    assert.equal(activeRow(view.input), 'Europe West');
    assertSameNode(document.activeElement, view.input);
  });
});

test('Enter chooses the cursor row, closes the list and shows its label; the value travels', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    assert.equal(key(view, 'Enter').defaultPrevented, true);
    assert.deepEqual(view.host.changes, ['us-east']);
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.value, 'US East');
    const hidden = (view.fixture.nativeElement as HTMLElement).querySelector('input[type="hidden"]') as HTMLInputElement;
    assert.equal(hidden.value, 'us-east');
    assert.equal(hidden.name, 'region');
  });
});

test('Enter with no cursor row does nothing, and choosing the chosen option again reports nothing', () => {
  run(() => {}, (view) => {
    type(view, 'mars');
    assert.equal(view.input.hasAttribute('aria-activedescendant'), false);
    key(view, 'Enter');
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
    type(view, 'west');
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, []);
  });
});

test('Escape and leaving put the chosen label back without choosing, and a second Escape does nothing', () => {
  run(() => {}, (view) => {
    type(view, 'nor');
    key(view, 'Escape');
    assert.equal(view.input.value, 'Europe West');
    assert.equal(key(view, 'Escape').defaultPrevented, false);
    type(view, 'nor');
    view.input.blur();
    view.fixture.detectChanges();
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.value, 'Europe West');
    assert.deepEqual(view.host.changes, []);
  });
});

test('an emptied field clears an optional value and restores a required one', () => {
  run(() => {}, (view) => {
    type(view, '');
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, ['']);
  });
  run((host) => host.required.set(true), (view) => {
    type(view, '');
    view.input.blur();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.changes, []);
    assert.equal(view.input.value, 'Europe West');
  });
});

test('text typed and then deleted is an emptied field: an optional control clears, a required one restores', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    type(view, '');
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, ['']);
  });
  run((host) => host.required.set(true), (view) => {
    type(view, 'us');
    type(view, '');
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, []);
    assert.equal(view.input.value, 'Europe West');
  });
});

test('a press on a row chooses it and leaves focus in the field; a press outside closes the list', () => {
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    const row = overlay().querySelectorAll<HTMLElement>('[role="option"]')[2];
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    row.dispatchEvent(down);
    assert.equal(down.defaultPrevented, true);
    row.click();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.changes, ['us-east']);
    assertSameNode(document.activeElement, view.input);
    key(view, 'ArrowDown');
    assert.ok(view.input.getAttribute('aria-activedescendant'));
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    view.fixture.detectChanges();
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.hasAttribute('aria-controls'), false);
    assert.equal(view.input.hasAttribute('aria-activedescendant'), false);
  });
});

test('a press on the panel itself or on its empty row keeps the focus in the field and the list open', () => {
  run(() => {}, (view) => {
    type(view, 'zz-nothing');
    const panel = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
    const empty = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.empty"]')!;
    assert.ok(empty, 'no row matches, so the empty row is drawn');
    for (const target of [panel, empty]) {
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.dispatchEvent(press);
      view.fixture.detectChanges();
      assert.equal(press.defaultPrevented, true);
      assertSameNode(document.activeElement, view.input);
      assert.equal(view.input.getAttribute('aria-expanded'), 'true');
    }
  });
});

test('nothing is filtered or committed while a composition is open', () => {
  run(() => {}, (view) => {
    view.input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    type(view, 'eu');
    assert.deepEqual(view.host.searches, []);
    key(view, 'Enter', { isComposing: true });
    assert.deepEqual(view.host.changes, []);
    view.input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    view.fixture.detectChanges();
    assert.deepEqual(view.host.searches, ['eu']);
    assert.deepEqual(rows(), ['Europe West', 'Europe North']);
  });
});

test('each Enter guard holds alone: the open composition, isComposing and keyCode 229', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    assert.equal(activeRow(view.input), 'US East');
    view.input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, [], 'an open composition did not hold the Enter alone');
    view.input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    key(view, 'Enter', { isComposing: true });
    assert.deepEqual(view.host.changes, [], 'isComposing did not hold the Enter alone');
    key(view, 'Enter', { keyCode: 229 });
    assert.deepEqual(view.host.changes, [], 'the Safari Enter after compositionend chose the cursor row');
    key(view, 'Enter');
    assert.deepEqual(view.host.changes, ['us-east']);
  });
});

test('Enter on an open list with no cursor row is claimed, so the surrounding form does not submit', () => {
  run(() => {}, (view) => {
    type(view, 'zz');
    assert.equal(key(view, 'Enter').defaultPrevented, true);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
  });
});

test('a press on the field outside the input opens the list and keeps the focus in the input', () => {
  run(() => {}, (view) => {
    const target = (view.fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="combobox.caret"]')!;
    view.input.blur();
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    target.dispatchEvent(press);
    view.fixture.detectChanges();
    assert.equal(press.defaultPrevented, true);
    assertSameNode(document.activeElement, view.input);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
  });
});

test('a press on the caret or the status icon opens the list and keeps the focus in the input', () => {
  const fixture = TestBed.createComponent(ArenaCombobox);
  fixture.componentRef.setInput('label', 'Region');
  fixture.componentRef.setInput('options', [{ value: 'eu-west', label: 'Europe West' }]);
  fixture.componentRef.setInput('error', 'Pick one');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('[role="combobox"]') as HTMLInputElement;
  try {
    for (const part of ['combobox.caret', 'combobox.status-icon']) {
      const target = el.querySelector(`[data-arena-part="${part}"]`)!;
      assert.ok(target, part);
      input.blur();
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.dispatchEvent(press);
      fixture.detectChanges();
      assert.equal(press.defaultPrevented, true, part);
      assertSameNode(document.activeElement, input);
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
    }
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a dismissal that does not blur the input puts the label back and closes the list', () => {
  run(() => {}, (view) => {
    type(view, 'nor');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    view.fixture.detectChanges();
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.equal(view.input.value, 'Europe West');
    assert.deepEqual(view.host.changes, []);
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
    assert.deepEqual(view.host.searches, ['us', '']);
    type(view, 'eu');
    view.input.blur();
    view.fixture.detectChanges();
    assert.deepEqual(view.host.searches, ['us', '', 'eu', '']);
  });
});

@Component({
  standalone: true,
  imports: [ArenaCombobox],
  template: `
    <arena-combobox label="Region" name="region" filter="none" [options]="shown()" [value]="value()"
                    (valueChange)="value.set($event)" (search)="shown.set($event === '' ? all : [{ value: 'fr', label: 'France' }])" />
  `,
})
class RemoteHost {
  readonly all = [
    { value: 'eu-west', label: 'Europe West' },
    { value: 'us-east', label: 'US East' },
  ];
  readonly shown = signal<{ value: string; label: string }[]>(this.all);
  readonly value = signal('eu-west');
}

test('remote mode keeps the label of the chosen value after options stops holding it', () => {
  const fixture = TestBed.createComponent(RemoteHost);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('[role="combobox"]') as HTMLInputElement;
  const hidden = el.querySelector('input[type="hidden"]') as HTMLInputElement;
  const view = { fixture, input } as unknown as View;
  try {
    input.focus();
    assert.equal(input.value, 'Europe West');
    type(view, 'fr');
    assert.deepEqual(rows(), ['France']);
    key(view, 'Escape');
    assert.equal(input.value, 'Europe West', 'the field forgot the label when options left the value out');
    assert.equal(hidden.value, 'eu-west');
    type(view, 'fr');
    key(view, 'ArrowDown');
    key(view, 'Enter');
    assert.equal(fixture.componentInstance.value(), 'fr');
    fixture.componentInstance.shown.set([]);
    fixture.detectChanges();
    assert.equal(input.value, 'France', 'a chosen row lost its label once options went empty');
    fixture.componentInstance.value.set('mars');
    fixture.detectChanges();
    assert.equal(input.value, '');
    assert.equal(hidden.value, '', 'a value nothing holds was posted');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('the count is announced, an empty list says so, and loading draws the status line instead', () => {
  run(() => {}, (view) => {
    const status = (view.fixture.nativeElement as HTMLElement).querySelector('[role="status"]') as HTMLElement;
    assert.equal(status.textContent?.trim(), '');
    type(view, 'europe');
    assert.equal(status.textContent?.trim(), 'Options available: 2.');
    type(view, 'mars');
    assert.equal(overlay().querySelector('[data-arena-part="combobox.empty"]')?.textContent?.trim(), 'No results for "mars".');
  });
  run((host) => host.loading.set(true), (view) => {
    type(view, 'eu');
    assert.equal(overlay().querySelector('[role="listbox"]')?.getAttribute('aria-busy'), 'true');
    assert.ok(overlay().querySelector('[data-arena-part="combobox.status"]'));
    assertNoNode(overlay().querySelector('[data-arena-part="combobox.empty"]'));
  });
});

test('filter none draws the options as given, whatever was typed', () => {
  run((host) => host.filter.set('none'), (view) => {
    type(view, 'zz');
    assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East']);
  });
});

test('the chosen row carries the check and aria-selected; the cursor row is told apart', () => {
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    key(view, 'ArrowDown');
    const all = Array.from(overlay().querySelectorAll<HTMLElement>('[role="option"]'));
    assert.equal(all[0].getAttribute('aria-selected'), 'true');
    assert.ok(all[0].querySelector('[data-arena-part="combobox.option-mark"]'));
    assert.equal(all[1].getAttribute('aria-selected'), 'false');
    assert.equal(all[1].hasAttribute('data-arena-active'), true);
    assert.equal(all[0].hasAttribute('data-arena-active'), false);
    for (const row of all) assert.equal(row.getAttribute('tabindex'), '-1');
    assert.equal(overlay().querySelector('[data-arena-part="combobox.panel"]')?.getAttribute('data-arena-surface'), 'floating');
  });
});

test('the panel class grows it to fill the overlay pane, so it is as wide as the field', () => {
  run(() => {}, (view) => {
    key(view, 'ArrowDown');
    const panel = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
    const source = join(TAILWIND_COMPONENTS, 'forms/arena-combobox/ArenaCombobox.manifest.json');
    const slots = JSON.parse(readFileSync(source, 'utf8')).slots;
    assert.ok(panel.classList.contains(manifest.slots.panel));
    assert.ok(slots.panel.split(' ').includes('grow'));
    assert.equal(panel.style.flexGrow, '');
  });
});

test('a disabled field opens nothing', () => {
  run((host) => host.disabled.set(true), (view) => {
    assert.equal(view.input.disabled, true);
    key(view, 'ArrowDown');
    view.input.click();
    view.fixture.detectChanges();
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
  });
});

test('the native input and change reach an ancestor, and the outputs report the choice alone', () => {
  run(() => {}, (view) => {
    type(view, 'us');
    view.input.dispatchEvent(new Event('change', { bubbles: true }));
    key(view, 'Enter');
    assert.deepEqual(view.host.leaked, ['input', 'change']);
    assert.deepEqual(view.host.changes, ['us-east']);
  });
});

test('a press with a button other than the main one does not open the list or hold the focus', () => {
  run(() => {}, (view) => {
    const caret = (view.fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="combobox.caret"]')!;
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

test('a press on the loading status row keeps the focus in the field and the list open', () => {
  run((host) => host.loading.set(true), (view) => {
    key(view, 'ArrowDown');
    const status = overlay().querySelector<HTMLElement>('[data-arena-part="combobox.status"]')!;
    assert.ok(status, 'a loading list draws the status row');
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    status.dispatchEvent(press);
    view.fixture.detectChanges();
    assert.equal(press.defaultPrevented, true);
    assertSameNode(document.activeElement, view.input);
    assert.equal(view.input.getAttribute('aria-expanded'), 'true');
  });
});

test('a value changed from outside while the list is closed is what the field reads', () => {
  run(() => {}, (view) => {
    assert.equal(view.input.value, 'Europe West');
    view.host.value.set('us-east');
    view.fixture.detectChanges();
    assert.equal(view.input.value, 'US East');
  });
});

test('destroying the control alone takes its pane out of the document', () => {
  const view = render();
  try {
    key(view, 'ArrowDown');
    assert.equal(overlayPanes().length, 1);
    view.fixture.destroy();
    assert.equal(overlayPanes().length, 0, 'the destroyed control left its pane behind');
  } finally { disposeOverlays(); }
});

test('options that repeat a value draw every row and key without a warning', () => {
  const noise: string[] = [];
  const { error, warn } = console;
  console.error = console.warn = (...args: unknown[]) => { noise.push(args.map(String).join(' ')); };
  try {
    run((host) => host.options.push(host.options[0]), (view) => {
      key(view, 'ArrowDown');
      assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East', 'Europe West']);
    });
  } finally {
    console.error = error;
    console.warn = warn;
  }
  assert.deepEqual(noise, []);
});

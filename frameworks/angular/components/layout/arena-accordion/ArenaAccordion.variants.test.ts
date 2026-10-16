/* What the accordion settles from its members: the mode, the pair of members each mode reads, the
 * controlled value and the press that reports, the caret, and the guards. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaValueSet } from '../../../Api.generated';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaAccordion } from './ArenaAccordion';
import { ArenaAccordionItem } from '../arena-accordion-item/ArenaAccordionItem';

@Component({
  selector: 'accordion-variants-host',
  standalone: true,
  imports: [ArenaAccordion, ArenaAccordionItem],
  template: `
    <arena-accordion [multiple]="multiple" [collapsible]="collapsible" [value]="value()" [defaultValue]="defaultValue"
                     [values]="values" [defaultValues]="defaultValues"
                     (valueChange)="singles.push($event)" (valuesChange)="sets.push($event)">
      <arena-accordion-item value="ship" label="What ships">Ship body</arena-accordion-item>
      <arena-accordion-item value="roll" label="How it rolls out">Roll body</arena-accordion-item>
      <arena-accordion-item value="back" label="When it rolls back">Back body</arena-accordion-item>
    </arena-accordion>
  `,
})
class VariantsHost {
  multiple = false;
  collapsible = true;
  readonly value = signal<string | undefined>(undefined);
  defaultValue: string | undefined = undefined;
  values: readonly string[] | undefined = undefined;
  defaultValues: readonly string[] | undefined = undefined;
  singles: string[] = [];
  sets: ArenaValueSet[] = [];
}

@Component({
  selector: 'accordion-guard-host',
  standalone: true,
  imports: [ArenaAccordion, ArenaAccordionItem],
  template: `
    <arena-accordion [headingLevel]="level">
      <arena-accordion-item [value]="value" [label]="label">Body</arena-accordion-item>
    </arena-accordion>
  `,
})
class GuardHost {
  level: 'h3' | 'none' = 'h3';
  value = 'ship';
  label = 'What ships';
}

@Component({
  selector: 'accordion-empty-guard-host',
  standalone: true,
  imports: [ArenaAccordion],
  template: `<arena-accordion headingLevel="none" />`,
})
class EmptyGuardHost {}

@Component({
  selector: 'accordion-field-host',
  standalone: true,
  imports: [ArenaAccordion, ArenaAccordionItem],
  template: `
    <arena-accordion [value]="open()" (valueChange)="seen.push($event)">
      <arena-accordion-item value="ship" label="What ships">
        <select><option value="a">A</option><option value="b">B</option></select>
      </arena-accordion-item>
      <arena-accordion-item value="roll" label="How it rolls out">Roll body</arena-accordion-item>
    </arena-accordion>
  `,
})
class FieldHost {
  readonly open = signal('ship');
  seen: unknown[] = [];
}

function render({ value, ...patch }: Partial<Omit<VariantsHost, 'value'>> & { value?: string } = {}) {
  const fixture = TestBed.createComponent(VariantsHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.componentInstance.value.set(value);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const triggers = () => Array.from(root.querySelectorAll<HTMLButtonElement>('[data-arena-part="accordion.trigger"]'));
  const expanded = () => triggers().map((b) => b.getAttribute('aria-expanded'));
  const press = (i: number) => { triggers()[i]!.click(); fixture.detectChanges(); };
  return { fixture, root, triggers, expanded, press, host: fixture.componentInstance };
}

test('single mode opens the pressed section and closes the others, reporting the value', () => {
  const { fixture, expanded, press, host } = render({ defaultValue: 'ship' });
  try {
    press(1);
    assert.deepEqual(expanded(), ['false', 'true', 'false']);
    press(1);
    assert.deepEqual(expanded(), ['false', 'false', 'false'], 'collapsible is the default, so the open one closes');
    assert.deepEqual(host.singles, ['roll', '']);
  } finally {
    fixture.destroy();
  }
});

test('a single accordion that may not collapse ignores a press on its open header and reports nothing', () => {
  const { fixture, triggers, expanded, press, host } = render({ defaultValue: 'ship', collapsible: false });
  try {
    press(0);
    assert.deepEqual(expanded(), ['true', 'false', 'false']);
    press(2);
    assert.deepEqual(expanded(), ['false', 'false', 'true']);
    assert.deepEqual(triggers().map((b) => b.getAttribute('aria-disabled')), [null, null, 'true']);
    assert.deepEqual(host.singles, ['back']);
  } finally {
    fixture.destroy();
  }
});

test('multiple mode toggles each section alone and reports the whole set', () => {
  const { fixture, triggers, expanded, press, host } = render({ multiple: true, defaultValues: ['ship'], collapsible: false });
  try {
    press(2);
    press(0);
    assert.deepEqual(expanded(), ['false', 'false', 'true']);
    assert.deepEqual(host.sets.map((s) => s.values), [['ship', 'back'], ['back']]);
    assert.equal(triggers().some((b) => b.hasAttribute('aria-disabled')), false, 'collapsible means nothing with multiple');
  } finally {
    fixture.destroy();
  }
});

test('a controlled accordion draws what it is given, and a change of value fires nothing', () => {
  const { fixture, expanded, press, host } = render({ value: 'ship' });
  try {
    host.value.set('back');
    fixture.detectChanges();
    assert.deepEqual(expanded(), ['false', 'false', 'true']);
    assert.deepEqual(host.singles, [], 'a value the host moved is not a press');
    press(0);
    assert.deepEqual(host.singles, ['ship']);
  } finally {
    fixture.destroy();
  }
});

test('the empty string and a value no item has open nothing', () => {
  for (const value of ['', 'nowhere']) {
    const { fixture, expanded } = render({ value });
    try {
      assert.deepEqual(expanded(), ['false', 'false', 'false'], value);
    } finally {
      fixture.destroy();
    }
  }
});

test('the caret swaps glyph with the state', () => {
  const { fixture, root } = render({ defaultValue: 'roll' });
  try {
    const carets = Array.from(root.querySelectorAll('[data-arena-part="accordion.caret"]'));
    assert.deepEqual(carets.map((c) => c.classList.contains('ph-caret-down')), [false, true, false]);
    assert.ok(carets.every((c) => c.getAttribute('aria-hidden') === 'true'));
  } finally {
    fixture.destroy();
  }
});

test('the members of the other mode are ignored and warned about once', () => {
  forgetArenaWarnings();
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    const single = render({ values: ['back'] });
    const again = render({ values: ['ship'] });
    try {
      assert.deepEqual(single.expanded(), ['false', 'false', 'false']);
      assert.equal(said.length, 1);
      assert.match(said[0]!, /^\[arena\] ArenaAccordion: `values` and `defaultValues` are read only with `multiple`/);
    } finally {
      single.fixture.destroy();
      again.fixture.destroy();
    }
    forgetArenaWarnings();
    said.length = 0;
    const many = render({ multiple: true, value: 'ship' });
    try {
      assert.equal(said.length, 1);
      assert.match(said[0]!, /`value` and `defaultValue` are read only without `multiple`/);
    } finally {
      many.fixture.destroy();
    }
  } finally {
    globalThis.console.warn = saved;
    forgetArenaWarnings();
  }
});

test('an accordion with no item yet still throws on a heading level of none', () => {
  const fixture = TestBed.createComponent(EmptyGuardHost);
  try {
    assert.throws(() => fixture.detectChanges(), (error: Error) => /^ArenaAccordion: `headingLevel`/.test(error.message));
  } finally {
    fixture.destroy();
  }
});

test('a plain field in a panel raises a change that the accordion neither reports nor takes for a press', () => {
  const fixture = TestBed.createComponent(FieldHost);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const expanded = () => Array.from(root.querySelectorAll<HTMLElement>('[data-arena-part="accordion.trigger"]'))
      .map((b) => b.getAttribute('aria-expanded'));
    assert.deepEqual(expanded(), ['true', 'false']);
    const select = root.querySelector('select')!;
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.seen, [], 'a bubbled change is no value');
    assert.equal(fixture.componentInstance.open(), 'ship');
    assert.deepEqual(expanded(), ['true', 'false']);
  } finally {
    fixture.destroy();
  }
});

test('a blank label, a blank value and a heading level of none throw', () => {
  for (const [patch, message] of [
    [{ label: '  ' }, /^ArenaAccordionItem: `label`/],
    [{ value: ' ' }, /^ArenaAccordionItem: `value`/],
    [{ level: 'none' }, /^ArenaAccordion: `headingLevel`/],
  ] as const) {
    const fixture = TestBed.createComponent(GuardHost);
    Object.assign(fixture.componentInstance, patch);
    try {
      assert.throws(() => fixture.detectChanges(), (error: Error) => message.test(error.message));
    } finally {
      fixture.destroy();
    }
  }
});

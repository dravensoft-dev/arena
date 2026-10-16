import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaAccordion, type ArenaAccordionProps } from './ArenaAccordion.tsx';
import { ArenaAccordionItem } from '../arena-accordion-item/ArenaAccordionItem.tsx';

afterEach(cleanup);

const three = (props: ArenaAccordionProps = {}, inner?: React.ReactNode) => (
  <ArenaAccordion {...props}>
    <ArenaAccordionItem value="ship" label="What ships">{inner ?? <p>ship body</p>}</ArenaAccordionItem>
    <ArenaAccordionItem value="roll" label="How it rolls out"><p>roll body</p></ArenaAccordionItem>
    <ArenaAccordionItem value="back" label="When it rolls back"><p>back body</p></ArenaAccordionItem>
  </ArenaAccordion>
);

const own = (root: ParentNode) => [...root.querySelectorAll<HTMLButtonElement>('[data-arena-part="accordion.trigger"]')];
const expanded = (root: ParentNode) => own(root).map((b) => b.getAttribute('aria-expanded'));
const press = (button: HTMLElement) => act(() => { button.click(); });
const key = (target: HTMLElement, name: string) => {
  let event!: KeyboardEvent;
  act(() => {
    event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
  });
  return event;
};

test('single mode opens the pressed section and closes the others, reporting the value', () => {
  const seen: string[] = [];
  const root = mount(three({ defaultValue: 'ship', onValueChange: (v) => seen.push(v) }));
  press(own(root)[1]!);
  assert.deepEqual(expanded(root), ['false', 'true', 'false']);
  press(own(root)[1]!);
  assert.deepEqual(expanded(root), ['false', 'false', 'false'], 'collapsible is the default, so the open one closes');
  assert.deepEqual(seen, ['roll', '']);
});

test('a single accordion that may not collapse ignores a press on its open header and reports nothing', () => {
  const seen: string[] = [];
  const root = mount(three({ defaultValue: 'ship', collapsible: false, onValueChange: (v) => seen.push(v) }));
  press(own(root)[0]!);
  assert.deepEqual(expanded(root), ['true', 'false', 'false']);
  press(own(root)[2]!);
  assert.deepEqual(expanded(root), ['false', 'false', 'true']);
  assert.equal(own(root)[2]!.getAttribute('aria-disabled'), 'true');
  assert.deepEqual(seen, ['back']);
});

test('multiple mode toggles each section alone and reports the whole set', () => {
  const seen: (readonly string[])[] = [];
  const root = mount(three({ multiple: true, defaultValues: ['ship'], onValuesChange: (set) => seen.push(set.values) }));
  press(own(root)[2]!);
  press(own(root)[0]!);
  assert.deepEqual(expanded(root), ['false', 'false', 'true']);
  assert.deepEqual(seen, [['ship', 'back'], ['back']]);
});

test('a controlled accordion draws what it is given, and a change of value fires nothing', () => {
  const seen: string[] = [];
  function Host() {
    const [value, setValue] = useState('ship');
    return (
      <>
        <button type="button" id="outside" onClick={() => setValue('back')}>Open the last</button>
        {three({ value, onValueChange: (v) => { seen.push(v); setValue(v); } })}
      </>
    );
  }
  const root = mount(<Host />);
  press(root.querySelector<HTMLElement>('#outside')!);
  assert.deepEqual(expanded(root), ['false', 'false', 'true']);
  assert.deepEqual(seen, [], 'a value the host moved is not a press');
  press(own(root)[0]!);
  assert.deepEqual(seen, ['ship']);
  assert.deepEqual(expanded(root), ['true', 'false', 'false']);
});

test('down, up, home and end move focus between the headers, wrapping, and toggle nothing', () => {
  const root = mount(three({ defaultValue: 'roll' }));
  const [first, second, third] = own(root);
  first!.focus();
  assert.equal(key(first!, 'ArrowDown').defaultPrevented, true);
  assert.equal(document.activeElement, second);
  key(second!, 'End');
  assert.equal(document.activeElement, third);
  key(third!, 'ArrowDown');
  assert.equal(document.activeElement, first, 'down from the last wraps to the first');
  key(first!, 'ArrowUp');
  assert.equal(document.activeElement, third, 'up from the first wraps to the last');
  key(third!, 'Home');
  assert.equal(document.activeElement, first);
  assert.deepEqual(expanded(root), ['false', 'true', 'false']);
  assert.ok(own(root).every((b) => !b.hasAttribute('tabindex')), 'every header stays in the Tab sequence: there is no roving stop');
});

test('a field in a panel and a nested accordion keep their own keys', () => {
  const nested = (
    <>
      <input id="field" defaultValue="eu-west" />
      <ArenaAccordion defaultValue="inner-a">
        <ArenaAccordionItem value="inner-a" label="Inner A">a</ArenaAccordionItem>
        <ArenaAccordionItem value="inner-b" label="Inner B">b</ArenaAccordionItem>
      </ArenaAccordion>
    </>
  );
  const root = mount(three({ defaultValue: 'ship' }, nested));
  const field = root.querySelector<HTMLInputElement>('#field')!;
  field.focus();
  assert.equal(key(field, 'Home').defaultPrevented, false, 'Home in a field moves the caret, not the focus');
  assert.equal(document.activeElement, field);
  const outer = own(root).filter((b) => !b.textContent?.startsWith('Inner'));
  const inner = own(root).filter((b) => b.textContent?.startsWith('Inner'));
  inner[0]!.focus();
  key(inner[0]!, 'ArrowDown');
  assert.equal(document.activeElement, inner[1], 'the nested accordion moves between its own headers');
  key(inner[1]!, 'ArrowDown');
  assert.equal(document.activeElement, inner[0], 'and wraps inside itself, never reaching the outer headers');
  assert.equal(outer.length, 3);
});

test('a fragment around the items is not a list of items, so pass the items or an array of them', () => {
  const root = mount(
    <ArenaAccordion defaultValue="ship">
      {[<ArenaAccordionItem key="s" value="ship" label="What ships">s</ArenaAccordionItem>,
        <ArenaAccordionItem key="r" value="roll" label="How it rolls out">r</ArenaAccordionItem>]}
    </ArenaAccordion>,
  );
  assert.deepEqual(expanded(root), ['true', 'false'], 'an array is read item by item');
  cleanup();
  const wrapped = mount(
    <ArenaAccordion defaultValue="ship">
      <>
        <ArenaAccordionItem value="ship" label="What ships">s</ArenaAccordionItem>
      </>
    </ArenaAccordion>,
  );
  assert.deepEqual(expanded(wrapped), ['false'], 'a fragment hides its items from the accordion, which then opens nothing');
});

test('the members of the other mode are ignored and warned about once', () => {
  forgetArenaWarnings();
  const warn = console.warn;
  const seen: string[] = [];
  console.warn = (message: string) => { seen.push(message); };
  try {
    const root = mount(<>{three({ values: ['back'] })}{three({ values: ['ship'] })}</>);
    assert.deepEqual(expanded(root).slice(0, 3), ['false', 'false', 'false']);
    assert.equal(seen.length, 1);
    assert.match(seen[0]!, /^\[arena\] ArenaAccordion: `values` and `defaultValues` are read only with `multiple`/);
    forgetArenaWarnings();
    seen.length = 0;
    mount(three({ multiple: true, value: 'ship' }));
    assert.equal(seen.length, 1);
    assert.match(seen[0]!, /`value` and `defaultValue` are read only without `multiple`/);
  } finally {
    console.warn = warn;
    forgetArenaWarnings();
  }
});

test('ArenaAccordion meets the accordion pattern on every header', () => {
  const root = mount(three({ defaultValue: 'roll', collapsible: false }));
  const triggers = own(root);
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'layout', 'arena-accordion', 'ArenaAccordion.behaviour.json'),
    subjects: {
      default: triggers[1]!,
      'roles.heading': [...root.querySelectorAll<HTMLElement>('[data-arena-part="accordion.heading"]')],
      'roles.controls': triggers,
    },
    behavioural: {
      'keyboard.Enter': true,
      'keyboard.Space': true,
      'states.disabled': triggers[1]!.getAttribute('aria-disabled') === 'true',
    },
  });
  for (const heading of root.querySelectorAll('[data-arena-part="accordion.heading"]')) {
    assert.equal(heading.childElementCount, 1, 'the button is the heading\'s only content');
  }
  for (const panel of root.querySelectorAll<HTMLElement>('[role="group"]')) {
    const name = document.getElementById(panel.getAttribute('aria-labelledby') ?? '');
    assert.ok(name?.matches('[data-arena-part="accordion.trigger"]'), 'each panel is a group named by its own header');
  }
});

test('ArenaAccordionItem binds none because the accordion owns the pattern', () => {
  const root = mount(three({ defaultValue: 'ship' }));
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'layout', 'arena-accordion-item', 'ArenaAccordionItem.behaviour.json'),
    subjects: { default: root.querySelector<HTMLElement>('[data-arena-part="accordion.item"]')! },
  });
});

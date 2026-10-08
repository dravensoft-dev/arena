/* This is the one component in batch 3 that authors its own roving focus, so it is the one whose
 * keyboard is asserted for real rather than argued from the platform. ArrowLeft and ArrowRight go
 * through @angular/cdk/a11y's FocusKeyManager, which switches on the deprecated event.keyCode --
 * a browser fills it in, happy-dom leaves it 0 -- so press() sets it or every key is ignored and
 * every focus assertion fails against a <body> too large to diff (see NodeAssert.ts).
 * focus.roving is decided the same way: exactly one tab carries tabindex="0" and it is the
 * selected one. ArenaTab binds `none` and is asserted here too, because the two are one render. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaTab } from '../arena-tab/ArenaTab';
import { ArenaTabs } from './ArenaTabs';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-tabs/ArenaTabs.behaviour.json');
const TAB_BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-tab/ArenaTab.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaTabs, ArenaTab],
  template: `
    <arena-tabs [value]="value" [defaultValue]="defaultValue" (change)="chosen.push($event)">
      <arena-tab value="overview" label="Overview">Overview body</arena-tab>
      <arena-tab value="deployments" label="Deployments">Deployments body</arena-tab>
      <arena-tab value="settings" label="Settings">Settings body</arena-tab>
    </arena-tabs>
  `,
})
class TabsHost {
  value: string | undefined = 'deployments';
  defaultValue: string | undefined = undefined;
  chosen: string[] = [];
}

function render(patch: Partial<TabsHost> = {}) {
  const fixture = TestBed.createComponent(TabsHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const read = () => ({
    list: host.querySelector('[role="tablist"]') as HTMLElement,
    tabs: Array.from(host.querySelectorAll('[role="tab"]')) as HTMLButtonElement[],
    panels: Array.from(host.querySelectorAll('[role="tabpanel"]')) as HTMLElement[],
  });
  return { fixture, host, read };
}

const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
};

function press(fixture: ReturnType<typeof render>['fixture'], list: HTMLElement, key: string) {
  list.dispatchEvent(new KeyboardEvent('keydown', {
    key, keyCode: KEY_CODES[key], bubbles: true, cancelable: true,
  }));
  fixture.detectChanges();
}

test('the triad is rendered, and the panels sit outside the tablist because a tabpanel may not sit in one', () => {
  const { fixture, read } = render();
  try {
    const { list, tabs, panels } = read();
    assert.ok(list, 'no tablist rendered');
    assert.equal(tabs.length, 3);
    assert.equal(panels.length, 3, 'every panel mounts -- an aria-controls pointing at nothing is worse than absent');
    for (const panel of panels) {
      assert.equal(list.contains(panel), false, 'a tabpanel inside a tablist is invalid');
    }
  } finally {
    fixture.destroy();
  }
});

test('each tab controls its own panel, and each panel is labelled by its own tab', () => {
  const { fixture, read } = render();
  try {
    const { tabs, panels } = read();
    for (let i = 0; i < tabs.length; i++) {
      const controls = tabs[i].getAttribute('aria-controls');
      assert.equal(controls, panels[i].getAttribute('id'),
        `tab ${i} does not control panel ${i}`);
      assert.equal(panels[i].getAttribute('aria-labelledby'), tabs[i].getAttribute('id'),
        `panel ${i} is not labelled by tab ${i}`);
    }
    const ids = new Set([...tabs, ...panels].map((el) => el.getAttribute('id')));
    assert.equal(ids.size, 6, 'every id in the triad must be distinct, or two references collapse onto one element');
  } finally {
    fixture.destroy();
  }
});

test('two ArenaTabs on one page generate distinct ids, so the second does not steal the first\'s panel', () => {
  const first = render();
  const second = render();
  try {
    const a = first.read().tabs.map((t) => t.getAttribute('id'));
    const b = second.read().tabs.map((t) => t.getAttribute('id'));
    assert.equal(a.some((id) => b.includes(id)), false);
  } finally {
    first.fixture.destroy();
    second.fixture.destroy();
  }
});

test('aria-selected is true on the active tab and false on the rest, present on all three', () => {
  const { fixture, read } = render();
  try {
    assert.deepEqual(
      read().tabs.map((t) => t.getAttribute('aria-selected')),
      ['false', 'true', 'false'],
    );
  } finally {
    fixture.destroy();
  }
});

test('only the active panel is shown, and the inactive ones are hidden rather than unmounted', () => {
  const { fixture, read } = render();
  try {
    const { panels } = read();
    assert.equal(panels[1].getAttribute('data-arena-selected'), '');
    assert.equal(panels[0].hasAttribute('data-arena-selected'), false);
    assert.equal(panels[2].hasAttribute('data-arena-selected'), false);
    assert.equal(panels[0].textContent?.trim(), 'Overview body',
      'an inactive panel keeps its content -- its side effects have already run, which the contract states');
  } finally {
    fixture.destroy();
  }
});

test('exactly one tab is in the page Tab sequence, and it is the selected one', () => {
  const { fixture, read } = render();
  try {
    const { tabs } = read();
    const stops = tabs.filter((t) => t.getAttribute('tabindex') === '0');
    assert.equal(stops.length, 1, 'a tablist with two tab stops is two ways into one control');
    assertSameNode(stops[0], tabs[1], 'the tab stop is not the selected tab');
    assert.deepEqual(tabs.map((t) => t.getAttribute('tabindex')), ['-1', '0', '-1']);
  } finally {
    fixture.destroy();
  }
});

test('ArrowRight walks the tablist and wraps, moving focus and the selection together', () => {
  const { fixture, read } = render({ value: undefined });
  try {
    const { list } = read();
    assert.equal(read().tabs[0].getAttribute('tabindex'), '0', 'sanity: the first tab starts as the stop');

    press(fixture, list, 'ArrowRight');
    assertSameNode(document.activeElement, read().tabs[1], 'ArrowRight did not focus the next tab');
    assert.equal(read().tabs[1].getAttribute('tabindex'), '0', 'the stop must follow the focus');
    assert.deepEqual(fixture.componentInstance.chosen, ['deployments']);

    press(fixture, list, 'ArrowRight');
    assertSameNode(document.activeElement, read().tabs[2]);

    press(fixture, list, 'ArrowRight');
    assertSameNode(document.activeElement, read().tabs[0], 'ArrowRight at the end must wrap to the first');
    assert.deepEqual(fixture.componentInstance.chosen, ['deployments', 'settings', 'overview']);
  } finally {
    fixture.destroy();
  }
});

test('ArrowLeft walks the other way and wraps to the last', () => {
  const { fixture, read } = render({ value: undefined });
  try {
    const { list } = read();
    press(fixture, list, 'ArrowLeft');
    assertSameNode(document.activeElement, read().tabs[2], 'ArrowLeft at the start must wrap to the last');

    press(fixture, list, 'ArrowLeft');
    assertSameNode(document.activeElement, read().tabs[1]);
    assert.deepEqual(fixture.componentInstance.chosen, ['settings', 'deployments']);
  } finally {
    fixture.destroy();
  }
});

test('the vertical arrows do nothing, because this tablist is horizontal', () => {
  const { fixture, read } = render({ value: undefined });
  try {
    const { list } = read();
    press(fixture, list, 'ArrowDown');
    press(fixture, list, 'ArrowUp');
    assert.deepEqual(fixture.componentInstance.chosen, [],
      'a horizontal tablist answering Up/Down would fight a vertical list nested near it');
    assert.equal(read().tabs[0].getAttribute('tabindex'), '0');
  } finally {
    fixture.destroy();
  }
});

test('clicking a tab selects it, and clicking the selected one reports nothing', () => {
  const { fixture, read } = render({ value: undefined });
  try {
    read().tabs[2].click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, ['settings']);

    read().tabs[2].click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, ['settings'],
      'change fires when a DIFFERENT tab is chosen, which is what the contract says');
  } finally {
    fixture.destroy();
  }
});

test('with neither value nor defaultValue the first tab is selected, so a panel is always shown', () => {
  const { fixture, read } = render({ value: undefined });
  try {
    assert.equal(read().tabs[0].getAttribute('aria-selected'), 'true');
    assert.equal(read().panels[0].getAttribute('data-arena-selected'), '');
  } finally {
    fixture.destroy();
  }
});

test('defaultValue governs an uncontrolled strip, and the strip then remembers its own choice', () => {
  const { fixture, read } = render({ value: undefined, defaultValue: 'settings' });
  try {
    assert.equal(read().tabs[2].getAttribute('aria-selected'), 'true');
    read().tabs[0].click();
    fixture.detectChanges();
    assert.equal(read().tabs[0].getAttribute('aria-selected'), 'true');
  } finally {
    fixture.destroy();
  }
});

test('the host leaves layout, so the tablist and the panels stack in the consumer\'s own flow', () => {
  const { fixture, host } = render();
  try {
    const inner = host.querySelector('arena-tabs') as HTMLElement;
    assert.match(inner.getAttribute('style') ?? '', /display:\s*contents/,
      'this component renders two block children and must add no box of its own');
    assert.equal(inner.getAttribute('class'), null);
  } finally {
    fixture.destroy();
  }
});

test('arena-tabs meets the tabs pattern', () => {
  const { fixture, host, read } = render();
  try {
    const { list, tabs, panels } = read();
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: {
        default: list,
        'roles.tablist': list,
        'roles.tab': tabs[1],
        'roles.tabpanel': panels[1],
        'roles.controls': tabs,
        'states.selected': tabs,
      },
      behavioural: {
        'focus.roving': true,
        'keyboard.ArrowLeft': true,
        'keyboard.ArrowRight': true,
      },
    });
  } finally {
    fixture.destroy();
  }
});

test('arena-tab binds none, and the panel it draws carries no affordance of its own', () => {
  const { fixture, host, read } = render();
  try {
    const { list, panels } = read();
    assertPattern({ root: host, bindingPath: TAB_BINDING, subjects: { default: panels[1] } });

    for (const panel of panels) {
      assertNoNode(panel.querySelector('[role="tab"]'),
        'the tab button is the parent\'s to draw -- a tab inside a panel is the compound inverted');
      assert.equal(panel.hasAttribute('aria-selected'), false,
        'aria-selected belongs on the tab, not on the panel it controls');
    }
    assertNoNode(list.querySelector('[role="tabpanel"]'),
      'binding none does not excuse the panel from sitting outside the tablist');
  } finally {
    fixture.destroy();
  }
});

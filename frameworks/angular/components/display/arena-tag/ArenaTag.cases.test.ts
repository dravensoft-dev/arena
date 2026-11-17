import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaTag } from './ArenaTag';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { commandButtonVerdict } from '../../../test/StateVerdicts';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-tag/ArenaTag.behaviour.json');

function assertKeysUnintercepted(el: Element): void {
  for (const key of ['Enter', ' ']) {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    assert.equal(ev.defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the button's own activation`);
  }
}

function renderTag(removable: boolean, disabled = false) {
  const fixture = TestBed.createComponent(ArenaTag);
  fixture.componentRef.setInput('removable', removable);
  fixture.componentRef.setInput('disabled', disabled);
  fixture.detectChanges();
  return fixture;
}

test('arena-tag meets both of its declared cases', () => {
  const fixtures: ReturnType<typeof renderTag>[] = [];
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {

        plain: () => {
          const fixture = renderTag(false);
          fixtures.push(fixture);
          return { root: fixture.nativeElement as Element };
        },
        removable: () => {
          const fixture = renderTag(true);
          fixtures.push(fixture);
          const host = fixture.nativeElement as Element;
          const button = host.querySelector('button') as HTMLElement;
          assertKeysUnintercepted(button);
          assert.equal(button.hasAttribute('aria-disabled'), false,
            'an available action must not announce itself as disabled');
          let removed = false;
          fixture.componentInstance.remove.subscribe(() => { removed = true; });
          button.click();
          fixture.detectChanges();
          assert.equal(removed, true, 'sanity: a real click must reach the remove output');

          const off = renderTag(true, true);
          fixtures.push(off);
          const offButton = (off.nativeElement as Element).querySelector('button') as HTMLElement;
          assert.equal(offButton.getAttribute('aria-disabled'), 'true',
            'a disabled remove must say so through aria-disabled, not by vanishing from the tab order');
          assert.equal(offButton.hasAttribute('disabled'), false,
            'the native attribute would take the button out of the tab order, which is what aria-disabled exists to avoid');
          let blocked = false;
          off.componentInstance.remove.subscribe(() => { blocked = true; });
          offButton.click();
          off.detectChanges();
          assert.equal(blocked, false, 'a disabled remove still reported through the remove output');

          return {
            root: host,
            subjects: { default: button },
            behavioural: {
              'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true,
              'states.pressed': commandButtonVerdict(button),
            },
          };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});

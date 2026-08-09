/* A presentational element projected as the trigger is the one misuse nothing reported: the
 * listeners land on it, it takes no focus and answers no key, so the menu opens on a pointer and
 * on nothing else. The component already reads a focusability-aware selector and falls back to
 * the first element when it misses, and that fallback is exactly the case worth saying out loud. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaMenu } from './ArenaMenu';
import type { ArenaMenuItem } from '../../../Api.generated';

const ITEMS: readonly ArenaMenuItem[] = [{ label: 'Rename' }];

@Component({
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items"><span trigger>More</span></arena-menu>`,
})
class PresentationalTrigger {
  protected readonly items = ITEMS;
}

@Component({
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items"><button trigger type="button">More</button></arena-menu>`,
})
class RealControl {
  protected readonly items = ITEMS;
}

@Component({
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items"><span trigger tabindex="0" role="button">More</span></arena-menu>`,
})
class OwnControl {
  protected readonly items = ITEMS;
}

async function warnings(host: new () => unknown): Promise<string[]> {
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    const fixture = TestBed.createComponent(host);
    try {
      fixture.detectChanges();
      await fixture.whenStable();
    } finally {
      fixture.destroy();
    }
  } finally {
    globalThis.console.warn = saved;
  }
  return said;
}

afterEach(() => { forgetArenaWarnings(); });

test('a trigger that takes no focus is reported, naming the element it found', () => warnings(PresentationalTrigger)
  .then((said) => {
    assert.equal(said.length, 1, 'the silent case stayed silent');
    assert.match(said[0] ?? '', /<span>/);
    assert.match(said[0] ?? '', /keyboard cannot reach it/);
  }));

test('a real button says nothing', () => warnings(RealControl)
  .then((said) => { assert.deepEqual(said, []); }));

test("a consumer's own element carrying a role and a tabindex says nothing either", () => warnings(OwnControl)
  .then((said) => { assert.deepEqual(said, []); }));

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaAvatar } from './ArenaAvatar';
import { ARENA_DEFAULT_LOCALE } from '../../../ArenaLocale';

@Component({
  standalone: true,
  imports: [ArenaAvatar],
  template: `
    <arena-avatar id="odd" name="Ada Lovelace" [status]="unknown" />
    <arena-avatar id="busy" name="Ada Lovelace" status="busy" />
    <arena-avatar id="none" name="Ada Lovelace" />`,
})
class Host {
  protected readonly unknown = 'away-ish' as never;
}

function dot(id: string): Element | null {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector(`#${id} [data-arena-part="avatar.status"]`);
}

test('an avatar with an unknown status draws offline', () => {
  const odd = dot('odd')!;
  assert.equal(odd.getAttribute('data-arena-status'), 'offline');
  assert.equal(odd.getAttribute('aria-label'), ARENA_DEFAULT_LOCALE.avatarOffline);
});

test('a known status is drawn as itself and no status draws no dot', () => {
  assert.equal(dot('busy')!.getAttribute('data-arena-status'), 'busy');
  assert.equal(dot('none'), null);
});

/* Angular takes a vocabulary class on the host, and nothing is added to bind it. Both host shapes
 * keep it: a display: contents host, whose drawn element is a child the class scopes over, and a
 * host that is the root slot, where the [class] host binding merges with it rather than replacing
 * it. Whether the cascade then reaches the part is check:proximity's to measure. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';
import { ArenaTooltip } from '../components/feedback/arena-tooltip/ArenaTooltip';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';

@Component({
  standalone: true,
  imports: [ArenaButton, ArenaTooltip, ArenaMenu],
  template: `
    <arena-button class="arena-fill">Save</arena-button>
    <arena-tooltip class="arena-fill" label="Copy"><arena-button>Copy</arena-button></arena-tooltip>
    <arena-menu class="arena-fill" [items]="[]"><arena-button trigger>Open</arena-button></arena-menu>
  `,
})
class Hosts {}

test('a display: contents host keeps the class, and the drawn button is its child', () => {
  const fixture = TestBed.createComponent(Hosts);
  try {
    fixture.detectChanges();
    const host = (fixture.nativeElement as Element).querySelector('arena-button') as HTMLElement;
    assert.ok(host.classList.contains('arena-fill'));
    assert.equal(host.style.display, 'contents');
    assert.equal(host.firstElementChild?.getAttribute('data-arena-part'), 'button');
  } finally {
    fixture.destroy();
  }
});

test('a host that is the root slot keeps the class beside the recipe classes its binding writes', () => {
  const fixture = TestBed.createComponent(Hosts);
  try {
    fixture.detectChanges();
    for (const tag of ['arena-tooltip', 'arena-menu']) {
      const host = (fixture.nativeElement as Element).querySelector(tag) as HTMLElement;
      assert.ok(host.classList.contains('arena-fill'), `${tag} lost the adopter's class`);
      assert.ok(host.classList.contains(`${tag}__root`), `${tag} lost its own recipe class`);
    }
  } finally {
    fixture.destroy();
  }
});

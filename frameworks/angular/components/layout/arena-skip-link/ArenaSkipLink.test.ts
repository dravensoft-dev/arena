/* Three of the link's four details are assertable without a browser: the element, where it
 * points and the guard on its words. The fourth, that it is the first focusable thing in the
 * document, is the consumer's placement and no component suite can see it, so the prompt carries
 * it as the one instruction the component cannot follow for itself. Visibility is CSS and is
 * checked in a real browser instead, which is why nothing here reads a class. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSkipLink } from './ArenaSkipLink';
import { ARENA_MAIN_ID } from '../arena-main/ArenaMain';

@Component({
  standalone: true,
  imports: [ArenaSkipLink],
  template: '<arena-skip-link [label]="label" />',
})
class SkipHost { label = 'Skip to content'; }

function render(label?: string) {
  const fixture = TestBed.createComponent(SkipHost);
  if (label !== undefined) fixture.componentInstance.label = label;
  fixture.detectChanges();
  return fixture;
}

test('it is a real anchor, so its role and its keyboard are the platform\'s', () => {
  const fixture = render();
  try {
    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    assert.ok(anchor, 'a skip link that is not an anchor answers no key the platform gives it');
    assert.equal(anchor.getAttribute('role'), null);
    assert.equal((anchor.textContent ?? '').trim(), 'Skip to content');
  } finally { fixture.destroy(); }
});

test('it points at the landmark by the constant both sides read', () => {
  const fixture = render();
  try {
    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    assert.equal(anchor.getAttribute('href'), `#${ARENA_MAIN_ID}`,
      'the id is written on the landmark from the same constant, so nothing is coordinated at the call site');
  } finally { fixture.destroy(); }
});

test('a label of nothing but spaces is refused, the way every name only a human can supply is', () => {
  const fixture = TestBed.createComponent(SkipHost);
  try {
    fixture.componentInstance.label = '   ';
    assert.throws(() => fixture.detectChanges(), /`label` is required/,
      'a link that appears with no words is a link nobody can act on, and a blank string satisfies '
      + 'a falsiness test while naming nothing');
  } finally { fixture.destroy(); }
});

/* A card's body is a flex column that keeps stretching its block children. The button hosts are
 * display: contents, so the element in the body is the button itself. The host carries the class,
 * and the vocabulary scopes over the button it draws. Layout itself is Chromium's to prove. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCard } from './ArenaCard';
import { ArenaButton } from '../../forms/arena-button/ArenaButton';

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaButton],
  template: '<arena-card><arena-button>Save</arena-button><arena-button class="arena-fill">Continue</arena-button></arena-card>',
})
class CardHost {}

test('a button in a card body takes its own width, and one with arena-fill takes the body', () => {
  const fixture = TestBed.createComponent(CardHost);
  try {
    fixture.detectChanges();
    const [own, fill] = [...(fixture.nativeElement as Element).querySelectorAll('.arena-card__body arena-button')];
    assert.ok(own && !own.classList.contains('arena-fill'));
    assert.ok(fill?.classList.contains('arena-fill'));
    for (const button of (fixture.nativeElement as Element).querySelectorAll('.arena-card__body button'))
      assert.ok(![...button.classList].some((name) => name.startsWith('arena-button__root--full-')));
  } finally {
    fixture.destroy();
  }
});

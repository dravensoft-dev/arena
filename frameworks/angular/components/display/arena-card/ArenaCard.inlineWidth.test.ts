/* The Angular half of the React case: the button hosts are display: contents, so the element in
 * the card's body is the button itself, and it carries the branch its full member chose. */

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
  template: '<arena-card><arena-button>Save</arena-button><arena-button full>Continue</arena-button></arena-card>',
})
class CardHost {}

test('a button without full in a card body takes its own width, and one with full takes the body', () => {
  const fixture = TestBed.createComponent(CardHost);
  try {
    fixture.detectChanges();
    const [own, full] = [...(fixture.nativeElement as Element).querySelectorAll('.arena-card__body button')];
    assert.ok(own?.classList.contains('arena-button__root--full-false'));
    assert.ok(full?.classList.contains('arena-button__root--full-true'));
  } finally {
    fixture.destroy();
  }
});

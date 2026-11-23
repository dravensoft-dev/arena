/* The avatar's markup: the image it draws, and the kind it carries on its box. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaAvatar } from './ArenaAvatar';

test('an avatar image draws at the size its box is given and reserves nothing of its own', () => {
  const fixture = TestBed.createComponent(ArenaAvatar);
  try {
    fixture.componentRef.setInput('name', 'Ada Lovelace');
    fixture.componentRef.setInput('src', '/ada.png');
    fixture.detectChanges();

    const image = (fixture.nativeElement as Element).querySelector('img');
    assert.ok(image);
    assert.equal(image.getAttribute('width'), null);
    assert.equal(image.getAttribute('height'), null);
    assert.equal(image.getAttribute('decoding'), 'async');
    assert.equal(image.getAttribute('loading'), null,
      'deliberately absent: an avatar above the fold should not be deferred and the component '
      + 'cannot know where it sits, so exposing the choice would be a capability and would go '
      + 'through the audit protocol rather than through a defect');
  } finally {
    fixture.destroy();
  }
});

test('an avatar of kind team carries it on its box, and writes no size channel unless a row hands it the face', () => {
  const fixture = TestBed.createComponent(ArenaAvatar);
  try {
    fixture.componentRef.setInput('name', 'Platform');
    fixture.componentRef.setInput('kind', 'team');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    assert.ok(root.querySelector('[data-arena-kind="team"]'), 'no element carries the kind');
    assert.equal(root.style.getPropertyValue('--arena-size-avatar'), '');
  } finally {
    fixture.destroy();
  }
});

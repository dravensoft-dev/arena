import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaIconButton } from './ArenaIconButton';

@Component({
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-plus" label="Add" />`,
})
class Plain {}

@Component({
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-plus" label="Add" [pressed]="true" />`,
})
class On {}

@Component({
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-plus" label="Add" [pressed]="false" />`,
})
class Off {}

function control(type: typeof Plain | typeof On | typeof Off): Element {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('button');
}

test('an icon button with no pressed state renders no aria-pressed and no data-arena-pressed', () => {
  const button = control(Plain);
  assert.equal(button.hasAttribute('aria-pressed'), false);
  assert.equal(button.hasAttribute('data-arena-pressed'), false);
});

test('a pressed icon button says so', () => {
  const button = control(On);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.hasAttribute('data-arena-pressed'), true);
});

test('an explicitly unpressed icon button says false and draws no pressed state', () => {
  const button = control(Off);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.hasAttribute('data-arena-pressed'), false);
});

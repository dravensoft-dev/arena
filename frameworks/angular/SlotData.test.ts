import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSlotAttributes } from './SlotData';

@Component({
  standalone: true,
  imports: [ArenaSlotAttributes],
  template: `<div [arenaSlotData]="record()"></div>`,
})
class Host {
  readonly record = signal<Readonly<Record<string, string>>>({ a: '1' });
}

test('a record is rendered as attributes and the next record removes the ones it lacks', () => {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const div = fixture.nativeElement.querySelector('div') as HTMLElement;
  assert.equal(div.getAttribute('a'), '1');

  fixture.componentInstance.record.set({ b: '' });
  fixture.detectChanges();
  assert.equal(div.getAttribute('b'), '');
  assert.equal(div.hasAttribute('a'), false);
});

test('an empty record leaves no attribute behind', () => {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  fixture.componentInstance.record.set({});
  fixture.detectChanges();
  const div = fixture.nativeElement.querySelector('div') as HTMLElement;
  assert.equal(div.attributes.length, 0);
});
